///<reference path="../globals.ts" />
///<reference path="deviceDriver.ts" />
///<reference path="../host/Disk.ts" />

namespace TSOS {
  // A block terminates a linked list of pointers if it points to itself
  export class FileSystemDeviceDriver extends DeviceDriver {
    private isFormatted: boolean = false;

    private checkFormatted(): boolean {
      if (!this.isFormatted) {
        _StdOut.putText(
          `Looks like the disk is not formatted yet. Please use 'format' to do so.`
        );
      }
      return this.isFormatted;
    }

    // (0,0,0) is the master boot record
    constructor(
      readonly disk: Disk,
      readonly numTracks: number = 3,
      readonly numSectors: number = 8,
      readonly numBlocks: number = 8
    ) {
      super();
    }

    public isValidLocation(location: DiskLocation): boolean {
      return (
        location.track < this.numTracks &&
        location.sector < this.numSectors &&
        location.block < this.numBlocks
      );
    }

    isr(params: any[]) {
      const [fsIRQ, ...fsParams] = params;
      // mini interrupt vector to support driver operations
      const fsInterrupts = {
        [FileSystemInterrupts.FORMAT]: () => {
          this.onFormat(fsParams);
        },
        [FileSystemInterrupts.CREATE]: () => {
          this.onCreate(fsParams);
        }
      };
      const maybeFn = fsInterrupts[fsIRQ];
      if (maybeFn) {
        maybeFn();
      } else {
        _Kernel.krnTrapError(
          `Invalid File System Interrupt Request. fsirq=${fsIRQ} params=[${fsParams}]`
        );
      }
    }

    private onFormat(params: any[]) {
      this.format();
      _StdOut.putText(`Formatted disk.`);
    }

    private onCreate(params: any[]) {
      if (!this.checkFormatted()) {
        return;
      }
      _StdOut.putText(`Creating file ${params[0]}...`);
      this.createFile(params[0]);
      _StdOut.putText(`Created file ${params[0]}.`);
    }

    private createFile(filename: string) {
      const available = this.availableLocations.shift();
      if (!available.reset()) {
        throw new Error(
          `Tried to reset the contents of an "available" block: ${available}`
        );
      }
      available.setState(BlockState.OCCUPIED);
      available.setStringContent(filename);
      this.writeRaw(available);
    }

    driverEntry() {
      this.status = 'initialized';
      this.findAvailableBlocks();
    }

    private findAvailableBlocks(): FileSystemBlock[] {
      this.availableLocations = this.disk
        .allLocationsAndContents()
        .map(kv => FileSystemBlock.deserialize(kv.location, kv.contents))
        .filter(b => b.getState() === BlockState.AVAILABLE)
        .filter(b => !b.location.equals(new DiskLocation(0, 0, 0))); // ignore boot block
      return this.availableLocations;
    }

    private availableLocations: FileSystemBlock[];

    format() {
      // todo mark empty locations
      _.range(this.numTracks).forEach(t =>
        _.range(this.numSectors).forEach(s =>
          _.range(this.numBlocks).forEach(b => {
            this.writeRaw(new FileSystemBlock(new DiskLocation(t, s, b)));
          })
        )
      );
      this.findAvailableBlocks();
      this.isFormatted = true;
    }
    writeRaw(block: FileSystemBlock): void {
      this.disk.write(block.location, block.serialize());
    }
  }

  // === BEGIN FILE SYSTEM BLOCK ===

  export class FileSystemBlock {
    private state: BlockState = BlockState.AVAILABLE;

    private pointer: DiskLocation; // if pointer == location, then it's the terminus of a file
    private byteContents: string;

    static DEFAULT_CONTENTS = '0'.repeat(60);

    constructor(
      readonly location: DiskLocation,
      byteContents?: string,
      pointer?: DiskLocation
    ) {
      const isValidLocation = _krnFileSystemDriver.isValidLocation(location);
      const isValidPointer = pointer
        ? _krnFileSystemDriver.isValidLocation(pointer)
        : isValidLocation;
      if (!(isValidLocation && isValidPointer)) {
        throw new Error(
          `Invalid location or pointer. Location ${location.toString()}, pointer ${pointer.toString()}`
        );
      }

      this.state = byteContents ? BlockState.OCCUPIED : BlockState.AVAILABLE;
      this.byteContents = this.pad(
        byteContents || FileSystemBlock.DEFAULT_CONTENTS
      );
      this.pointer = pointer || this.location;
    }

    private pad(byteContents: string): string {
      if (byteContents.length > 60) {
        throw new Error(
          `Found byte contents with length greater than 60: ${byteContents}`
        );
      }
      const nToEnd = 60 - byteContents.length;
      return byteContents.concat('0'.repeat(nToEnd));
    }

    public setState(state: BlockState): void {
      this.state = state;
    }

    public getState(): BlockState {
      return this.state;
    }

    public static stringToCharHex(s: string): string {
      return s
        .split('')
        .map(s => s.charCodeAt(0).toString(16))
        .join('');
    }

    public static charHexToString(charHex: string): string {
      return _.chunk(charHex.split(''), 2)
        .map(([a, b]) => String.fromCharCode(parseInt(a.concat(b), 16)))
        .join('');
    }

    // replaces the content of the bytes
    public setStringContent(stringContent: string) {
      this.byteContents = this.pad(
        FileSystemBlock.stringToCharHex(stringContent)
      );
    }

    // replaces the contents of the bytes
    public setHexByteContent(byteContent: string) {
      this.byteContents = this.pad(byteContent);
    }

    public reset(): boolean {
      if (this.state === BlockState.AVAILABLE) {
        this.byteContents = FileSystemBlock.DEFAULT_CONTENTS;
        this.pointer = this.location;
        return true;
      }
      return false;
    }

    // this string should be ready to be written to disk
    public serialize(): string {
      return this.state
        .toString()
        .concat(this.pointer.toByteString())
        .concat(this.byteContents);
    }

    // this string should be the raw bytes from disk
    public static deserialize(
      rawLocation: string,
      rawContentBytes: string
    ): FileSystemBlock {
      // NOTE: try "000".split('').map(parseInt) in Chrome console... see what happens!
      const tsb = rawLocation.split('').map(n => parseInt(n));
      const location = new DiskLocation(tsb[0], tsb[1], tsb[2]);
      // A BCD EE...
      // A - state byte
      // BCD, track sector block respectively corresponding to a pointer to the next block
      // EE... the actual content bytes (60)
      if (rawContentBytes.length != 64) {
        throw new Error(
          `Found raw content bytes whose length is not 64: ${rawContentBytes}`
        );
      }
      // oooooohhhhhh so sexy, array destructuring coming in HOT
      const [state, track, sector, block, ...content] = rawContentBytes.split(
        ''
      );

      const newBlock = new FileSystemBlock(
        location,
        content.join(''),
        new DiskLocation(parseInt(track), parseInt(sector), parseInt(block))
      );
      const parseBlockState = (rawState: string) =>
        parseInt(rawState) === 1 ? BlockState.OCCUPIED : BlockState.AVAILABLE;
      const blockState = parseBlockState(state);
      newBlock.state = blockState;
      return newBlock;
    }

    public isFileTerminus(): boolean {
      return this.location.toByteString() === this.pointer.toByteString();
    }
  }

  export enum FileSystemInterrupts {
    FORMAT,
    CREATE
  }

  export enum BlockState {
    AVAILABLE = 0,
    OCCUPIED = 1
  }
}
