///<reference path="./opcode.ts"/>
///<reference path="../os/memoryGuardian.ts"/>
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
      this.renderStats();
    }

    public reset(): void {
      this.PC = 0;
      this.Acc = 0;
      this.Xreg = 0;
      this.Yreg = 0;
      this.Zflag = 0;
      this.renderStats();
    }

    public renderStats(opCode?: OpCode) {
      Control.displayMemory(_Memory.dangerouslyExposeRaw());
      const code = opCode ? opCode.code : "--";
      Control.displayCPU(
        this.PC,
        code,
        this.Acc,
        this.Xreg,
        this.Yreg,
        this.Zflag
      );
    }

    public cycle(process?: ProcessControlBlock): void {
      _Kernel.krnTrace("CPU cycle");

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
      this.renderStats(opCode);
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
      const arg = opCode.args[0];

      switch (opCode.code) {
        // TEST: A9 01 00 -> Acc == 1
        case "A9": // LDA: constant --> Acc
          this.Acc = parseInt(arg, 16);
          break;

        // TEST: AD 01 00 -> Acc == 1
        case "AD": // LDA: Acc from mem
          this.Acc = parseInt(_MemoryGuardian.read(arg), 16);
          break;

        // TEST: A9 02 8D 00 00 --> the A9 changes to 02
        case "8D": // STA: Store Acc in mem
          _MemoryGuardian.write(arg, this.Acc.toString(16));
          break;

        // TEST: A9 02 6d 01 00 --> Acc == 4
        case "6D": // ADC: read(address) + Acc --> Acc
          this.Acc += _MemoryGuardian.readInt(arg);
          break;

        // TEST: A2 02 00 --> X == 2
        case "A2": // LDX: constant --> x
          this.Xreg = parseInt(arg, 16);
          break;

        // TEST: AE 01 --> X == 1
        case "AE": // LDX: read(address) --> x
          this.Xreg = _MemoryGuardian.readInt(arg);
          break;

        // TEST: A0 02 00 --> y == 2
        case "A0": // LDY: constant --> y
          this.Yreg = parseInt(arg, 16);
          break;

        // TEST: AC 01 00 --> y == 1
        case "AC": // LDY: read(address) --> y
          this.Yreg = _MemoryGuardian.readInt(arg);
          break;

        // TEST: EA 00 --> nothing happens, just PC increments
        case "EA": // SPORTS, IT'S IN THE GAME
          break;

        case "00": // BRK
          console.log(_KernelInterruptQueue);
          _KernelInterruptQueue.enqueue(new Interrupt(BREAK_PROGRAM_IRQ, []));
          break;

        // TEST: A2 01 EC 01 00 --> z == 1
        // TEST: A2 02 EC 00 00 --> z == 0
        case "EC": // CPX: (read(address) == X) ? Z = 1 : Z = 0
          this.Zflag = _MemoryGuardian.readInt(arg) === this.Xreg ? 1 : 0;
          break;

        // TEST: D0 02 00 00 A9 01 00 --> Acc == 1
        // TODO TEST: D0 FE --> infinite execution
        case "D0": // BNE: z == 0 ? PC += read(address)
          this.PC += this.Zflag === 0 ? parseInt(arg, 16) : 0;

          // TODO: wrap
          if (this.PC > 255) {
            this.PC = this.PC - 256;
          }
          break;

        // TEST: EE 01 00 --> 01 turns to 02
        case "EE": // INC: read(address)++
          _MemoryGuardian.write(
            arg,
            (_MemoryGuardian.readInt(arg) + 1).toString(16)
          );
          break;
        case "FF": // SYS: x == 01 ? print y int :? x == 02 print read(y) string
        default:
          // TODO: blue screen
          _CPU.isExecuting = false;
      }
    }
  }
}
