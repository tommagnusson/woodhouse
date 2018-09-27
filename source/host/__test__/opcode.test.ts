import "jest";
import OpCode from "../opcode";

describe("opcode", () => {
  test("correctly constructs", () => {
    const op = new OpCode("A9");
    expect(op.hex).toEqual("A9");
    expect(op.mnemonic).toEqual("LDA");
    expect(op.numArgs).toEqual(1);
  });
  test("throws on an unknown opcode", () => {
    expect(() => {
      const op = new OpCode("unknown");
    }).toThrowError(`Unknown opcode: UNKNOWN`);
  });
});
