import Memory from "../host/memory";
import ProcessControlBlock from "./processControlBlock";

// it's a memory manager, but cooler
export default class MemoryGuardian {
  private memory: Memory;

  private currentPID = 0;
  private activeProcesses: Array<ProcessControlBlock> = [];

  constructor(memory: Memory) {
    this.memory = memory;
  }

  // TODO: create Process Control Block
  public load(program: string): number {
    const parsedProgram = MemoryGuardian.parseProgram(program);

    // prepares it for passage to the memory...

    // write it into memory
    for (let i = 0; i < parsedProgram.length; i++) {
      this.memory.write(i.toString(16), parsedProgram[i]);
    }

    // TODO: dynamic segment allocation (change the segment 0 to dynamic)
    this.activeProcesses.push(new ProcessControlBlock(this.currentPID, 0));

    return this.currentPID++;
  }

  // converts a valid program to an array of hex strings
  public static parseProgram(program: string): Array<string> {
    // strip whitespace
    program = program.replace(/\s/g, "");

    const hexes = [];

    // pushes pairs of two chars into hexes
    for (let i = 0; i < program.length; i += 2) {
      hexes.push(program.charAt(i) + program.charAt(i + 1));
    }
    return hexes;
  }
}
