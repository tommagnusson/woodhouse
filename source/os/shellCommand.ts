namespace TSOS {
  export class ShellCommand {
    public arguments: Array<string>;

    constructor(
      public func: any,
      public command = "",
      public description = ""
    ) {}
  }
}
