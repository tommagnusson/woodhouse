namespace TSOS {
  export class Disk {
    // represents a disk... you know, like for a hard drive.

    public read(location: DiskLocation) {
      return sessionStorage.getItem(location.toString());
    }

    public write(location: DiskLocation, value: string) {
      this.checkValueLength(value);
      sessionStorage.setItem(location.toString(), value);
    }

    private checkValueLength(value: string) {
      if (value.length > 64) {
        throw new Error(
          `The disk tried to write a value longer than 64: ${value}`
        );
      }
    }
    public allLocationsAndContents(): { location: string; contents: string }[] {
      const locations = Object.keys(sessionStorage);

      // return (location, contents of that location)
      return locations.map(l => ({
        location: l,
        contents: sessionStorage.getItem(l)
      }));
    }
  }

  export class DiskLocation {
    constructor(
      readonly track: number,
      readonly sector: number,
      readonly block: number
    ) {}

    public toByteString(): string {
      return [this.track, this.sector, this.block]
        .map(i => i.toString())
        .join('');
    }

    public toString(): string {
      return (
        '(' +
        [this.track, this.sector, this.block].map(i => i.toString()).join(',') +
        ')'
      );
    }
  }
}
