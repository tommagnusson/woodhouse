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
      if (this.residentToReady(pid) === null) {
        return false;
      }
      _CPU.isExecuting = true;
      return true;
    }

    private residentToReady(pid: number): ProcessControlBlock {
      // transfer from resident map to ready queue
      if (!this.residentMap.has(pid)) {
        return null;
      }
      const process = this.residentMap.get(pid);
      this.residentMap.delete(pid);
      this.readyQueue.enqueue(process);
      return process;
    }
  }
}
