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
      Control.renderStats(this);
    }

    public reset(): void {
      this.PC = 0;
      this.Acc = 0;
      this.Xreg = 0;
      this.Yreg = 0;
      this.Zflag = 0;
      Control.renderStats(this);
    }

    public cycle(process?: ProcessControlBlock): void {
      _Kernel.krnTrace("CPU cycle");

      const location = this.PC;

      // look at the memory guardian to get the next instruction
      const rawInstruction = _MemoryGuardian.read(location.toString(16));
      try {
        const opCode = new OpCode(rawInstruction);

        // lookahead based on args to instructions
        for (let i = 0; i < opCode.numArgs; i++) {
          this.PC++;
          opCode.args.push(_MemoryGuardian.read(this.PC.toString(16)));
        }

        // execute that shit
        const shouldExitEarly = this.execute(opCode);
        if (shouldExitEarly) {
          return;
        }
        this.PC++;
        while (this.PC > 255) {
          this.PC -= 256;
        }
        Control.renderStats(this, opCode);
        // console.table([
        //   {
        //     pc: this.PC,
        //     opcode: opCode.code,
        //     acc: this.Acc,
        //     x: this.Xreg,
        //     y: this.Yreg,
        //     z: this.Zflag
        //   }
        // ]);
      } catch (ex) {
        console.error(ex);
        _StdOut.putText(ex.message);
        _KernelInterruptQueue.enqueue(new Interrupt(ERR_PROGRAM_IRQ, []));
        this.reset();
      }
    }

    // returns if it should exit early (without incrementing the PC)
    private execute(opCode: OpCode): boolean {
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
          _KernelInterruptQueue.enqueue(new Interrupt(BREAK_PROGRAM_IRQ, []));
          this.reset();
          return true;

        // TEST: A2 01 EC 01 00 --> z == 1
        // TEST: A2 02 EC 00 00 --> z == 0
        case "EC": // CPX: (read(address) == X) ? Z = 1 : Z = 0
          this.Zflag = _MemoryGuardian.readInt(arg) === this.Xreg ? 1 : 0;
          break;

        // TEST: D0 01 00 A9 01 00 --> Acc == 1
        // TEST: D0 00 --> infinite execution
        case "D0": // BNE: z == 0 ? PC = wrap(arg)
          this.PC += this.Zflag === 0 ? parseInt(arg, 16) : 0;
          break;

        // TEST: EE 01 00 --> 01 turns to 02
        case "EE": // INC: read(address)++
          _MemoryGuardian.write(
            arg,
            (_MemoryGuardian.readInt(arg) + 1).toString(16)
          );
          break;
        // TEST: A2 01 A0 02 FF --> print 2
        // A0 LDY w C
        // A2 LDX w C
        // TEST: A2 02 A0 05 FF 68 69 00 --> print "hi"
        case "FF": // SYS: x == 01 ? print y int :? x == 02 print read(y) string
          if (this.Xreg === 1) {
            _StdOut.putText(this.Yreg.toString());
          } else if (this.Xreg === 2) {
            // start reading and printing out the string at the location
            let asciiNum;
            for (
              let location = this.Yreg.toString(16),
                asciiNum = _MemoryGuardian.readInt(location);
              asciiNum !== 0;
              location = (parseInt(location, 16) + 1).toString(16),
                asciiNum = _MemoryGuardian.readInt(location)
            ) {
              let character = String.fromCharCode(asciiNum);
              _StdOut.putText(character);
            }
          } else {
            _StdOut.putSysText(
              `Found invalid Xreg value ${this.Xreg} for SYS.`
            );
          }
          break;
        default:
          _StdOut.putSysTextLn(`Found invalid opcode ${opCode.code}.`);
          _KernelInterruptQueue.enqueue(new Interrupt(BREAK_PROGRAM_IRQ, []));
          this.reset();
          return true;
      }
      return false;
    }
  }
}
