///<reference path="../host/memory.ts" />
///<reference path="./segment.ts" />
///<reference path="./processControlBlock.ts"/>

namespace TSOS {
  // it's a memory manager, but cooler
  export class MemoryGuardian {
    static readonly NUM_SEGMENTS = 3;

    public processes: Map<number, ProcessControlBlock> = new Map();
    public segmentToIsOccupied: Map<Segment, boolean> = new Map();
    public segments: Array<Segment> = [];

    constructor(private memory: Memory) {
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

    public isFull(): boolean {
      return Array.from(this.segmentToIsOccupied.values()).every(
        isOccupied => isOccupied
      );
    }

    public loadFromPCB(
      process: ProcessControlBlock,
      program: string
    ): ProcessControlBlock {
      if (this.isFull()) {
        throw new Error(
          `Tried to load process ${
            process.pid
          } into memory but there wasn't room.`
        );
      }
      const segment = this._load(MemoryGuardian.parseProgram(program));
      process.occupiedSegment = segment;
      process.location = 'memory';
      return process;
    }

    public evacuate(process?: ProcessControlBlock) {
      const processesToEvacuate: Array<ProcessControlBlock> = process
        ? [process]
        : Array.from(this.processes.values());

      for (let p of processesToEvacuate) {
        const base = p.occupiedSegment.base;
        const limit = p.occupiedSegment.limit;

        for (let i = parseInt(base, 16); i <= parseInt(limit, 16); i++) {
          _Memory.write(i.toString(16), '00');
        }
        Control.displayMemory(this.memory.dangerouslyExposeRaw());
        this.segmentToIsOccupied.set(p.occupiedSegment, false);
        this.processes.delete(p.pid);
      }
    }

    // picks the next "candidate" to remove from memory
    public dequeDiskCandidate(
      candidate: ProcessControlBlock
    ): { victim: ProcessControlBlock; program: string } {
      const actualCandidate = this.processes.get(candidate.pid);
      if (!actualCandidate) {
        console.log(this);
        throw new Error(
          `Tried to deque a disk candidate with pid ${
            candidate.pid
          } that is not in memory.`
        );
      }
      const program = this.getProgram(actualCandidate.occupiedSegment);
      // free its segment..
      this.segmentToIsOccupied.set(actualCandidate.occupiedSegment, false);
      actualCandidate.occupiedSegment = null;
      actualCandidate.location = undefined; // TODO: maybe bites me?
      this.processes.delete(actualCandidate.pid);

      return { victim: actualCandidate, program };
    }

    // reads a program out of memory
    private getProgram(segment: Segment): string {
      let program = '';
      for (let i = parseInt(segment.base); i < parseInt(segment.limit); i++) {
        program.concat(this.read(i.toString(16)));
      }
      return program;
    }

    private _load(parsedProgram: string[]) {
      // find the first available segment from memory
      const firstAvailableSegment = Array.from(
        this.segmentToIsOccupied.keys()
      ).find(segment => !this.segmentToIsOccupied.get(segment));
      console.log('first available', firstAvailableSegment);

      if (firstAvailableSegment === undefined) {
        throw new Error(`There is not enough memory to load a new program.`);
      }

      // write it into memory
      const base = parseInt(firstAvailableSegment.base, 16);
      const limit = parseInt(firstAvailableSegment.limit, 16);
      for (let p = 0, i = base; i < limit + 1; i++, p++) {
        let nextByte = parsedProgram[p];
        if (nextByte === undefined) {
          break; // end of program input
        }
        this.memory.write(i.toString(16), nextByte);
      }
      Control.displayMemory(this.memory.dangerouslyExposeRaw());
      // mark the segment as occupied
      this.segmentToIsOccupied.set(firstAvailableSegment, true);
      return firstAvailableSegment;
    }

    public load(program: string, pid: number): ProcessControlBlock {
      const parsedProgram = MemoryGuardian.parseProgram(program);

      const firstAvailableSegment = this._load(parsedProgram);

      // map the PID to the PCB
      const newProcess = new ProcessControlBlock(pid, firstAvailableSegment);
      this.processes.set(pid, newProcess);
      return newProcess;
    }

    private logicalToPhysical(relativeLocation: string): string {
      return (
        parseInt(_Scheduler.executing.occupiedSegment.base, 16) +
        parseInt(relativeLocation, 16)
      ).toString(16);
    }

    // read using logical addressing --> physical addressing
    public readL(relativeLocation: string): string {
      const physicalAddress = this.logicalToPhysical(relativeLocation);
      return this.read(physicalAddress);
    }
    // read using logical addressing and return a number
    public readLInt(relativeLocation: string): number {
      return parseInt(this.readL(relativeLocation), 16);
    }

    public readInt(location: string): number {
      return parseInt(this.read(location), 16);
    }

    public read(location: string): string {
      this.checkSegmentBounds(_Scheduler.executing.occupiedSegment, location);
      return this.memory.read(location);
    }

    public writeL(relativeLocation: string, value: string) {
      const physicalAddress = this.logicalToPhysical(relativeLocation);
      return this.write(physicalAddress, value);
    }

    public write(location: string, value: string) {
      this.checkSegmentBounds(_Scheduler.executing.occupiedSegment, location);
      this.memory.write(location, value);
    }

    private checkSegmentBounds(s: Segment, attemptedLocation) {
      this.checkBounds(s.base, s.limit, attemptedLocation);
    }

    private checkBounds(
      base: string,
      limit: string,
      attemptedLocation: string
    ) {
      // base <= attemptedLocation <= limit
      const baseNum = parseInt(base, 16);
      const limitNum = parseInt(limit, 16);
      const attemptedLocationNum = parseInt(attemptedLocation, 16);
      if (baseNum > attemptedLocationNum || limitNum < attemptedLocationNum) {
        throw new Error(
          `Process ${
            _Scheduler.executing.pid
          } attempted to access memory address ${attemptedLocation}, which is out of its segment.`
        );
      }
    }

    // converts a valid program to an array of hex strings
    public static parseProgram(program: string): Array<string> {
      // strip whitespace
      program = program.replace(/\s/g, '');

      const hexes = [];

      // pushes pairs of two chars into hexes
      for (let i = 0; i < program.length; i += 2) {
        hexes.push(program.charAt(i) + program.charAt(i + 1));
      }
      return hexes;
    }
  }
}
