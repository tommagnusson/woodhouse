///<reference path="./opcode.ts"/>
///<reference path="../os/memoryGuardian"/>
///<reference path="../globals.ts" />
///<reference path="../os/scheduler.ts"/>
///<reference path="./control.ts"/>

/* ------------
     CPU.ts

     Requires global.ts.

     Routines for the host CPU simulation, NOT for the OS itself.
     In this manner, it's A LITTLE BIT like a hypervisor,
     in that the Document environment inside a browser is the "bare metal" (so to speak) for which we write code
     that hosts our client OS. But that analogy only goes so far, and the lines are blurred, because we are using
     TypeScript/JavaScript in both the host and client environments.

     This code references page numbers in the text book:
     Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
     ------------ */

namespace TSOS {
  export class Cpu {
    constructor(
      public PC: number = 0,
      public Acc: number = 0,
      public Xreg: number = 0,
      public Yreg: number = 0,
      public Zflag: number = 0,
      public isExecuting: boolean = false
    ) {}

    public init(): void {
      this.PC = 0;
      this.Acc = 0;
      this.Xreg = 0;
      this.Yreg = 0;
      this.Zflag = 0;
      this.isExecuting = false;
    }

    public cycle(): void {
      _Kernel.krnTrace("CPU cycle");
      // look at scheduler to see which process we run
      if (!_Scheduler.executing) {
        // get the next one out of the ready queue
        _Scheduler.executing = _Scheduler.readyQueue.dequeue();
        // TODO: this.reset();
      }

      const location = this.PC;

      // look at the memory guardian to get the next instruction
      const rawInstruction = _MemoryGuardian.read(location.toString(16));
      const opCode = new OpCode(rawInstruction);

      // lookahead based on args to instructions
      for (let i = 0; i < opCode.numArgs; i++) {
        this.PC++;
        opCode.args.push(_MemoryGuardian.read(this.PC.toString(16)));
      }

      // execute that shit
      this.execute(opCode);
      Control.displayMemory(_Memory.dangerouslyExposeRaw());
      Control.displayCPU(
        this.PC,
        opCode.code,
        this.Acc,
        this.Xreg,
        this.Yreg,
        this.Zflag
      );
      console.log(this);
      console.log(opCode);
      // console.table([
      //   {
      //     pc: this.PC,
      //     opcode: opCode,
      //     acc: this.Acc,
      //     x: this.Xreg,
      //     y: this.Yreg,
      //     z: this.Zflag
      //   }
      // ]);

      this.PC++;
    }

    private execute(opCode: OpCode): void {
      const FIRST = 0;
      const SECOND = 1;

      switch (opCode.code) {
        // TEST: A9 01 00 -> Acc == 1
        case "A9": // LDA: constant --> Acc
          this.Acc = parseInt(opCode.args[FIRST], 16);
          break;

        // TEST: AD 01 00 -> Acc == 1
        case "AD": // LDA: Acc from mem
          this.Acc = parseInt(_MemoryGuardian.read(opCode.args[FIRST]), 16);
          break;

        // TEST: A9 02 8D 00 00 --> the A9 changes to 02
        case "8D": // STA: Store Acc in mem
          _MemoryGuardian.write(opCode.args[FIRST], this.Acc.toString(16));
          break;

        // TEST: A9 02 6d 01 00 --> Acc == 4
        case "6D": // ADC: read(address) + Acc --> Acc
          this.Acc += parseInt(_MemoryGuardian.read(opCode.args[FIRST]));
          break;

        // TEST: A2 02 00 --> X == 2
        case "A2": // LDX: constant --> x
          this.Xreg = parseInt(opCode.args[FIRST], 16);
          break;

        // TEST: AE 01 --> X == 1
        case "AE": // LDX: read(address) --> x
          console.log(_MemoryGuardian.read(opCode.args[FIRST]));
          this.Xreg = parseInt(_MemoryGuardian.read(opCode.args[FIRST]), 16);
          break;

        // TEST: A0 02 00 --> y == 2
        case "A0": // LDY: constant --> y
          this.Yreg = parseInt(opCode.args[FIRST], 16);
          break;

        // TEST: AC 01 00 --> y == 1
        case "AC": // LDY: read(address) --> y
          this.Yreg = parseInt(_MemoryGuardian.read(opCode.args[FIRST]), 16);
          break;

        // TEST: EA 00 --> nothing happens, just PC increments
        case "EA": // SPORTS, IT'S IN THE GAME
          break;
        case "00": // BRK
          // TODO: sys call
          _CPU.isExecuting = false;
          break;
        default:
          // TODO: blue screen
          _CPU.isExecuting = false;
      }
    }
  }
}
