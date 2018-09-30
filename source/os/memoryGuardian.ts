import Memory from "../host/memory";
import Segment from "./segment";
import ProcessControlBlock from "./processControlBlock";

// it's a memory manager, but cooler
export default class MemoryGuardian {
  static readonly NUM_SEGMENTS = 1;
  private memory: Memory;

  private currentPID = 1;
  public processes: Map<number, ProcessControlBlock> = new Map();
  public segmentToIsOccupied: Map<Segment, boolean> = new Map();
  public segments: Array<Segment> = [];

  constructor(memory: Memory) {
    this.memory = memory;
    const segmentSize = this.memory.sizeInBytes / MemoryGuardian.NUM_SEGMENTS;
    // compute the base and limit for each segment
    // This is fixed-size allocation
    for (let i = 0; i < MemoryGuardian.NUM_SEGMENTS; i++) {
      const base = i * segmentSize;
      const limit = base + segmentSize - 1;
      const newSegment = new Segment(base.toString(16), limit.toString(16));
      this.segments.push(newSegment);
      this.segmentToIsOccupied.set(newSegment, false);
    }
  }

  public load(program: string): number {
    const parsedProgram = MemoryGuardian.parseProgram(program);

    // find the first available segment from memory
    const firstAvailableSegment = Array.from(
      this.segmentToIsOccupied.keys()
    ).find(segment => !this.segmentToIsOccupied.get(segment));

    if (firstAvailableSegment === undefined) {
      throw new Error(`There is not enough memory to load a new program.`);
    }

    // write it into memory
    const base = parseInt(firstAvailableSegment.base, 16);
    const limit = parseInt(firstAvailableSegment.limit, 16);
    for (let i = base; i < limit + 1; i++) {
      this.memory.write(i.toString(16), parsedProgram[i]);
    }

    // mark the segment as occupied
    this.segmentToIsOccupied.set(firstAvailableSegment, true);

    // map the PID to the PCB
    this.processes.set(
      this.currentPID,
      new ProcessControlBlock(this.currentPID, firstAvailableSegment)
    );

    return this.currentPID++;
  }

  public read(location: string): string {
    return this.memory.read(location);
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
