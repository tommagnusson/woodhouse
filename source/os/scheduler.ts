///<reference path="./processControlBlock.ts"/>
///<reference path="./queue.ts"/>

namespace TSOS {
  export class Scheduler {
    readonly readyQueue: Queue = new Queue();
    public executing: ProcessControlBlock = null;

    constructor() {}
  }
}
