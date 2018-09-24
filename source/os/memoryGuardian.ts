import Memory from "../host/memory";

// it's a memory manager, but cooler
export default class MemoryGuardian {
  private memory: Memory;

  private currentPID = 0;
  private pidToSegment: Map<number, number> = new Map();

  // TODO: create Process Control Block
  public load(program: string): number {
    const parsedProgram = this.parseProgram(program);

    // prepares it for passage to the memory haha...
    const rawProgram = parsedProgram.map(hex => parseInt(hex, 16));

    // write it into memory
    for (let i = 0; i < rawProgram.length; i++) {
      this.memory.write(0, i, rawProgram[i]);
    }

    // TODO: dynamic segment allocation
    this.pidToSegment.set(this.currentPID, 0);

    return this.currentPID++;
  }

  private parseProgram(program: string): Array<string> {
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
