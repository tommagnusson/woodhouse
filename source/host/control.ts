///<reference path="../globals.ts" />
///<reference path="../os/canvastext.ts" />
///<reference path="./cpu.ts"/>
///<reference path="./memory.ts"/>
///<reference path="../os/memoryGuardian.ts"/>
///<reference path="../os/processControlBlock.ts"/>

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
namespace TSOS {
  export class Control {
    public static hostInit(): void {
      // This is called from index.html's onLoad event via the onDocumentLoad function pointer.

      let started = false;
      document.addEventListener("keydown", e => {
        if (e.key === " " && !started) {
          e.preventDefault();
          document.getElementById("btnStartOS").click();
          started = true;
        }
      });

      // Get a global reference to the canvas.  TODO: Should we move this stuff into a Display Device Driver?
      _Canvas = <HTMLCanvasElement>document.getElementById("display");
      _Canvas.style.backgroundColor = "white"; // reset perhaps from a BSOD

      // Get a global reference to the program input text area.
      _ProgramInput = <HTMLTextAreaElement>(
        document.getElementById("taProgramInput")
      );

      // Get a global reference to the drawing context.
      _DrawingContext = _Canvas.getContext("2d");

      // Enable the added-in canvas text functions (see canvastext.ts for provenance and details).
      CanvasTextFunctions.enable(_DrawingContext); // Text functionality is now built in to the HTML5 canvas. But this is old-school, and fun, so we'll keep it.

      // Clear the log text box.
      (<HTMLInputElement>document.getElementById("taHostLog")).value = "";

      // Set focus on the start button.
      (<HTMLInputElement>document.getElementById("btnStartOS")).focus();

      // updates the time and status
      const tick = () => {
        const now = new Date(Date.now());
        document.getElementById("date").textContent =
          now.toLocaleDateString() + " " + now.toLocaleTimeString();
        document.getElementById("status").textContent = _Status;
      };
      // init the clock display
      setInterval(tick, 500);

      // Check for our testing and enrichment core, which
      // may be referenced here (from index.html) as function Glados().
      if (typeof Glados === "function") {
        // function Glados() is here, so instantiate Her into
        // the global (and properly capitalized) _GLaDOS variable.
        _GLaDOS = new Glados();
        _GLaDOS.init();
      }
    }

    public static hostLog(msg: string, source: string = "?"): void {
      // Note the OS CLOCK.
      var clock: number = _OSclock;

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
      (<HTMLButtonElement>(
        document.getElementById("btnHaltOS")
      )).disabled = false;
      (<HTMLButtonElement>document.getElementById("btnReset")).disabled = false;

      // .. set focus on the OS console display ...
      document.getElementById("display").focus();

      // ... Create and initialize the CPU (because it's part of the hardware)  ...
      _Memory = new Memory();
      _CPU = new Cpu(); // Note: We could simulate multi-core systems by instantiating more than one instance of the CPU here.
      _CPU.init(); //       There's more to do, like dealing with scheduling and such, but this would be a start. Pretty cool.

      // ... then set the host clock pulse ...
      _hardwareClockID = setInterval(
        Devices.hostClockPulse,
        CPU_CLOCK_INTERVAL
      );
      // .. and call the OS Kernel Bootstrap routine.
      _Kernel = new Kernel();
      _Kernel.krnBootstrap(); // _GLaDOS.afterStartup() will get called in there, if configured.
    }

    public static hostBtnHaltOS_click(btn): void {
      Control.hostLog("Emergency halt", "host");
      Control.hostLog("Attempting Kernel shutdown.", "host");
      // Call the OS shutdown routine.
      _Kernel.krnShutdown();

      // TODO: Is there anything else we need to do here?
    }

    public static onToggleStep(btn): void {
      // toggle
      btn.dataset.state = btn.dataset.state === "on" ? "off" : "on";

      if (btn.dataset.state === "on") {
        btn.classList.replace("btn-outline-info", "btn-info");
        document.getElementById("btnStepOS").removeAttribute("disabled");
        // turn on single step
        _SingleStepIsEnabled = true;
      } else {
        btn.classList.replace("btn-info", "btn-outline-info");
        document
          .getElementById("btnStepOS")
          .setAttribute("disabled", "disabled");
        // turn off
        _SingleStepIsEnabled = false;
      }
    }

    public static onStep(btn): void {
      _ShouldStep = true;
    }

    public static hostBtnReset_click(btn): void {
      // The easiest and most thorough way to do this is to reload (not refresh) the document.
      location.reload(true);
      // That boolean parameter is the 'forceget' flag. When it is true it causes the page to always
      // be reloaded from the server. If it is false or not specified the browser may reload the
      // page from its cache, which is not what we want.
    }

    public static renderStats(cpu: Cpu, opCode?: OpCode) {
      Control.displayMemory(_Memory.dangerouslyExposeRaw());
      const code = opCode ? opCode.code : "--";
      Control.displayCPU(cpu.PC, code, cpu.Acc, cpu.Xreg, cpu.Yreg, cpu.Zflag);
      _Scheduler
        ? Control.displayPCB(_Scheduler.executing || null, cpu, code)
        : null;
    }

    public static displayCPU(counter, instruction, accumulator, x, y, z) {
      const cpuDisplayIdToValue = {
        cpuCounter: counter.toString(16),
        cpuInstruction: instruction,
        cpuAccumulator: accumulator.toString(16),
        cpuX: x.toString(16),
        cpuY: y.toString(16),
        cpuZ: z.toString(16)
      };
      for (let key of Object.keys(cpuDisplayIdToValue)) {
        document.getElementById(key).textContent = cpuDisplayIdToValue[
          key
        ].toUpperCase();
      }
    }

    public static displayPCB(pcb: ProcessControlBlock, cpu: Cpu, code: string) {
      if (!pcb) {
        [
          "pcbPID",
          "pcbState",
          "pcbBase",
          "pcbLimit",
          "pcbCounter",
          "pcbInstruction",
          "pcbAccumulator",
          "pcbX",
          "pcbY",
          "pcbZ"
        ].forEach(id => {
          document.getElementById(id).textContent = "";
        });
        return;
      }
      const pcbDisplayIdToValue = {
        pcbPID: pcb.pid.toString(),
        pcbState: pcb.status,
        pcbBase: pcb.occupiedSegment.base.toString(),
        pcbLimit: pcb.occupiedSegment.limit.toString(),
        pcbCounter: cpu.PC.toString(),
        pcbInstruction: code,
        pcbAccumulator: cpu.Acc.toString(),
        pcbX: cpu.Xreg.toString(),
        pcbY: cpu.Yreg.toString(),
        pcbZ: cpu.Zflag.toString()
      };
      for (let key of Object.keys(pcbDisplayIdToValue)) {
        document.getElementById(key).textContent = pcbDisplayIdToValue[
          key
        ].toUpperCase();
      }
    }

    public static displayMemory(memory: string[]) {
      const memoryTable = document.querySelector(".memory table tbody");

      // clear existing garbage in there
      while (memoryTable.firstChild) {
        memoryTable.removeChild(memoryTable.firstChild);
      }

      // break into bytes
      for (let location = 0; location < memory.length; location += 8) {
        const byte = memory.slice(location, location + 8);

        const byteRow = document.createElement("tr");

        const addressLabel = document.createElement("th");
        addressLabel.setAttribute("scope", "row");
        addressLabel.textContent = `0x${location.toString(16)}`;

        byteRow.appendChild(addressLabel);

        for (let i = 0; i < byte.length; i++) {
          const bit = byte[i];
          const bitCell = document.createElement("td");
          bitCell.setAttribute("id", `location${location + i}`);
          bitCell.textContent = bit;
          byteRow.appendChild(bitCell);
        }
        memoryTable.appendChild(byteRow);
      }
    }
  }
}
