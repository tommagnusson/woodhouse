import { Globals } from "../globals";
import Queue from "../os/queue";

/* ------------
     Console.ts

     Requires globals.ts

     The OS Console - stdIn and stdOut by default.
     Note: This is not the Shell. The Shell is the "command line interface" (CLI) or interpreter for this console.
     ------------ */

export default class Console {
  constructor(
    public drawingContext: any,
    public canvas: HTMLCanvasElement,
    public currentFont = Globals.DEFAULT_FONT_FAMILY,
    public currentFontSize = Globals.DEFAULT_FONT_SIZE,
    public currentXPosition = 0,
    public currentYPosition = Globals.DEFAULT_FONT_SIZE,
    public buffer = ""
  ) {
    this.drawingContext = drawingContext;
    this.canvas = canvas;
  }

  public init(): void {
    this.clearScreen();
    this.resetXY();
  }

  public clearScreen(): void {
    this.drawingContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public resetXY(): void {
    this.currentXPosition = 0;
    this.currentYPosition = this.currentFontSize;
  }

  // Entered command is a callback that takes in a command after the 'enter' key is found
  // in the input queue.
  // Log is an optional logging function that accepts the buffer
  public handleInput(
    inputQueue: Queue,
    onEnteredCommand: any,
    log?: any
  ): void {
    while (inputQueue.getSize() > 0) {
      // Get the next character from the kernel input queue.
      var chr = inputQueue.dequeue();
      // Check to see if it's "special" (enter or ctrl-c) or "normal" (anything else that the keyboard device driver gave us).
      if (chr === String.fromCharCode(13)) {
        //     Enter key
        // The enter key marks the end of a console command, so ...
        // ... tell the shell ...
        onEnteredCommand(this.buffer);
        // ... and reset our buffer.
        this.buffer = "";
      } else {
        // This is a "normal" character, so ...
        // ... draw it on the screen...
        this.putText(chr);
        // ... and add it to our buffer.
        this.buffer += chr;
      }
      // TODO: Write a case for Ctrl-C.
    }
  }

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
      this.drawingContext.drawText(
        this.currentFont,
        this.currentFontSize,
        this.currentXPosition,
        this.currentYPosition,
        text
      );
      // Move the current X position.
      var offset = this.drawingContext.measureText(
        this.currentFont,
        this.currentFontSize,
        text
      );
      this.currentXPosition = this.currentXPosition + offset;
    }
  }

  public advanceLine(): void {
    this.currentXPosition = 0;
    /*
             * Font size measures from the baseline to the highest point in the font.
             * Font descent measures from the baseline to the lowest point in the font.
             * Font height margin is extra spacing between the lines.
             */
    this.currentYPosition +=
      Globals.DEFAULT_FONT_SIZE +
      this.drawingContext.fontDescent(this.currentFont, this.currentFontSize) +
      Globals.FONT_HEIGHT_MARGIN;

    // TODO: Handle scrolling. (iProject 1)
  }
}
