import { Globals } from "../globals";
import { DeviceDriver } from "./deviceDriver";
import Interrupt from "../os/interrupt";
import Queue from "../os/queue";

/* ----------------------------------
   DeviceDriverKeyboard.ts

   Requires deviceDriver.ts

   The Kernel Keyboard Device Driver.
   ---------------------------------- */

// Extends DeviceDriver
export default class DeviceDriverKeyboard extends DeviceDriver {
  private interruptQueue: Queue;

  constructor(interruptQueue: Queue) {
    super();
    // Override the base method pointers.

    this.interruptQueue = interruptQueue;

    // The code below cannot run because "this" can only be
    // accessed after calling super.
    //super(this.krnKbdDriverEntry, this.krnKbdDispatchKeyPress);
    this.driverEntry = this.krnKbdDriverEntry;
    this.isr = this.krnKbdDispatchKeyPress;
  }

  public krnKbdDriverEntry() {
    // Initialization routine for this, the kernel-mode Keyboard Device Driver.
    this.status = "loaded";
    // More?
  }

  // returns a character to be enqueued onto the Kernel's Input Queue
  public krnKbdDispatchKeyPress(params, traceFn?: any): string {
    // Parse the params.    TODO: Check that the params are valid and osTrapError if not.
    var keyCode = params[0];
    var isShifted = params[1];
    if (traceFn) {
      traceFn("Key code:" + keyCode + " shifted:" + isShifted);
    }
    var chr = "";
    // Check to see if we even want to deal with the key that was pressed.
    if (
      (keyCode >= 65 && keyCode <= 90) || // A..Z
      (keyCode >= 97 && keyCode <= 123)
    ) {
      // a..z {
      // Determine the character we want to display.
      // Assume it's lowercase...
      chr = String.fromCharCode(keyCode + 32);
      // ... then check the shift key and re-adjust if necessary.
      if (isShifted) {
        chr = String.fromCharCode(keyCode);
      }
      // TODO: Check for caps-lock and handle as shifted if so.
    } else if (
      (keyCode >= 48 && keyCode <= 57) || // digits
      keyCode == 32 || // space
      keyCode == 13
    ) {
      // enter
      chr = String.fromCharCode(keyCode);
    }
    return chr;
  }

  //
  // Keyboard Interrupt, a HARDWARE Interrupt Request. (See pages 560-561 in our text book.)
  //
  public enableKeyboardInterrupt(): void {
    // Listen for key press (keydown, actually) events in the Document
    // and call the simulation processor, which will in turn call the
    // OS interrupt handler.
    document.addEventListener("keydown", this.onKeyPress, false);
  }

  public disableKeyboardInterrupt(): void {
    document.removeEventListener("keydown", this.onKeyPress, false);
  }

  public onKeyPress(event): void {
    // The canvas element CAN receive focus if you give it a tab index, which we have.
    // Check that we are processing keystrokes only from the canvas's id (as set in index.html).
    if (event.target.id === "display") {
      event.preventDefault();
      // Note the pressed key code in the params (Mozilla-specific).
      var params = new Array(event.which, event.shiftKey);
      // Enqueue this interrupt on the kernel interrupt queue so that it gets to the Interrupt handler.
      this.interruptQueue.enqueue(new Interrupt(Globals.KEYBOARD_IRQ, params));
    }
  }
}
