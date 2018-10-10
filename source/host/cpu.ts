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
      Control.displayCPU(
        this.PC,
        opCode.code,
        this.Acc,
        this.Xreg,
        this.Yreg,
        this.Zflag
      );
      console.table([
        {
          pc: this.PC,
          opcode: opCode.code,
          acc: this.Acc,
          x: this.Xreg,
          y: this.Yreg,
          z: this.Zflag
        }
      ]);

      this.PC++;
    }

    private execute(opCode: OpCode): void {
      const FIRST = 0;
      const SECOND = 1;

      switch (opCode.code) {
        case "00": // BRK
          _CPU.isExecuting = false;
          break;
        case "A9": // LDA - Acc w. constant
          this.Acc = parseInt(opCode.args[FIRST], 16);
          break;
        case "AD": // LDA - Acc from mem
          this.Acc = parseInt(_MemoryGuardian.read(opCode.args[FIRST]), 16);
          break;
        case "8D": // LDA - Store Acc in mem
          _MemoryGuardian.write(opCode.args[FIRST], this.Acc.toString(16));
          break;
        case "6D": // ADC - address + Acc --> Acc
          this.Acc += parseInt(_MemoryGuardian.read(opCode.args[FIRST]));
        // TEST: A9 01 6D 01 00 00 -> Acc == 2
        default:
          // TODO: blue screen
          _CPU.isExecuting = false;
      }
    }
  }
}
