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

    public clearScreen(): void {
      _DrawingContext.clearRect(0, 0, _Canvas.width, _Canvas.height);
    }

    private resetXY(): void {
      this.currentXPosition = 0;
      this.currentYPosition = this.currentFontSize;
    }

    public handleInput(): void {
      while (_KernelInputQueue.getSize() > 0) {
        const chr = _KernelInputQueue.dequeue();

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
      _StdOut.putText(command.command + " " + command.arguments.join(" "));
      return true;
    }

    private onArrow = upOrDownFn => {
      const command = upOrDownFn;
      if (!this.putNewCommand(command)) {
        return;
      }
      this.buffer = command.command + " " + command.arguments.join(" ");
    };

    private onDownArrow = () => {
      this.onArrow(_OsShell.nextCommand());
    };

    private onUpArrow = () => {
      this.onArrow(_OsShell.previousCommand());
    };

    public backspace = (prevChar?: string): void => {
      if (!prevChar) return;

      const offset = _DrawingContext.measureText(
        this.currentFont,
        this.currentFontSize,
        prevChar
      );

      this.currentXPosition -= offset;

      // 9/14/18 "Yeah, you have to add something!" - Dr. Alan Labouseur
      const magicNumberAlanToldMeToAdd = 20;
      _DrawingContext.clearRect(
        this.currentXPosition,
        this.currentYPosition - this.lineHeight() + _FontHeightMargin,
        offset,
        this.lineHeight() + magicNumberAlanToldMeToAdd
      );
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

    public putText(text: string, color: string = "black"): void {
      const whiteSpacePattern = /(\s)/g;
      const words = text.split(whiteSpacePattern); // split on whitespace (but include delimiters in words array)
      words.forEach(word => {
        const wordWidth = _DrawingContext.measureText(
          this.currentFont,
          this.currentFontSize,
          word
        );
        if (wordWidth > _Canvas.width) {
          // too big to break, we gotta print it all and it will fall offscreen
          this.rawPutText(word);
          return;
        }
        const xSpaceLeft = _Canvas.width - this.currentXPosition;
        if (wordWidth > xSpaceLeft) {
          // put it on a new line
          this.advanceLine();
        }
        this.rawPutText(word);
      });
    }

    /**
     * Puts the text on the console without regard for line spacing
     * @param text the text to put onto the console
     * @param color default black, what color the text should be
     */
    private rawPutText(text: string, color: string = "black") {
      if (text !== "") {
        // Draw the text at the current X and Y coordinates.
        _DrawingContext.drawText(
          this.currentFont,
          this.currentFontSize,
          this.currentXPosition,
          this.currentYPosition,
          text,
          color
        );
        // Move the current X position.
        const offset = _DrawingContext.measureText(
          this.currentFont,
          this.currentFontSize,
          text
        );

        this.currentXPosition = this.currentXPosition + offset;
      }
    }

    public putSysText(text: string): void {
      // erase existing line
      for (let i = this.buffer.length - 1; i >= 0; i--) {
        _StdOut.backspace(this.buffer[i]);
      }
      if (_OsShell.promptPresent) {
        _StdOut.backspace(_OsShell.promptStr);
        _OsShell.promptPresent = false;
      }
      // put sys text
      _StdOut.putText(text);
    }

    public putSysTextLn(text: string): void {
      this.putSysText(text);
      _StdOut.advanceLine();
      // restore existing line
      _OsShell.putPrompt();
      if (this.buffer.length > 0) {
        _StdOut.putText(this.buffer);
      }
    }

    public advanceLine(): void {
      this.currentXPosition = 0;

      this.currentYPosition += this.lineHeight();

      if (this.currentYPosition > _Canvas.height) {
        // Simon says scroll it
        this.scroll();
      }
    }

    private scroll() {
      // serialize entire existing screen
      const imageData = _DrawingContext.getImageData(
        0,
        0,
        _Canvas.width,
        _Canvas.height
      );

      // clear the screen
      this.clearScreen();

      // draw the image data back up
      _DrawingContext.putImageData(imageData, 0, -this.lineHeight());

      // put the > back on the bottom line
      this.currentXPosition = 0;
      this.currentYPosition =
        _Canvas.height -
        _DrawingContext.fontDescent(this.currentFont, this.currentFontSize);
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
