namespace TSOS {
  export class OpCode {
    readonly code;
    readonly numArgs;
    readonly mnemonic;
    readonly description;
    public args: Array<string> = [];

    constructor(hex: string) {
      this.code = hex.toUpperCase();
      switch (this.code) {
        case "00":
          this.mnemonic = "BRK";
          this.numArgs = 0;
          break;
        case "A9":
          this.mnemonic = "LDA";
          this.numArgs = 1;
          break;
        case "AD":
          this.mnemonic = "LDA";
          this.numArgs = 2;
          break;
        case "8D":
          this.mnemonic = "STA";
          this.numArgs = 2;
          break;
        case "6D":
          this.mnemonic = "ADC";
          this.numArgs = 2;
          break;
        case "A2":
          this.mnemonic = "LDX";
          this.numArgs = 1;
          break;
        case "AE":
          this.mnemonic = "LDX";
          this.numArgs = 2;
          break;
        case "A0":
          this.mnemonic = "LDY";
          this.numArgs = 1;
          break;
        case "AC":
          this.mnemonic = "LDY";
          this.numArgs = 2;
          break;
        case "EA":
          this.mnemonic = "NOP";
          this.numArgs = 0;
          break;
        case "EC":
          this.mnemonic = "CPX";
          this.numArgs = 2;
          break;
        case "D0":
          this.mnemonic = "BNE";
          this.numArgs = 1;
          break;
        case "EE":
          this.mnemonic = "INC";
          this.numArgs = 2;
          break;
        case "FF":
          this.mnemonic = "SYS";
          this.numArgs = 0;
          break;
        default:
          throw new Error(`Unknown opcode: ${this.code}`);
      }
    }
  }
}
