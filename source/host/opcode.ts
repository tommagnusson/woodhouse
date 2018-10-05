namespace TSOS {
  export class OpCode {
    readonly code;
    readonly numArgs;
    readonly mnemonic;
    public args = new Array(this.numArgs);

    constructor(readonly hex: string) {
      this.code = hex.toUpperCase();
      switch (this.code) {
        case "00":
          this.mnemonic = "BRK";
          this.numArgs = 0;
        case "A9":
          this.mnemonic = "LDA";
          this.numArgs = 1;
          break;
        case "6D":
          this.mnemonic = "STA";
          this.numArgs = 2;
          break;
        default:
          throw new Error(`Unknown opcode: ${this.code}`);
      }
    }
  }
}
