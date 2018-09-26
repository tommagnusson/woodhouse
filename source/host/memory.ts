export default class Memory {
  // Each segment has 256 bytes of space
  // creates just one segment for now
  constructor(private raw: Array<Array<string>> = [[]]) {
    for (let s = 0; s < raw.length; s++) {
      this.raw[s] = [];
      for (let i = 0; i < 256; i++) {
        this.raw[s][i] = "00";
      }
    }
  }

  // TODO: add bounds checking

  public read(segment: number, location: number): string {
    this.checkBounds(segment, location);
    return this.raw[segment][location];
  }

  public write(segment: number, location: number, value: string) {
    this.checkBounds(segment, location);
    this.raw[segment][location] = value;
    return value;
  }

  private checkBounds(segment: number, location: number) {
    if (segment >= this.raw.length || segment < 0) {
      throw new Error(`Invalid segment access: ${segment}`);
    }
    if (location >= this.raw[segment].length || location < 0) {
      throw new Error(
        `Location ${location} in segment ${segment} is out of bounds.`
      );
    }
  }
}
