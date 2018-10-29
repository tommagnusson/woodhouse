///<reference path="./segment.ts"/>
///<reference path="../host/opcode.ts"/>

namespace TSOS {
  export class ProcessControlBlock {
    // TODO: status
    // resident, ready, executing, terminated
    public status = "uninitialized";

    // which instruction we're on
    public programCounter = 0;
    public xReg = 0;
    public yReg = 0;
    public instruction: OpCode;
    public accumulator = 0;

    // looks for 0s, if found zFlag is set to 1
    public zFlag = 0;

    constructor(public pid: number, public occupiedSegment: Segment) {}

    public serialize(cpu: Cpu) {
      this.instruction = cpu.lastInstruction;
      this.programCounter = cpu.PC;
      this.accumulator = cpu.Acc;
      this.xReg = cpu.Xreg;
      this.yReg = cpu.Yreg;
      this.zFlag = cpu.Zflag;
      this.status = "ready";
    }
  }
}
