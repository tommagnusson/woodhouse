///<reference path="./processControlBlock.ts"/>
///<reference path="./queue.ts"/>
///<reference path="./roundRobinSchedule.ts"/>

namespace TSOS {
  export class Scheduler {
    readonly terminatedQueue: Queue<ProcessControlBlock> = new Queue();
    readonly readyQueue: PriorityQueue<
      ProcessControlBlock
    > = new PriorityQueue();

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

    private nextPID = 0;

    public requestResidency(
      program: string,
      priority: number
    ): ProcessControlBlock {
      const process = _MemoryGuardian.isFull()
        ? _krnFileSystemDriver.load(program, this.nextPID++)
        : _MemoryGuardian.load(program, this.nextPID++);
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
      // todo: maybe optimize, requires resort every clock cycle...
      this.readyQueue.setShouldPrioritize(
        this.scheduleType.activeType === 'priority'
      );
      if (!this.executing) {
        this.readyToExecuting();
        if (this.executing === null) {
          return null;
        }
      }
      return this.executing;
    }

    public requestCPUExecution(pid: number): boolean {
      // check both memory and disk

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

    // should automatically roll disk <-> memory
    private readyToExecuting(): ProcessControlBlock {
      if (this.readyQueue.isEmpty()) {
        return null;
      }
      this.executing = this.readyQueue.dequeue();
      this.executing.status = 'running';

      if (this.executing.location === 'disk') {
        // we need to get it into memory somehow...
        // check available space in memory...
        if (_MemoryGuardian.isFull()) {
          // find first pcb not on disk starting from end of ready q (to avoid constant rolls)...
          let candidate: ProcessControlBlock = undefined;

          for (let i = this.readyQueue.q.length - 1; i >= 0; i--) {
            console.log(this.readyQueue);
            if (this.readyQueue.q[i].location === 'memory') {
              candidate = this.readyQueue.q[i];
              break;
            }
          }
          // notice "victim" vs "candidate" :)
          // roll out from memory onto disk
          const { victim, program } = _MemoryGuardian.dequeDiskCandidate(
            candidate
          );
          _krnFileSystemDriver._load(program, victim);
        }
        // roll into memory
        const contents = _krnFileSystemDriver.deleteSwap(this.executing.pid);
        _MemoryGuardian.loadFromPCB(this.executing, contents);
      }
      return this.executing;
    }
  }
}
