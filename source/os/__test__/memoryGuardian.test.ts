import "jest";
import MemoryGuardian from "../memoryGuardian";
import Memory from "../../host/memory";
import Segment from "../segment";
import ProcessControlBlock from "../processControlBlock";

describe("memory guardian", () => {
  const validProgram = `A9 A9 A2 01 EC 13 00 AC 0B 00 8D 14 00 EE 0B 00 
     D0 F5 00 00`;

  let mem;
  let guardian;

  beforeEach(() => {
    mem = new Memory(256);
    guardian = new MemoryGuardian(mem);
  });

  test("parses a valid program", () => {
    const result = MemoryGuardian.parseProgram(validProgram);
    expect(result).toEqual([
      "A9",
      "A9",
      "A2",
      "01",
      "EC",
      "13",
      "00",
      "AC",
      "0B",
      "00",
      "8D",
      "14",
      "00",
      "EE",
      "0B",
      "00",
      "D0",
      "F5",
      "00",
      "00"
    ]);
  });

  test("creates segments appropriately", () => {
    const expectedSegment = new Segment("0", "ff");

    // creates a new segment
    expect(guardian.segments).toEqual([expectedSegment]);

    // marks that segment as available
    expect(guardian.segmentToIsOccupied.get(guardian.segments[0])).toEqual(
      false
    );
  });
  test("loads a program", () => {
    const pid = guardian.load(validProgram);
    expect(pid).toEqual(1);

    // program is written to memory
    expect(mem.read("0")).toEqual("A9");
    expect(mem.read((17).toString(16))).toEqual("F5");

    // segment is marked occupied
    expect(guardian.segmentToIsOccupied.get(guardian.segments[0])).toEqual(
      true
    );
    // created a process control block
    expect(guardian.processes.get(pid)).toEqual(
      new ProcessControlBlock(pid, guardian.segments[0])
    );
  });

  test("throws when no more memory", () => {
    guardian.load(validProgram);
    expect(() => {
      guardian.load(validProgram);
    }).toThrowError();
  });
});
