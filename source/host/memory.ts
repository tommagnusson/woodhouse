export default class Memory {
  public static SIZE_BYTES = 256;

  constructor(private raw: Array<string> = []) {
    if (raw.length !== 0) {
      for (let i = 0; i < Memory.SIZE_BYTES; i++) {
        this.raw[i] = "00";
      }
    }
  }

  public read(location: string): string {
    this.checkBounds(location);
    return this.raw[parseInt(location, 16)];
  }

  public write(location: string, value: string) {
    this.checkBounds(location);
    this.raw[parseInt(location, 16)] = value;
    return value;
  }

  private checkBounds(location: string) {
    const decLocation = parseInt(location, 16);
    if (decLocation >= Memory.SIZE_BYTES || decLocation < 0) {
      throw new Error(`Location ${location} (${decLocation}) does not exist.`);
    }
  }
}
