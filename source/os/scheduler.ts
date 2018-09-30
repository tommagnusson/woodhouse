import ProcessControlBlock from "./processControlBlock";

export default class Scheduler {
  readonly readyQueue: Array<ProcessControlBlock> = [];
  constructor() {}

  public pushReadyProgram(pcb: ProcessControlBlock) {
    this.readyQueue.push(pcb);
  }
}
