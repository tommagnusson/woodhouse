import "jest";
import MemoryGuardian from "../memoryGuardian";

describe("memory guardian", () => {
  test("parses a valid program", () => {
    const validProgram = `A9 A9 A2 01 EC 13 00 AC 0B 00 8D 14 00 EE 0B 00 
     D0 F5 00 00`;
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
});
