export default class Memory {
  // Each segment has 256 bytes of space
  // creates just one segment for now
  constructor(private raw: Array<Array<string>> = [[].fill("00", 0, 255)]) {}

  // TODO: add bounds checking

  public read(segment: number, location: number): string {
    return this.raw[segment][location];
  }

  public write(segment: number, location: number, value: string) {
    this.raw[segment][location] = value;
    return value;
  }
}
