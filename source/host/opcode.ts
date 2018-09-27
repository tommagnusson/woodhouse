export default class OpCode {
  readonly opcode;
  readonly numArgs;
  readonly mnemonic;

  constructor(readonly hex: string) {
    this.opcode = hex.toUpperCase();
    switch (this.opcode) {
      case "A9":
        this.mnemonic = "LDA";
        this.numArgs = 1;
        break;
      case "6D":
        this.mnemonic = "STA";
        this.numArgs = 2;
        break;
      default:
        throw new Error(`Unknown opcode: ${this.opcode}`);
    }
  }
}
