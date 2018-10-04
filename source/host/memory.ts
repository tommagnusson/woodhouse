namespace TSOS {
  export class Memory {
    private raw: Array<string> = [];

    public constructor(public readonly sizeInBytes = 256) {
      for (let i = 0; i < sizeInBytes; i++) {
        this.raw[i] = "00";
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
      if (decLocation >= this.sizeInBytes || decLocation < 0) {
        throw new Error(
          `Location ${location} (${decLocation}) does not exist.`
        );
      }
    }
  }
}
