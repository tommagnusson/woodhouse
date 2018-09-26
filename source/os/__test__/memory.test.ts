import "jest";
import Memory from "../../host/memory";

describe("Memory", () => {
  let mem: Memory;

  beforeEach(() => {
    mem = new Memory();
  });

  test("is initialized with 255 `00` values", () => {
    const start = mem.read(0, 0);
    expect(start).toEqual("00");
    expect(() => {
      mem.read(0, 256);
    }).toThrowError();
  });
  test("read works", () => {
    expect(() => {
      const start = mem.read(0, 0);
    }).not.toThrow();
  });

  test("read checks bounds", () => {
    expect(() => {
      const invalidSegment = mem.read(1, 0);
    }).toThrowError();

    expect(() => {
      const invalidLocation = mem.read(0, 256);
    }).toThrowError();
  });

  test("write works", () => {
    const value = "A0";
    mem.write(0, 0, value);
    expect(mem.read(0, 0)).toEqual(value);
  });

  test("write checks bounds", () => {
    expect(() => {
      const invalidSegment = mem.write(1, 0, "FF");
    }).toThrowError();

    expect(() => {
      const invalidLocation = mem.write(0, -1, "FF");
    }).toThrowError();
  });
});
