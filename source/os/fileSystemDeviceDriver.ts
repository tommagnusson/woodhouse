///<reference path="../globals.ts" />
///<reference path="deviceDriver.ts" />
///<reference path="../host/Disk.ts" />

namespace TSOS {
  // A block terminates a linked list of pointers if it points to itself
  export class FileSystemDeviceDriver extends DeviceDriver {
    // (0,0,0) is the master boot record
    // (0,0,1-7) are reserved for file names
    constructor(
      readonly disk: Disk,
      readonly numTracks: number = 3,
      readonly numSectors: number = 4,
      readonly numBlocks: number = 8
    ) {
      super();
      // todo: mark all the empty locations...
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

    driverEntry() {
      this.status = 'initialized';
    }
    format() {
      const zeros = (0).toString().repeat(60);
      for (let t = 0; t < this.numTracks; t++) {
        for (let s = 0; s < this.numSectors; s++) {
          for (let b = 0; b < this.numBlocks; b++) {
            const location = new DiskLocation(t, s, b);
            this.disk.write(
              location,
              location
                .toByteString()
                .concat(BlockState.AVAILABLE.toString().concat(zeros))
            );
          }
        }
      }
    }
    writeRaw(
      track: number,
      sector: number,
      block: number,
      byteContents: string
    ): void {
      const blocksRequired = Math.ceil(byteContents.length / 60);

      // blocksRequired groups of byte contents to be written over that many blocks...
      const chunkedByteContents = _.chunk(
        byteContents.split(``),
        blocksRequired
      );
      chunkedByteContents.forEach(chunk => {
        this.disk.write(new DiskLocation(track, sector, block), byteContents);
      });
    }
  }

  export class FileSystemBlock {
    public state: BlockState = BlockState.AVAILABLE;

    public pointer: DiskLocation; // if pointer == location, then it's the terminus of a file

    static DEFAULT_CONTENTS = '0'.repeat(60);

    constructor(
      readonly location: DiskLocation,
      public byteContents?: string,
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
      return this.byteContents.concat('0'.repeat(nToEnd));
    }

    // this string should be ready to be written to disk
    public serialize(): string {
      return this.state
        .toString()
        .concat(this.pointer.toByteString())
        .concat(this.byteContents);
    }

    public isFileTerminus(): boolean {
      return this.location.toByteString() === this.pointer.toByteString();
    }
  }

  export enum FileSystemInterrupts {
    FORMAT
  }

  export enum BlockState {
    AVAILABLE = 0,
    OCCUPIED = 1
  }
}
