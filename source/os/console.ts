///<reference path="../globals.ts" />

/* ------------
     Console.ts

     Requires globals.ts

     The OS Console - stdIn and stdOut by default.
     Note: This is not the Shell. The Shell is the "command line interface" (CLI) or interpreter for this console.
     ------------ */

namespace TSOS {
  export class Console {
    constructor(
      public currentFont = _DefaultFontFamily,
      public currentFontSize = _DefaultFontSize,
      public currentXPosition = 0,
      public currentYPosition = _DefaultFontSize,
      public buffer = ""
    ) {}

    public init(): void {
      this.clearScreen();
      this.resetXY();
    }

    private clearScreen(): void {
      _DrawingContext.clearRect(0, 0, _Canvas.width, _Canvas.height);
    }

    private resetXY(): void {
      this.currentXPosition = 0;
      this.currentYPosition = this.currentFontSize;
    }

    public handleInput(): void {
      while (_KernelInputQueue.getSize() > 0) {
        const chr = _KernelInputQueue.dequeue();
        const fromCharCode = str => str.split("").map(s => s.charCodeAt(0));
        console.log(
          "buffer",
          this.buffer,
          this.buffer.length,
          fromCharCode(this.buffer)
        );

        // key is the input char, value is the function to be run on value
        const onInputVector = {
          "\b": this.onBackspace,
          "\t": this.onTab,
          [String.fromCharCode(13)]: this.onEnter,
          "↓": this.onDownArrow,
          "↑": this.onUpArrow
        };

        const maybeOnMethod = onInputVector[chr];
        if (maybeOnMethod) {
          // character that triggers a special method
          maybeOnMethod();
        } else {
          // This is a "normal" character
          console.log("normal character", chr);
          this.putText(chr);
          this.buffer += chr;
        }
        // TODO: Write a case for Ctrl-C.
      }
    }

    private putNewCommand(command: TSOS.ShellCommand): boolean {
      if (!command) {
        return false;
      }
      _StdOut.advanceLine();
      _OsShell.putPrompt();
      _StdOut.putText(command.command);
      return true;
    }

    private onDownArrow = () => {
      const command = _OsShell.nextCommand();
      if (!this.putNewCommand(command)) {
        return;
      }
      this.buffer = command.command;
      return;
    };

    private onUpArrow = () => {
      const command = _OsShell.previousCommand();
      if (!this.putNewCommand(command)) {
        return;
      }
      this.buffer = command.command;
      return;
    };

    public backspace = (prevChar?: string): void => {
      if (!prevChar) return;

      console.log("Attempting to delete: " + prevChar);

      const offset = _DrawingContext.measureText(
        this.currentFont,
        this.currentFontSize,
        prevChar
      );

      this.currentXPosition -= offset;

      _DrawingContext.clearRect(
        this.currentXPosition,
        this.currentYPosition - this.lineHeight() + _FontHeightMargin / 2,
        offset,
        this.lineHeight()
      );

      console.dir(this);
      console.dir(_DrawingContext);
    };

    private onBackspace = () => {
      // get the character to be deleted
      const deletedChar = this.buffer[this.buffer.length - 1];
      // remove the deleted character from the buffer
      this.buffer = this.buffer.substring(0, this.buffer.length - 1);

      this.backspace(deletedChar);
    };

    private onTab = () => {
      // autocomplete feature
      const restOfCompletedCommand = _OsShell.completeCommand(this.buffer);
      if (restOfCompletedCommand) {
        this.putText(restOfCompletedCommand + " ");
        this.buffer += restOfCompletedCommand + " ";
      }
    };

    private onEnter = () => {
      // tells shell to try to execute the command from the buffer
      _OsShell.handleInput(this.buffer);
      this.buffer = "";
    };

    public putText(text): void {
      // My first inclination here was to write two functions: putChar() and putString().
      // Then I remembered that JavaScript is (sadly) untyped and it won't differentiate
      // between the two.  So rather than be like PHP and write two (or more) functions that
      // do the same thing, thereby encouraging confusion and decreasing readability, I
      // decided to write one function and use the term "text" to connote string or char.
      //
      // UPDATE: Even though we are now working in TypeScript, char and string remain undistinguished.
      //         Consider fixing that.

      if (text !== "") {
        // Draw the text at the current X and Y coordinates.
        _DrawingContext.drawText(
          this.currentFont,
          this.currentFontSize,
          this.currentXPosition,
          this.currentYPosition,
          text
        );
        // Move the current X position.
        var offset = _DrawingContext.measureText(
          this.currentFont,
          this.currentFontSize,
          text
        );
        this.currentXPosition = this.currentXPosition + offset;
      }
    }

    public advanceLine(): void {
      this.currentXPosition = 0;

      this.currentYPosition += this.lineHeight();

      // TODO: Handle scrolling. (iProject 1)
    }

    private lineHeight(): number {
      /*
      * Font size measures from the baseline to the highest point in the font.
      * Font descent measures from the baseline to the lowest point in the font.
      * Font height margin is extra spacing between the lines.
      */
      return (
        _DefaultFontSize +
        _DrawingContext.fontDescent(this.currentFont, this.currentFontSize) +
        _FontHeightMargin
      );
    }
  }
}
