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

    public updateStats() {
      this.readyQueue.q.forEach(p => p.cyclesInReady++);
      this.executing.cyclesExecuting++;
    }

    public requestGracefulTermination(pid): boolean {
      const terminatedProcess = this.getActiveProcesses().find(
        p => p.pid === parseInt(pid)
      );
      this.terminatedQueue.enqueue(terminatedProcess);
      terminatedProcess.status = 'terminated';
      if (this.readyQueue.q.some(p => p.pid === terminatedProcess.pid)) {
        this.readyQueue.q = this.readyQueue.q.filter(
          p => p.pid !== terminatedProcess.pid
        );
      } else {
        // must be the executing one
        this.executing = null;
      }
      _CPU.isExecuting = false;
      return true;
    }

    public requestResidency(
      program: string,
      priority: number
    ): ProcessControlBlock {
      const process = _MemoryGuardian.load(program);
      process.status = 'resident';
      process.priority = priority;
      this.residentMap.set(process.pid, process);
      return process;
    }

    public hasNext(): boolean {
      // !! casts to boolean
      return !!(this.executing || this.readyQueue.peek());
    }

    public next() {
      if (!this.executing) {
        this.readyToExecuting();
        if (this.executing === null) {
          return null;
        }
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
      process.status = 'ready';
      return process;
    }

    // returns true if actually context switched, false otherwise
    public contextSwitch(cpu: Cpu) {
      if (this.readyQueue.isEmpty()) {
        _Kernel.krnTrace(`Tried to context switch to an empty ready queue.`);
        return;
      }
      _Kernel.krnTrace(
        `Context switching from process ${
          this.executing ? this.executing.pid : `none`
        } to ${this.readyQueue.peek().pid}`
      );

      // a program naturally ended or got killed
      if (!this.executing) {
        this.readyToExecuting();
        cpu.deserialize(this.executing);
        return;
      }

      // serialize executing
      this.executing.serialize(cpu);
      // put it back onto the ready q
      this.readyQueue.enqueue(this.executing);
      // readyToExecuting
      this.readyToExecuting();
      if (this.executing) {
        cpu.deserialize(this.executing);
      }
      return;
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
