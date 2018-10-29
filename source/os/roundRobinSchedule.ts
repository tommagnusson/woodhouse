///<reference path="./processControlBlock.ts"/>
///<reference path="./queue.ts"/>

namespace TSOS {
  export class RoundRobinSchedule {
    static quantum = 6;
    private currentQuantum = 0;
    private lastPidExecuted = null;

    constructor() {}

    public shouldContextSwitch(pid: number): boolean {
      if (this.lastPidExecuted === pid) {
        this.currentQuantum++;
      }
      const shouldSwitch = this.currentQuantum === RoundRobinSchedule.quantum;
      this.lastPidExecuted = pid;
      if (shouldSwitch) {
        this.currentQuantum = 0;
      }
      return shouldSwitch;
    }
  }
}
