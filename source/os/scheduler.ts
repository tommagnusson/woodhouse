///<reference path="./processControlBlock.ts"/>
///<reference path="./queue.ts"/>

namespace TSOS {
  export class Scheduler {
    readonly readyQueue: Queue = new Queue();
    public executing: ProcessControlBlock = null;

    constructor() {}

    public requestGracefulTermination(): boolean {
      this.executing = null;
      _CPU.isExecuting = false;
      return this.executing === null;
    }

    public hasNext(): boolean {
      // !! casts to boolean
      return !!(this.executing || this.readyQueue.peek());
    }

    public next(): ProcessControlBlock {
      if (!this.executing) {
        this.executing = this.readyQueue.dequeue();
      }
      return this.executing;
    }

    public requestCPUExecution(process: ProcessControlBlock): boolean {
      this.readyQueue.enqueue(process);
      const requestedWillExecute =
        this.readyQueue.peek() === process && !_CPU.isExecuting;
      _CPU.isExecuting = true;
      return requestedWillExecute;
    }
  }
}
