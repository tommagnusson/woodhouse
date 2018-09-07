import "../globals";
import Interrupt from "../os/interrupt";
import settings from "../settings";
import Kernel from "../os/kernel";
import Cpu from "./cpu";
import { Globals } from "../globals";

/* ------------
     Host.ts

     Requires global.ts.

     Routines for the hardware simulation, NOT for our client OS itself.
     These are static because we are never going to instantiate them, because they represent the hardware.
     In this manner, it's A LITTLE BIT like a hypervisor, in that the Document environment inside a browser
     is the "bare metal" (so to speak) for which we write code that hosts our client OS.
     But that analogy only goes so far, and the lines are blurred, because we are using TypeScript/JavaScript
     in both the host and client environments.

     This (and simulation scripts) is the only place that we should see "web" code, like
     DOM manipulation and TypeScript/JavaScript event handling, and so on.  (Index.html is the only place for markup.)

     This code references page numbers in the text book:
     Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
     ------------ */

export default class Host {
  private kernel: Kernel;

  constructor(kernel: Kernel) {
    settings.hardwareClockID = -1;
  }

  //
  // Hardware/Host Clock Pulse
  //
  public clockPulse(): void {
    // Increment the hardware (host) clock.
    settings.osClock++;
    // Call the kernel clock pulse event handler.
    this.kernel.krnOnCPUClockPulse();
  }
}
