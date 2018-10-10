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
      Control.hostLog("bootstrap", "host"); // Use hostLog because we ALWAYS want this, even if _Trace is off.

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
      this.krnTrace("Loading the keyboard device driver.");
      _krnKeyboardDriver = new DeviceDriverKeyboard(); // Construct it.
      _krnKeyboardDriver.driverEntry(); // Call the driverEntry() initialization routine.
      this.krnTrace(_krnKeyboardDriver.status);

      //
      // ... more?
      //

      // Enable the OS Interrupts.  (Not the CPU clock interrupt, as that is done in the hardware sim.)
      this.krnTrace("Enabling the interrupts.");
      this.krnEnableInterrupts();

      // Launch the shell.
      this.krnTrace("Creating and Launching the shell.");
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
      this.krnTrace("begin shutdown OS");
      // TODO: Check for running processes.  If there are some, alert and stop. Else...
      // ... Disable the Interrupts.
      this.krnTrace("Disabling the interrupts.");
      this.krnDisableInterrupts();
      //
      // Unload the Device Drivers?
      // More?
      //
      this.krnTrace("end shutdown OS");
      // Stop the interval that's simulating our clock pulse.
      clearInterval(_hardwareClockID);
    }

    public krnOnCPUClockPulse() {
      /* This gets called from the host hardware simulation every time there is a hardware clock pulse.
               This is NOT the same as a TIMER, which causes an interrupt and is handled like other interrupts.
               This, on the other hand, is the clock pulse from the hardware / VM / host that tells the kernel
               that it has to look for interrupts and process them if it finds any.                           */

      // Check for an interrupt, are any. Page 560
      if (_KernelInterruptQueue.getSize() > 0) {
        // Process the first interrupt on the interrupt queue.
        // TODO: Implement a priority queue based on the IRQ number/id to enforce interrupt priority.
        var interrupt = _KernelInterruptQueue.dequeue();
        this.krnInterruptHandler(interrupt.irq, interrupt.params);
      } else if (_CPU.isExecuting) {
        // If there are no interrupts then run one CPU cycle if there is anything being processed
        _CPU.cycle();
      } else {
        // If there are no interrupts and there is nothing being executed then just be idle.
        this.krnTrace("Idle");
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
      Control.displayCPU("-", "--", "-", "-", "-", "-");
    }

    public krnInterruptHandler(irq, params) {
      // This is the Interrupt Handler Routine.  See pages 8 and 560.
      // Trace our entrance here so we can compute Interrupt Latency by analyzing the log file later on. Page 766.
      this.krnTrace("Handling IRQ~" + irq);

      const interruptVector = {
        [TIMER_IRQ]: this.krnTimerISR,
        [KEYBOARD_IRQ]: () => {
          _krnKeyboardDriver.isr(params); // Kernel mode device driver
          _StdIn.handleInput();
        },
        [LOAD_PROGRAM_IRQ]: () => {
          this.onLoadProgram(params[0]);
        },
        [RUN_PROGRAM_IRQ]: () => {
          this.onRunProgram(params[0]);
        }
      };

      const maybeFn = interruptVector[irq];
      if (maybeFn) {
        maybeFn();
      } else {
        this.krnTrapError(
          "Invalid Interrupt Request. irq=" + irq + " params=[" + params + "]"
        );
      }
    }

    private onLoadProgram(program: string) {
      try {
        const pid = _MemoryGuardian.load(program);
        _OsShell.putSystemText(`Process created with PID ${pid}`);
        this.krnDisplayMemory();
      } catch (err) {
        _OsShell.putSystemText(err.message);
      }
    }

    private onRunProgram(pidString) {
      const pid = parseInt(pidString);
      const isValidPid = Array.from(_MemoryGuardian.processes.keys()).some(
        key => key === pid
      );
      if (!isValidPid) {
        // uh oh...
        _OsShell.putSystemText(
          `PID ${pid} is invalid. Try running a PID of a process loaded into memory.`
        );
        return;
      }
      _OsShell.putSystemText(`Running ${pid}...`);
      _Scheduler.readyQueue.enqueue(_MemoryGuardian.processes.get(pid));
      _CPU.isExecuting = true;
    }

    public krnTimerISR() {
      console.log("timer");
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
        if (msg === "Idle") {
          // We can't log every idle clock pulse because it would lag the browser very quickly.
          if (_OSclock % 10 == 0) {
            // Check the CPU_CLOCK_INTERVAL in globals.ts for an
            // idea of the tick rate and adjust this line accordingly.
            Control.hostLog(msg, "OS");
          }
        } else {
          Control.hostLog(msg, "OS");
        }
      }
    }

    public krnTrapError(msg) {
      Control.hostLog("OS ERROR - TRAP: " + msg);
      _OsShell.shellCrash();
    }
  }
}
