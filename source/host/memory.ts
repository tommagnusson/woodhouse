namespace TSOS {
  export class Memory {
    private raw: Array<string> = [];

    public constructor(public readonly sizeInBytes = (256 * 3)) {
      for (let i = 0; i < sizeInBytes; i++) {
        this.raw[i] = "00";
      }
    }

    // used for GUI updates and logging
    // this IS purely a classroom assignment, after all
    public dangerouslyExposeRaw(): Array<string> {
      return this.raw;
    }

    public read(location: string): string {
      this.checkBounds(location);
      return this.raw[parseInt(location, 16)];
    }

    public write(location: string, value: string) {
      this.checkBounds(location);
      if (value.length == 1) {
        value = `0${value}`;
      }
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
