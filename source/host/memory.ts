export default class Memory {
  // Each segment has 256 bytes of space
  // creates just one segment for now
  constructor(private raw: Array<Array<number>> = [[].fill(0, 0, 255)]) {}

  // TODO: add bounds checking

  public read(segment: number, location: number): number {
    return this.raw[segment][location];
  }

  public write(segment: number, location: number, value: number) {
    this.raw[segment][location] = value;
    return value;
  }
}
