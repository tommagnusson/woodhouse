///<reference path="../globals.ts" />
///<reference path="deviceDriver.ts" />
///<reference path="../host/Disk.ts" />

namespace TSOS {
  export class FileSystemDeviceDriver extends DeviceDriver {
    constructor(
      readonly disk: Disk,
      readonly numTracks: number = 3,
      readonly numSectors: number = 4,
      readonly numBlocks: number = 8
    ) {
      super();
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
            this.disk.write(
              new DiskLocation(t, s, b),
              DiskLocationState.EMPTY.toString().concat(zeros)
            );
          }
        }
      }
    }
  }

  export enum FileSystemInterrupts {
    FORMAT
  }

  export enum DiskLocationState {
    EMPTY = 0,
    OCCUPIED = 0
  }
}
