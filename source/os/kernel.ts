///<reference path="../globals.ts" />
///<reference path="queue.ts" />
///<reference path="../host/control.ts"/>
///<reference path="./scheduler.ts"/>

/* ------------
     Kernel.ts

     Requires globals.ts
              queue.ts

     Routines for the Operating System, NOT the host.

     This code references page numbers in the text book:
     Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
     ------------ */

namespace TSOS {
  export class Kernel {
    //
    // OS Startup and Shutdown Routines
    //
    public krnBootstrap() {
      // Page 8. {
      Control.hostLog('bootstrap', 'host'); // Use hostLog because we ALWAYS want this, even if _Trace is off.

      _MemoryGuardian = new MemoryGuardian(_Memory);
      // Initialize our global queues.
      _KernelInterruptQueue = new Queue(); // A (currently) non-priority queue for interrupt requests (IRQs).
      _KernelBuffers = new Array(); // Buffers... for the kernel.
      _KernelInputQueue = new Queue(); // Where device input lands before being processed out somewhere.

      // Initialize the console.
      _Console = new Console(); // The command line interface / console I/O device.
      _Console.init();

      // Initialize standard input and output to the _Console.
      _StdIn = _Console;
      _StdOut = _Console;

      // Load the Keyboard Device Driver
      this.krnTrace('Loading the keyboard device driver.');
      _krnKeyboardDriver = new DeviceDriverKeyboard(); // Construct it.
      _krnKeyboardDriver.driverEntry(); // Call the driverEntry() initialization routine.
      this.krnTrace(_krnKeyboardDriver.status);

      _krnFileSystemDriver = new FileSystemDeviceDriver(_Disk);
      _krnFileSystemDriver.driverEntry();
      this.krnTrace(_krnFileSystemDriver.status);

      // Enable the OS Interrupts.  (Not the CPU clock interrupt, as that is done in the hardware sim.)
      this.krnTrace('Enabling the interrupts.');
      this.krnEnableInterrupts();

      // Launch the shell.
      this.krnTrace('Creating and Launching the shell.');
      _OsShell = new Shell();

      _Scheduler = new Scheduler();

      // hook up the memory
      this.krnDisplayMemory();
      this.krnDisplayCPU();

      // Finally, initiate student testing protocol.
      if (_GLaDOS) {
        _GLaDOS.afterStartup();
      }
    }

    public krnShutdown() {
      this.krnTrace('begin shutdown OS');
      // TODO: Check for running processes.  If there are some, alert and stop. Else...
      // ... Disable the Interrupts.
      this.krnTrace('Disabling the interrupts.');
      this.krnDisableInterrupts();
      //
      // Unload the Device Drivers?
      // More?
      //
      this.krnTrace('end shutdown OS');
      // Stop the interval that's simulating our clock pulse.
      clearInterval(_hardwareClockID);
    }

    public krnOnCPUClockPulse() {
      if (_KernelInterruptQueue.getSize() > 0) {
        var interrupt = _KernelInterruptQueue.dequeue();
        this.krnInterruptHandler(interrupt.irq, interrupt.params);
      } else if (
        _Scheduler.hasNext() &&
        (!_SingleStepIsEnabled || (_SingleStepIsEnabled && _ShouldStep))
      ) {
        // look at scheduler to see which process we run
        const nextProcess = _Scheduler.next();
        _CPU.cycle(nextProcess);
        _Scheduler.scheduleType.didCycle(nextProcess.pid);
        _Scheduler.updateStats();
        if (_Scheduler.scheduleType.shouldContextSwitch()) {
          _KernelInterruptQueue.enqueue(
            new Interrupt(IRQ.CONTEXT_SWITCH_IRQ, [])
          );
        }
        _ShouldStep = false;
      } else {
        this.krnTrace('Idle');
      }
    }

    //
    // Interrupt Handling
    //
    public krnEnableInterrupts() {
      // Keyboard
      Devices.hostEnableKeyboardInterrupt();
      // Put more here.
    }

    public krnDisableInterrupts() {
      // Keyboard
      Devices.hostDisableKeyboardInterrupt();
      // Put more here.
    }

    public krnDisplayMemory() {
      // the kernel can do what it wants with raw memory
      Control.displayMemory(_Memory.dangerouslyExposeRaw());
    }

    public krnDisplayCPU() {
      Control.displayCPU('-', '--', '-', '-', '-', '-');
    }

    public krnInterruptHandler(irq, params) {
      // This is the Interrupt Handler Routine.  See pages 8 and 560.
      // Trace our entrance here so we can compute Interrupt Latency by analyzing the log file later on. Page 766.
      this.krnTrace('Handling IRQ~' + irq);

      const interruptVector = {
        [IRQ.TIMER_IRQ]: this.krnTimerISR,
        [IRQ.KEYBOARD_IRQ]: () => {
          _krnKeyboardDriver.isr(params); // Kernel mode device driver
          _StdIn.handleInput();
        },
        [IRQ.FILE_SYSTEM_IRQ]: () => {
          _krnFileSystemDriver.isr(params); // forwards file system irqs
          Control.displayDisk(_Disk);
        },
        [IRQ.LOAD_PROGRAM_IRQ]: () => {
          this.onLoadProgram(params[0], params[1]);
        },
        [IRQ.RUN_PROGRAM_IRQ]: () => {
          this.onRunProgram(params[0]);
        },
        [IRQ.BREAK_PROGRAM_IRQ]: () => {
          this.onBreakProgram(params[0]);
        },
        [IRQ.ERR_PROGRAM_IRQ]: () => {
          this.onErrProgram(params[0]);
        },
        [IRQ.REQ_CLEAR_MEM_IRQ]: () => {
          this.onClearMem();
        },
        [IRQ.RUN_ALL_PROGRAMS_IRQ]: () => {
          this.onRunAllPrograms();
        },
        [IRQ.KILL_PROGRAM]: () => {
          this.onKillProgram(params[0]);
        },
        [IRQ.CONTEXT_SWITCH_IRQ]: () => {
          this.onContextSwitch();
        }
      };

      const maybeFn = interruptVector[irq];
      if (maybeFn) {
        maybeFn();
      } else {
        this.krnTrapError(
          'Invalid Interrupt Request. irq=' + irq + ' params=[' + params + ']'
        );
      }
    }
    private onContextSwitch(): void {
      _Scheduler.contextSwitch(_CPU);
      _Scheduler.scheduleType.didContextSwitch();
    }

    private onKillProgram(pid): void {
      this.stopRunningProgram(`Oh dear, I... I just murdered pid ${pid}!`, pid);
    }

    private onRunAllPrograms() {
      const allPcbs = Array.from(_Scheduler.residentMap.values());
      allPcbs.forEach(pcb => this.onRunProgram(pcb.pid.toString()));
    }

    private onClearMem() {
      _MemoryGuardian.evacuate();
      _StdOut.putSysTextLn('Cleared memory.');
    }

    private stopRunningProgram(message, pid) {
      const programToBeStopped = _Scheduler
        .getActiveProcesses()
        .find(p => p.pid === parseInt(pid));

      const waitTime = programToBeStopped.getWaitTime();
      const turnaroundTime = programToBeStopped.getTurnaroundTime();
      // reclaim memory
      _MemoryGuardian.evacuate(programToBeStopped);
      // stop execution
      if (_Scheduler.requestGracefulTermination(pid)) {
        _StdOut.putText(message);
        _StdOut.putText(` Wait time: ${waitTime}`);
        _StdOut.putText(` Turnaround time: ${turnaroundTime}`);
      } else {
        _StdOut.putText(`Process ${pid} could not be gracefully terminated.`);
      }
      _KernelInterruptQueue.enqueue(new Interrupt(IRQ.CONTEXT_SWITCH_IRQ, []));

      Control.renderStats(_CPU);
    }

    private onErrProgram(pid) {
      this.stopRunningProgram(
        `Process ${pid} exited with status code -1.`,
        pid
      );
    }

    private onBreakProgram(pid) {
      this.stopRunningProgram(`Process ${pid} exited with status code 0.`, pid);
    }

    private onLoadProgram(program: string, priority: number) {
      try {
        const process = _Scheduler.requestResidency(program, priority);
        _StdOut.putSysTextLn(
          `Process created with PID ${process.pid} and priority ${priority}`
        );

        this.krnDisplayMemory();
        Control.displayDisk(_Disk);
      } catch (err) {
        _StdOut.putSysTextLn(err.message);
      }
    }

    private onRunProgram(pidString) {
      const pid = parseInt(pidString);
      const isValidPid = _Scheduler.requestCPUExecution(pid);
      if (!isValidPid) {
        // uh oh...
        _StdOut.putSysTextLn(
          `PID ${pid} is invalid. Try running a PID of a process loaded into memory.`
        );
        return;
      }
      _StdOut.putSysTextLn(`Running ${pid}...`);
    }

    public krnTimerISR() {
      console.log('timer');
      // The built-in TIMER (not clock) Interrupt Service Routine (as opposed to an ISR coming from a device driver). {
      // Check multiprogramming parameters and enforce quanta here. Call the scheduler / context switch here if necessary.
    }

    //
    // System Calls... that generate software interrupts via tha Application Programming Interface library routines.
    //
    // Some ideas:
    // - ReadConsole
    // - WriteConsole
    // - CreateProcess
    // - ExitProcess
    // - WaitForProcessToExit
    // - CreateFile
    // - OpenFile
    // - ReadFile
    // - WriteFile
    // - CloseFile

    //
    // OS Utility Routines
    //
    public krnTrace(msg: string) {
      // Check globals to see if trace is set ON.  If so, then (maybe) log the message.
      if (_Trace) {
        if (msg === 'Idle') {
          // We can't log every idle clock pulse because it would lag the browser very quickly.
          if (_OSclock % 10 == 0) {
            // Check the CPU_CLOCK_INTERVAL in globals.ts for an
            // idea of the tick rate and adjust this line accordingly.
            Control.hostLog(msg, 'OS');
          }
        } else {
          Control.hostLog(msg, 'OS');
        }
      }
    }

    public krnTrapError(msg) {
      Control.hostLog('OS ERROR - TRAP: ' + msg);
      _OsShell.shellCrash();
    }
  }
}
