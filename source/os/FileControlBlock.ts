namespace TSOS {
  export class FileControlBlock {
    private block: FileSystemBlock;

    constructor(
      public name: string,
      public location: DiskLocation,
      public firstBlockPointer: DiskLocation
    ) {
      this.block = new FileSystemBlock(
        location,
        this.createRawName(name),
        firstBlockPointer
      );
    }

    private createRawName(name: string) {
      return name
        .split('')
        .map(c => c.charCodeAt(0).toString(16))
        .join('');
    }
  }
}
