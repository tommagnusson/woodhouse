import "../globals";
import "../utils";
import DeviceDriverKeyboard from "./deviceDriverKeyboard";
import Queue from "./queue";
import Control from "../host/control";
import Shell from "./shell";
import Devices from "../host/devices";
import Console from "./console";
import Cpu from "../host/cpu";
import settings from "../settings";
import { Globals } from "../globals";

/* ------------
     Kernel.ts

     Requires globals.ts
              queue.ts

     Routines for the Operating System, NOT the host.

     This code references page numbers in the text book:
     Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
     ------------ */

export default class Kernel {
  // A (currently) non-priority queue for interrupt requests (IRQs).
  public interruptQueue = new Queue();

  public buffers = [];

  // Where device input lands before being processed out somewhere.
  public inputQueue = new Queue();

  public stdIn: Console;
  public stdOut: Console;

  // Global Device Driver Objects - page 12
  public keyboardDriver: DeviceDriverKeyboard;

  public shell: Shell;

  // no other entity should have access to the cpu itself
  private cpu: Cpu;

  // A kernel must have a CPU to be able to execute anything
  constructor(cpu: Cpu) {
    // The command line interface / console I/O device.
    const console = new Console(Control.drawingContext, Control.canvas);
    console.init();

    this.stdIn = console;
    this.stdOut = console;
  }

  //
  // OS Startup and Shutdown Routines
  //
  public krnBootstrap(keyboardDriver: DeviceDriverKeyboard) {
    // Page 8. {
    Control.hostLog("bootstrap", "host"); // Use hostLog because we ALWAYS want this, even if _Trace is off.

    // Load the Keyboard Device Driver
    this.krnTrace("Loading the keyboard device driver.");
    keyboardDriver.driverEntry();
    this.krnTrace(keyboardDriver.status);

    //
    // ... more?
    //

    // Enable the OS Interrupts.  (Not the CPU clock interrupt, as that is done in the hardware sim.)
    this.krnTrace("Enabling the interrupts.");
    this.krnEnableInterrupts();

    // Launch the shell.
    this.krnTrace("Creating and Launching the shell.");
    this.shell = new Shell(this.stdIn, this.stdOut, this.krnShutdown);
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
  }

  public krnOnCPUClockPulse() {
    /* This gets called from the host hardware simulation every time there is a hardware clock pulse.
               This is NOT the same as a TIMER, which causes an interrupt and is handled like other interrupts.
               This, on the other hand, is the clock pulse from the hardware / VM / host that tells the kernel
               that it has to look for interrupts and process them if it finds any.                           */

    // Check for an interrupt, are any. Page 560
    if (this.interruptQueue.getSize() > 0) {
      // Process the first interrupt on the interrupt queue.
      // TODO: Implement a priority queue based on the IRQ number/id to enforce interrupt priority.
      var interrupt = this.inputQueue.dequeue();
      this.krnInterruptHandler(interrupt.irq, interrupt.params);
    } else if (this.cpu.isExecuting) {
      // If there are no interrupts then run one CPU cycle if there is anything being processed. {
      this.cpu.cycle();
      this.krnTrace("CPU cycle");
    } else {
      // If there are no interrupts and there is nothing being executed then just be idle. {
      this.krnTrace("Idle");
    }
  }

  //
  // Interrupt Handling
  //
  public krnEnableInterrupts() {
    // Keyboard
    this.keyboardDriver.enableKeyboardInterrupt();
    // Put more here.
  }

  public krnDisableInterrupts() {
    // Keyboard
    this.keyboardDriver.disableKeyboardInterrupt();
    // Put more here.
  }

  public krnInterruptHandler(irq, params) {
    // This is the Interrupt Handler Routine.  See pages 8 and 560.
    // Trace our entrance here so we can compute Interrupt Latency by analyzing the log file later on. Page 766.
    this.krnTrace("Handling IRQ~" + irq);

    // Invoke the requested Interrupt Service Routine via Switch/Case rather than an Interrupt Vector.
    // TODO: Consider using an Interrupt Vector in the future.
    // Note: There is no need to "dismiss" or acknowledge the interrupts in our design here.
    //       Maybe the hardware simulation will grow to support/require that in the future.
    switch (irq) {
      case Globals.TIMER_IRQ:
        this.krnTimerISR(); // Kernel built-in routine for timers (not the clock).
        break;
      case Globals.KEYBOARD_IRQ:
        this.keyboardDriver.isr(params); // Kernel mode device driver
        this.stdIn.handleInput(
          this.inputQueue,
          this.shell.handleInput(this.krnTrace)
        );
        break;
      default:
        this.krnTrapError(
          "Invalid Interrupt Request. irq=" + irq + " params=[" + params + "]"
        );
    }
  }

  public krnTimerISR() {
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
    if (settings.isTraceEnabled) {
      if (msg === "Idle") {
        // We can't log every idle clock pulse because it would lag the browser very quickly.
        if (settings.osClock % 10 == 0) {
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
    // TODO: Display error on console, perhaps in some sort of colored screen. (Maybe blue?)
    this.krnShutdown();
  }
}
