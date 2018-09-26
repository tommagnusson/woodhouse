import "jest";
import Memory from "../../host/memory";

describe("Memory", () => {
  let mem: Memory;

  beforeEach(() => {
    mem = new Memory();
  });

  test("is initialized with 256 `00` values", () => {
    const start = mem.read("00");
    expect(start).toEqual("00");
    const end = mem.read("FF");
    expect(end).toEqual("00");
    expect(() => {
      // 256
      mem.read("0100");
    }).toThrowError();
  });
  test("read works", () => {
    expect(() => {
      const start = mem.read("00");
    }).not.toThrow();
  });

  test("read checks bounds", () => {
    expect(() => {
      // location 256
      const invalidLocation = mem.read("0100");
    }).toThrowError();
  });

  test("write works", () => {
    const value = "A0";
    mem.write("00", value);
    expect(mem.read("00")).toEqual(value);
  });

  test("write checks bounds", () => {
    expect(() => {
      const invalidLocation = mem.write("0102", "FF");
    }).toThrowError();
  });
});
