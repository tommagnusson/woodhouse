import { Globals } from "../globals";
import settings from "../settings";
import CanvasTextFunctions from "../os/canvastext";
import Cpu from "./cpu";
import Host from "./devices";
import Kernel from "../os/kernel";
import DeviceDriverKeyboard from "../os/deviceDriverKeyboard";

/* ------------
     Control.ts

     Requires globals.ts.

     Routines for the hardware simulation, NOT for our client OS itself.
     These are static because we are never going to instantiate them, because they represent the hardware.
     In this manner, it's A LITTLE BIT like a hypervisor, in that the Document environment inside a browser
     is the "bare metal" (so to speak) for which we write code that hosts our client OS.
     But that analogy only goes so far, and the lines are blurred, because we are using TypeScript/JavaScript
     in both the host and client environments.

     This (and other host/simulation scripts) is the only place that we should see "web" code, such as
     DOM manipulation and event handling, and so on.  (Index.html is -- obviously -- the only place for markup.)

     This code references page numbers in the text book:
     Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
     ------------ */

//
// Control Services
//

export default class Control {
  public static canvas: HTMLCanvasElement;
  public static drawingContext: any;

  private static kernel: Kernel;
  private static host: Host;

  // pub-sub model, to account for glados
  private static afterStartupCallbacks = [];
  public static addAfterStartupCallback(callback: any) {
    this.afterStartupCallbacks.push(callback);
  }

  public static hostInit(host: Host): void {
    this.host = host;

    // This is called from index.html's onLoad event via the onDocumentLoad function pointer.

    Control.canvas = <HTMLCanvasElement>document.getElementById("display");

    // Get a global reference to the drawing context.
    Control.drawingContext = Control.canvas.getContext("2d");

    // Enable the added-in canvas text functions (see canvastext.ts for provenance and details).
    CanvasTextFunctions.enable(Control.drawingContext); // Text functionality is now built in to the HTML5 canvas. But this is old-school, and fun, so we'll keep it.

    // Clear the log text box.
    // Use the TypeScript cast to HTMLInputElement
    (<HTMLInputElement>document.getElementById("taHostLog")).value = "";

    // Set focus on the start button.
    // Use the TypeScript cast to HTMLInputElement
    (<HTMLInputElement>document.getElementById("btnStartOS")).focus();
  }

  public static hostLog(msg: string, source: string = "?"): void {
    // Note the OS CLOCK.
    var clock: number = settings.osClock;

    // Note the REAL clock in milliseconds since January 1, 1970.
    var now: number = new Date().getTime();

    // Build the log string.
    var str: string =
      "({ clock:" +
      clock +
      ", source:" +
      source +
      ", msg:" +
      msg +
      ", now:" +
      now +
      " })" +
      "\n";

    // Update the log console.
    var taLog = <HTMLInputElement>document.getElementById("taHostLog");
    taLog.value = str + taLog.value;

    // TODO in the future: Optionally update a log database or some streaming service.
  }

  //
  // Host Events
  //
  public static hostBtnStartOS_click(btn): void {
    // Disable the (passed-in) start button...
    btn.disabled = true;

    // .. enable the Halt and Reset buttons ...
    (<HTMLButtonElement>document.getElementById("btnHaltOS")).disabled = false;
    (<HTMLButtonElement>document.getElementById("btnReset")).disabled = false;

    // .. set focus on the OS console display ...
    document.getElementById("display").focus();

    // ... Create and initialize the CPU (because it's part of the hardware)  ...
    const cpu = new Cpu(); // Note: We could simulate multi-core systems by instantiating more than one instance of the CPU here.
    cpu.init(); //       There's more to do, like dealing with scheduling and such, but this would be a start. Pretty cool.

    // ... then set the host clock pulse ...
    settings.hardwareClockID = setInterval(
      this.host.clockPulse,
      Globals.CPU_CLOCK_INTERVAL
    );
    // .. and call the OS Kernel Bootstrap routine.
    this.kernel = new Kernel(cpu);
    this.kernel.krnBootstrap(
      new DeviceDriverKeyboard(this.kernel.interruptQueue)
    );

    // for interested callers, for example glados testing suite
    this.afterStartupCallbacks.forEach(sub => sub());
  }

  public static hostBtnHaltOS_click(btn): void {
    Control.hostLog("Emergency halt", "host");
    Control.hostLog("Attempting Kernel shutdown.", "host");
    // Call the OS shutdown routine.
    this.kernel.krnShutdown();
    // Stop the interval that's simulating our clock pulse.
    clearInterval(settings.hardwareClockID);
    // TODO: Is there anything else we need to do here?
  }

  public static hostBtnReset_click(btn): void {
    // The easiest and most thorough way to do this is to reload (not refresh) the document.
    location.reload(true);
    // That boolean parameter is the 'forceget' flag. When it is true it causes the page to always
    // be reloaded from the server. If it is false or not specified the browser may reload the
    // page from its cache, which is not what we want.
  }
}
