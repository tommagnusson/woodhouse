///<reference path="./segment.ts"/>

namespace TSOS {
  export class ProcessControlBlock {
    // TODO: status
    public status = "uninitialized";

    // which instruction we're on
    public programCounter = 0;
    public xReg = "";
    public yReg = "";

    // looks for 0s, if found zFlag is set to 1
    public zFlag = 0;

    constructor(public pid: number, public occupiedSegment: Segment) {}
  }
}
