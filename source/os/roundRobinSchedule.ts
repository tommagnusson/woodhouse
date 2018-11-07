///<reference path="./processControlBlock.ts"/>
///<reference path="./queue.ts"/>

namespace TSOS {
  export class RoundRobinSchedule {
    static quantum = 6;
    private currentQuantum = 0;
    private lastPidExecuted = null;

    constructor() {}

    public didCycle(pid: number) {
      if (this.lastPidExecuted === pid) {
        this.currentQuantum++;
      }
      this.lastPidExecuted = pid;
    }

    public didContextSwitch() {
      this.currentQuantum = 0;
    }

    public shouldContextSwitch(): boolean {
      return this.currentQuantum === RoundRobinSchedule.quantum;
    }
  }
}
