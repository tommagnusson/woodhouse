///<reference path="./processControlBlock.ts"/>
///<reference path="./queue.ts"/>

namespace TSOS {
  export class Scheduler {
    readonly terminatedQueue = new Queue();
    readonly readyQueue: Queue = new Queue();

    readonly residentMap: Map<number, ProcessControlBlock> = new Map();
    public executing: ProcessControlBlock = null;

    constructor() {}

    public requestGracefulTermination(): boolean {
      this.terminatedQueue.enqueue(this.executing);
      this.executing.status = "terminated";
      this.executing = null;
      _CPU.isExecuting = false;
      return this.executing === null;
    }

    public requestResidency(program: string): ProcessControlBlock {
      const process = _MemoryGuardian.load(program);
      process.status = "resident";
      this.residentMap.set(process.pid, process);
      return process;
    }

    public hasNext(): boolean {
      // !! casts to boolean
      return !!(this.executing || this.readyQueue.peek());
    }

    public next(): ProcessControlBlock {
      if (!this.executing) {
        this.executing = this.readyQueue.dequeue();
        this.executing.status = "running";
      }
      return this.executing;
    }

    public requestCPUExecution(pid: number): boolean {
      if (!this.residentMap.has(pid)) {
        return null;
      }
      const readyProgram = this.residentMap.get(pid);
      readyProgram.status = "ready";
      this.readyQueue.enqueue(readyProgram);

      const requestedWillExecute =
        this.readyQueue.peek().pid === pid && !_CPU.isExecuting;
      _CPU.isExecuting = true;
      return requestedWillExecute;
    }
  }
}
