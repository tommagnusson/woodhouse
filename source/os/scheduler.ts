///<reference path="./processControlBlock.ts"/>

namespace TSOS {
  export class Scheduler {
    readonly readyQueue: Array<ProcessControlBlock> = [];
    constructor() {}

    public pushReadyProgram(pcb: ProcessControlBlock) {
      this.readyQueue.push(pcb);
    }
  }
}
