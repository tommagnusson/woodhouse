import "jest";
import MemoryGuardian from "../memoryGuardian";
import Memory from "../../host/memory";
import Segment from "../segment";

describe("memory guardian", () => {
  const validProgram = `A9 A9 A2 01 EC 13 00 AC 0B 00 8D 14 00 EE 0B 00 
     D0 F5 00 00`;
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
    const mem = new Memory(256);
    const guardian = new MemoryGuardian(mem);
    expect(guardian.segments).toEqual([new Segment("0", "ff")]);
  });
});
