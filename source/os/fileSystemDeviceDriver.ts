///<reference path="../globals.ts" />
///<reference path="deviceDriver.ts" />
///<reference path="../host/Disk.ts" />
///<reference path="./processControlBlock.ts"/>

namespace TSOS {
  // A block terminates a linked list of pointers if it points to itself
  // The first track is reserved for file names
  // (0,0,0) is the master boot record
  export class FileSystemDeviceDriver extends DeviceDriver {
    private isFormatted: boolean = false;

    private files: FileSystemBlock[] = [];

    private checkFormatted(): boolean {
      if (!this.isFormatted) {
        _StdOut.putText(
          `Looks like the disk is not formatted yet. Please use 'format' to do so.`
        );
      }
      return this.isFormatted;
    }

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
        },
        [FileSystemInterrupts.WRITE]: () => {
          this.onWrite(fsParams);
        },
        [FileSystemInterrupts.READ]: () => {
          this.onRead(fsParams);
        },
        [FileSystemInterrupts.DELETE]: () => {
          this.onDelete(fsParams);
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

    public static deriveSwapFileName(pid: number) {
      return `.swap${pid}`;
    }

    // pids of processes that have active swap files
    public activeSwapFiles: number[] = [];

    // load a program (hex string) to a temp swap file
    public _load(
      program: string,
      process: ProcessControlBlock
    ): ProcessControlBlock {
      // 1 create the swap file - .swapN where N is the pid
      const fileName = FileSystemDeviceDriver.deriveSwapFileName(process.pid);
      this.createFile(fileName);

      // 2 write program to the swap file
      this.appendToFile(fileName, program);

      // 3 keep track of active swap files
      this.activeSwapFiles.push(process.pid);

      // 4 create the process control block
      process.location = 'disk';
      return process;
    }

    public load(program: string, pid: number): ProcessControlBlock {
      const pcb = new ProcessControlBlock(pid, null);
      return this._load(program, pcb);
    }

    public deleteSwap(pid: number) {
      const fileName = FileSystemDeviceDriver.deriveSwapFileName(pid);
      if (!this.activeSwapFiles.some(f => f === pid)) {
        throw new Error(
          `Tried to delete the swap file for pid ${pid} that doesn't exist. Active swaps: ${
            this.activeSwapFiles
          }`
        );
      }
      const contents = this.readFile(fileName);
      this.deleteFile(fileName);
      return contents;
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

    private onWrite(params: any[]) {
      if (!this.checkFormatted()) {
        return;
      }
      const [fileName, stringData] = params;
      this.appendToFile(fileName, stringData);
      _StdOut.putText(`Wrote ${stringData} to ${fileName}`);
    }

    private onRead(params: any[]) {
      if (!this.checkFormatted()) {
        return;
      }
      const [filename] = params;
      _StdOut.putText(`Contents of ${filename}: `);
      _StdOut.putText(this.readFile(filename));
    }

    private onDelete(params: any[]) {
      if (!this.checkFormatted()) {
        return;
      }
      const [filename] = params;
      this.deleteFile(filename);
      _StdOut.putText(`Deleted ${filename}.`);
    }

    private deleteFile(fileName: string) {
      const theFile = this.findFile(fileName);
      this.recursiveDelete(theFile);
    }

    private recursiveDelete(file: FileSystemBlock) {
      file.setState(BlockState.AVAILABLE);
      this.writeRaw(file);
      this.availableLocations.push(file); // add to cache :)

      // base case: file terminus, all others should be deleted by now
      if (file.isFileTerminus()) {
        return;
      }
      // go on to delete the next one
      this.recursiveDelete(file.getBlockFromPointer());
    }

    private readFile(fileName: string): string {
      const theFile = this.findFile(fileName);
      if (theFile.isFileTerminus()) {
        return '';
      }
      return this.recursiveRead(theFile.getBlockFromPointer());
    }

    private recursiveRead(block: FileSystemBlock): string {
      // base case: terminus, return the content
      if (block.isFileTerminus()) {
        return block.getStringContent();
      }
      // recursive case: get the content and concat with next block
      return block
        .getStringContent()
        .concat(this.recursiveRead(block.getBlockFromPointer()));
    }

    private findFile(fileName: string): FileSystemBlock {
      return this.fileNameBlocks()
        .filter(b => b.getState() === BlockState.OCCUPIED)
        .find(b => b.getStringContent() === fileName);
    }

    private appendToFile(fileName: string, stringData: string) {
      // find the file
      const theFile = this.findFile(fileName);

      if (theFile.isFileNameBlock() && theFile.isFileTerminus()) {
        // uh oh, find a free block to expand my dawg...
        const available = this.availableLocations.shift();
        if (!available) {
          throw new Error(`No available space on disk.`);
        }

        available.reset();
        available.setState(BlockState.OCCUPIED);
        theFile.setPointer(available.location);
        // save the file
        this.writeRaw(theFile);
        this.appendToBlock(available, stringData);
      } else {
        const firstContentfulBlock = theFile.getBlockFromPointer();

        this.appendToBlock(firstContentfulBlock, stringData);
      }
    }

    private appendToBlock(block: FileSystemBlock, stringData: string) {
      console.log('append to block');
      const remainingStringData = block.appendStringContent(stringData);

      // base case, wrote everything sucessfully
      if (remainingStringData === '') {
        this.writeRaw(block);
        return block;
      }
      // recursive case, find more disk space...
      const available = this.availableLocations.shift();
      if (!available) {
        throw new Error('No available space on disk.');
      }
      // link up the previous block to the next available one
      block.setPointer(available.location);
      available.reset();
      available.setState(BlockState.OCCUPIED);
      // save current block to disk
      this.writeRaw(block);

      return this.appendToBlock(available, remainingStringData);
    }

    private createFile(filename: string) {
      // check existing files
      const names = this.fileNameBlocks()
        .filter(b => b.getState() === BlockState.OCCUPIED)
        .map(b => b.getStringContent());
      if (names.some(name => name === filename)) {
        _StdOut.putText(`File with name ${filename} already exists.`);
        return;
      }
      const available = this.fileNameBlocks()
        .filter(b => b.getState() === BlockState.AVAILABLE)
        .shift();
      if (!available.reset()) {
        throw new Error(
          `Tried to reset the contents of an "available" block: ${available}`
        );
      }
      available.setState(BlockState.OCCUPIED);
      available.setStringContent(filename);
      this.writeRaw(available);
      this.files.push(available);
    }

    driverEntry() {
      this.status = 'initialized';
      this.findAvailableBlocks();
      this.isFormatted = this.disk.allLocationsAndContents().length !== 0;
    }

    private fileNameBlocks(): FileSystemBlock[] {
      return this.disk
        .allLocationsAndContents()
        .map(kv => FileSystemBlock.deserialize(kv.location, kv.contents))
        .filter(b => b.location.track === 0)
        .filter(b => !b.location.equals(new DiskLocation(0, 0, 0))); // ignore boot block
    }

    private findAvailableBlocks(): FileSystemBlock[] {
      this.availableLocations = this.disk
        .allLocationsAndContents()
        .map(kv => FileSystemBlock.deserialize(kv.location, kv.contents))
        .filter(
          b => b.getState() === BlockState.AVAILABLE && b.location.track !== 0
        );
      return this.availableLocations;
    }

    private availableLocations: FileSystemBlock[];

    format() {
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

    public ls(): string[] {
      return this.fileNameBlocks()
        .filter(b => b.getState() === BlockState.OCCUPIED)
        .map(b => b.getStringContent())
        .filter(n => !n.startsWith('.'));
    }
  }

  // === BEGIN FILE SYSTEM BLOCK ===

  export class FileSystemBlock {
    private state: BlockState = BlockState.AVAILABLE;

    private pointer: DiskLocation; // if pointer == location, then it's the terminus of a file
    private byteContents: string;

    static DEFAULT_CONTENTS = '0'.repeat(60);

    static loadFromLocation(location: DiskLocation): FileSystemBlock {
      const found = _Disk
        .allLocationsAndContents()
        .find(lc => lc.location === location.toByteString());
      if (!found) {
        return null;
      }
      return FileSystemBlock.deserialize(found.location, found.contents);
    }

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

    public isFileNameBlock() {
      return this.location.track === 0;
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

    public getBlockFromPointer(): FileSystemBlock {
      return FileSystemBlock.loadFromLocation(this.getPointer());
    }

    public getPointer(): DiskLocation {
      return this.pointer;
    }

    public setPointer(pointer: DiskLocation) {
      this.pointer = pointer;
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

    public getStringContent(): string {
      return FileSystemBlock.charHexToString(this.byteContents).replace(
        /\0*$/g,
        ''
      );
    }

    // find the char hex contents without padded 0s
    public getCharHexContent(): string {
      return this.byteContents.substring(
        0,
        _.chunk(this.byteContents, 2).findIndex(
          byte => byte[0] === '0' && byte[1] === '0'
        ) * 2
      );
    }

    // if the content to be appended is longer than can fit,
    // returns what's left of the string. If it can all fit, "" is returned.
    public appendStringContent(stringContent: string): string {
      const remainingRoom = 60 - this.getCharHexContent().length;
      const appendCharHex = FileSystemBlock.stringToCharHex(stringContent);
      if (remainingRoom >= appendCharHex.length) {
        console.log(
          'hex content concat',
          this.getCharHexContent().concat(appendCharHex)
        );
        console.log(
          'set to',
          this.getCharHexContent(),
          appendCharHex,
          this.getCharHexContent().concat(appendCharHex)
        );
        this.setHexByteContent(this.getCharHexContent().concat(appendCharHex));
        return '';
      } else {
        // too big to fit :(
        const charHexThatFits = appendCharHex.substring(0, remainingRoom);
        this.setHexByteContent(
          this.getCharHexContent().concat(charHexThatFits)
        );
        // return the rest
        return FileSystemBlock.charHexToString(
          appendCharHex.substring(remainingRoom, appendCharHex.length)
        );
      }
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
    CREATE,
    WRITE,
    READ,
    DELETE
  }

  export enum BlockState {
    AVAILABLE = 0,
    OCCUPIED = 1
  }
}
