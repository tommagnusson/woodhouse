///<reference path="./processControlBlock.ts"/>
///<reference path="./queue.ts"/>
///<reference path="./roundRobinSchedule.ts"/>

namespace TSOS {
  export class Scheduler {
    readonly terminatedQueue: Queue<ProcessControlBlock> = new Queue();
    readonly readyQueue: Queue<ProcessControlBlock> = new Queue();

    readonly residentMap: Map<number, ProcessControlBlock> = new Map();
    public executing: ProcessControlBlock = null;

    public scheduleType = new RoundRobinSchedule();

    constructor() {}

    public requestGracefulTermination(): boolean {
      this.terminatedQueue.enqueue(this.executing);
      this.executing.status = 'terminated';
      this.executing = null;
      _CPU.isExecuting = false;
      return this.executing === null;
    }

    public requestResidency(program: string): ProcessControlBlock {
      const process = _MemoryGuardian.load(program);
      process.status = 'resident';
      this.residentMap.set(process.pid, process);
      return process;
    }

    public hasNext(): boolean {
      // !! casts to boolean
      return !!(this.executing || this.readyQueue.peek());
    }

    public next() {
      let didBreakProgram = false;
      if (!this.executing) {
        didBreakProgram = true;
        this.readyToExecuting();
        if (this.executing === null) {
          return null;
        }
      }

      // both the scheduling algorithm dictates it,
      // and we would be switching to a different process
      const shouldContextSwitch =
        this.scheduleType.shouldContextSwitch(this.executing.pid) &&
        !this.readyQueue.isEmpty();

      if (shouldContextSwitch) {
        this.contextSwitch(_CPU);
      }
      return {
        executing: this.executing,
        shouldDeserializePCB: shouldContextSwitch || didBreakProgram
      };
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
      process.status = 'ready';
      return process;
    }

    private contextSwitch(cpu: Cpu) {
      // serialize executing
      this.executing.serialize(cpu);
      // put it back onto the ready q
      this.readyQueue.enqueue(this.executing);
      // readyToExecuting
      this.readyToExecuting();
    }

    // executing union ready
    public getActiveProcesses(): ProcessControlBlock[] {
      return [...[this.executing].filter(pcb => pcb), ...this.readyQueue.q];
    }

    private readyToExecuting(): ProcessControlBlock {
      if (this.readyQueue.isEmpty()) {
        return null;
      }
      this.executing = this.readyQueue.dequeue();
      this.executing.status = 'running';
      return this.executing;
    }
  }
}
