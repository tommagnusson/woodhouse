///<reference path="../globals.ts" />
///<reference path="../utils.ts" />
///<reference path="shellCommand.ts" />
///<reference path="userCommand.ts" />

/* ------------
   Shell.ts

   The OS Shell - The "command line interface" (CLI) for the console.

    Note: While fun and learning are the primary goals of all enrichment center activities,
          serious injuries may occur when trying to write your own Operating System.
   ------------ */

// TODO: Write a base class / prototype for system services and let Shell inherit from it.
namespace TSOS {
  export class Shell {
    // Properties
    public promptStr = ">";
    public promptPresent = false;
    public commandList: Array<ShellCommand> = [];
    public curses =
      "[fuvg],[cvff],[shpx],[phag],[pbpxfhpxre],[zbgureshpxre],[gvgf],[qvpx]";
    public apologies = "[sorry]";

    // history of commands, indexed oldest 0 to newest len - 1
    public commandHistory: Array<ShellCommand> = [];
    // which command within the command history we're at
    // null represents not having been at a command
    public currentCommandIndex: number = null;

    constructor() {
      // ver
      this.commandList.push(
        new ShellCommand(
          this.shellVer,
          "ver",
          "- Displays the current version data."
        )
      );

      // help
      this.commandList.push(
        new ShellCommand(
          this.shellHelp,
          "help",
          "- This is the help command. Seek help."
        )
      );

      // shutdown
      this.commandList.push(
        new ShellCommand(
          this.shellShutdown,
          "shutdown",
          "- Shuts down the virtual OS but leaves the underlying host / hardware simulation running."
        )
      );

      // cls
      this.commandList.push(
        new ShellCommand(
          this.shellCls,
          "cls",
          "- Clears the screen and resets the cursor position."
        )
      );

      // man <topic>
      this.commandList.push(
        new ShellCommand(
          this.shellMan,
          "man",
          "<topic> - Displays the MANual page for <topic>."
        )
      );

      // trace <on | off>
      this.commandList.push(
        new ShellCommand(
          this.shellTrace,
          "trace",
          "<on | off> - Turns the OS trace on or off."
        )
      );

      // rot13 <string>
      this.commandList.push(
        new ShellCommand(
          this.shellRot13,
          "rot13",
          "<string> - Does rot13 obfuscation on <string>."
        )
      );

      // prompt <string>
      this.commandList.push(
        new ShellCommand(
          this.shellPrompt,
          "prompt",
          "<string> - Sets the prompt."
        )
      );

      // date - displays current date
      this.commandList.push(
        new ShellCommand(
          args => _StdOut.putText(new Date().toDateString()),
          "date",
          "- Displays the current date"
        )
      );

      // whereami - displays the user's current location
      this.commandList.push(
        new ShellCommand(
          args => _StdOut.putText("Archer's Mansion."),
          "whereami",
          "- Displays the user's current location"
        )
      );

      this.commandList.push(
        new ShellCommand(
          args => {
            _Status = args.join(" ");
            _StdOut.putText(_Status);
          },
          "status",
          "<string> - Sets the current status to the string given"
        )
      );

      this.commandList.push(
        new ShellCommand(
          this.shellAdd,
          "add",
          "<integer>...  - Adds any number of integer arguments."
        )
      );

      this.commandList.push(
        new ShellCommand(
          this.shellLoad,
          "load",
          "- Loads a user program from the input area."
        )
      );

      this.commandList.push(
        new ShellCommand(
          this.shellCrash,
          "crash",
          "- Crashes the operating system."
        )
      );

      this.commandList.push(
        new ShellCommand(
          this.shellRun,
          "run",
          "<pid> - runs the given pid in memory"
        )
      );

      this.commandList.push(
        new ShellCommand(
          this.shellClearMem,
          "clearmem",
          "- clears all memory partitions"
        )
      );

      this.commandList.push(
        new ShellCommand(
          this.shellRunall,
          "runall",
          "- runs all the loaded programs"
        )
      );

      // ps  - list the running processes and their IDs
      // kill <id> - kills the specified process id.

      //
      // Display the initial prompt.
      this.putPrompt();
    }

    public putPrompt() {
      _StdOut.putText(this.promptStr);
      this.promptPresent = true;
    }

    public deletePrompt() {
      if (this.promptPresent) {
        _StdOut.backspace(_OsShell.promptStr);
        this.promptPresent = false;
      }
    }

    public completeCommand(buffer): string {
      _Kernel.krnTrace("Code complete~" + buffer);

      const incompleteCommand = this.decomposeInput(buffer);

      // nonexistent command or command with args
      if (incompleteCommand.length != 1) {
        return;
      }

      // get possible matches for buffer from command list
      const possibleCompleteCommands = this.commandList.filter(
        c => c.command.indexOf(incompleteCommand[0]) === 0
      );

      // if we have only one candidate, nonabiguously complete
      if (possibleCompleteCommands.length === 1) {
        return this.completeRest(
          possibleCompleteCommands[0].command,
          incompleteCommand[0]
        );
      }
    }

    private completeRest(
      completeCommand: string,
      commandSoFar: string
    ): string {
      // index should be negative or 0
      const index = commandSoFar.length - completeCommand.length;
      // exact matching command, nothing left to return
      if (index === 0) {
        return "";
      }
      return completeCommand.slice(index);
    }

    public previousCommand(): ShellCommand {
      if (this.currentCommandIndex === null) {
        // the latest command
        this.currentCommandIndex = this.commandHistory.length - 1;
        return this.commandHistory[this.currentCommandIndex];
      }

      if (this.currentCommandIndex === 0) {
        // the first command, nothing previous to it
        return;
      }

      // go to the previous one...
      this.currentCommandIndex -= 1;
      return this.commandHistory[this.currentCommandIndex];
    }

    public nextCommand(): ShellCommand {
      if (this.currentCommandIndex === null) {
        return; // there is no next command...
      }
      if (this.currentCommandIndex === this.commandHistory.length - 1) {
        return; // also no next command ...
      }

      // go to the next one...
      this.currentCommandIndex += 1;
      return this.commandHistory[this.currentCommandIndex];
    }

    public handleInput(buffer) {
      _Kernel.krnTrace("Shell Command~" + buffer);

      if (buffer === "") {
        _StdOut.advanceLine();
        this.putPrompt();
        return;
      }

      //
      // Parse the input...
      //
      var userCommand = this.parseInput(buffer.trim());
      // ... and assign the command and args to local variables.
      var cmd = userCommand.command;
      var args = userCommand.args;
      //
      // Determine the command and execute it.
      //
      const maybeCommand = _OsShell.commandList.filter(c => c.command === cmd);
      if (maybeCommand.length === 1) {
        const command = maybeCommand[0];
        this.execute(command.func, args);
        command.arguments = args;
        this.commandHistory.push(command);
        this.currentCommandIndex = null; // reset the index
      } else {
        // It's not found, so check for curses and apologies before declaring the command invalid.
        if (this.curses.indexOf("[" + Utils.rot13(cmd) + "]") >= 0) {
          // Check for curses.
          this.execute(this.shellCurse);
        } else if (this.apologies.indexOf("[" + cmd + "]") >= 0) {
          // Check for apologies.
          this.execute(this.shellApology);
        } else {
          // It's just a bad command.
          this.execute(this.shellInvalidCommand);
        }
      }
    }

    public execute(fn, args?) {
      _StdOut.advanceLine();
      fn(args);
      if (_StdOut.currentXPosition > 0) {
        _StdOut.advanceLine();
      }
      this.putPrompt();
    }

    // e.g. "help   VER  " -> ["help", "ver"]
    private decomposeInput(buffer: string): Array<string> {
      return buffer
        .trim()
        .toLowerCase()
        .split(" ")
        .map(word => word.trim());
    }

    public parseInput(buffer): UserCommand {
      const cmdWords = this.decomposeInput(buffer);

      // The zeroth element is the command.
      var cmd = cmdWords.shift();

      // The rest are args
      const args = cmdWords.filter(arg => arg != "");
      return new UserCommand(cmd, args);
    }

    //
    // Shell Command Functions.  Kinda not part of Shell() class exactly, but
    // called from here, so kept here to avoid violating the law of least astonishment.
    //
    public shellInvalidCommand() {
      _StdOut.putText("Invalid Command. ");
      if (_SarcasticMode) {
        _StdOut.putText("Unbelievable. You, [subject name here],");
        _StdOut.advanceLine();
        _StdOut.putText("must be the pride of [subject hometown here].");
      } else {
        _StdOut.putText("Type 'help' for, well... help.");
      }
    }

    public shellCurse() {
      _StdOut.putText("Oh, so that's how it's going to be, eh? Fine.");
      _StdOut.advanceLine();
      _StdOut.putText("Bitch.");
      _SarcasticMode = true;
    }

    public shellApology() {
      if (_SarcasticMode) {
        _StdOut.putText("I think we can put our differences behind us.");
        _StdOut.advanceLine();
        _StdOut.putText("For science . . . You monster.");
        _SarcasticMode = false;
      } else {
        _StdOut.putText("For what?");
      }
    }

    public shellVer(args) {
      _StdOut.putText(APP_NAME + " version " + APP_VERSION);
    }

    public shellHelp(args) {
      _StdOut.putText("Commands:");
      for (var i in _OsShell.commandList) {
        _StdOut.advanceLine();
        _StdOut.putText(
          "  " +
            _OsShell.commandList[i].command +
            " " +
            _OsShell.commandList[i].description
        );
      }
    }

    public shellShutdown(args) {
      _StdOut.putText("Shutting down...");
      // Call Kernel shutdown routine.
      _Kernel.krnShutdown();
      // TODO: Stop the final prompt from being displayed.  If possible.  Not a high priority.  (Damn OCD!)
    }

    public shellCls(args) {
      _StdOut.clearScreen();
      _StdOut.resetXY();
    }

    public shellMan(args) {
      if (args.length > 0) {
        const topic = args[0];

        // find the corresponding command
        const command = _OsShell.commandList.filter(
          command => topic === command.command
        );
        _StdOut.putText(
          command.length === 1
            ? command[0].description
            : `No manual entry for ${args[0]}.`
        );
      } else {
        _StdOut.putText("Usage: man <topic>  Please supply a topic.");
      }
    }

    public shellTrace(args) {
      if (args.length > 0) {
        var setting = args[0];
        switch (setting) {
          case "on":
            if (_Trace && _SarcasticMode) {
              _StdOut.putText("Trace is already on, doofus.");
            } else {
              _Trace = true;
              _StdOut.putText("Trace ON");
            }
            break;
          case "off":
            _Trace = false;
            _StdOut.putText("Trace OFF");
            break;
          default:
            _StdOut.putText("Invalid arguement.  Usage: trace <on | off>.");
        }
      } else {
        _StdOut.putText("Usage: trace <on | off>");
      }
    }

    public shellRot13(args) {
      if (args.length > 0) {
        // Requires Utils.ts for rot13() function.
        _StdOut.putText(
          args.join(" ") + " = '" + Utils.rot13(args.join(" ")) + "'"
        );
      } else {
        _StdOut.putText("Usage: rot13 <string>  Please supply a string.");
      }
    }

    public shellPrompt(args) {
      if (args.length > 0) {
        _OsShell.promptStr = args[0];
      } else {
        _StdOut.putText("Usage: prompt <string>  Please supply a string.");
      }
    }

    public shellAdd(args) {
      if (args.length <= 0) {
        _StdOut.putText("Please provide at least one integer argument to add.");
        return;
      }
      let hasInvalidArgument = false;
      const nums = args.map(arg => parseInt(arg));
      nums.forEach(num => {
        if (isNaN(num)) {
          hasInvalidArgument = true;
        }
      });
      if (hasInvalidArgument) {
        _StdOut.putText(
          "Found a non-integer arg. Please provide all integer args."
        );
      }

      _StdOut.putText(`${nums.reduce((n1, n2) => n1 + n2)}`);
    }

    // makes sure the program is in hex and spaces
    private isValidProgram = (programText: string): boolean => {
      // crafted using https://regex101.com/
      const validProgramRegexPattern = /^(?:(?:[0-9a-fA-F]{2})+\s?)+$/gm;
      // [0-9a-fA-F]{2}+ Any group of two 0-9 or case insensitive a-f, 1 or more times
      // followed by an optional whitespace character

      // match returns an array or null, which we map to true or false
      return programText.match(validProgramRegexPattern) ? true : false;
    };

    private shellLoad = args => {
      const program = _ProgramInput.value;
      if (this.isValidProgram(program)) {
        _StdOut.putText("Nice program you have there.");
        _KernelInterruptQueue.enqueue(
          new Interrupt(LOAD_PROGRAM_IRQ, [program])
        );
      } else {
        // error message
        _StdOut.putText("Whoops, looks like you entered an invalid program.");
      }
    };

    public shellCrash = (args?) => {
      _Console.clearScreen();
      _Canvas.style.backgroundColor = "blue";
      _StdOut.init();
      _StdOut.putText("Terribly sorry to interrupt...", "white");
      _StdOut.advanceLine();
      _StdOut.putText("It seems something unthinkable has happened!", "white");
      _StdOut.advanceLine();
      _StdOut.putText("I have to shut this off, terribly sorry.", "white");
      _Kernel.krnShutdown();
    };

    public shellRun = args => {
      if (args.length !== 1) {
        _StdOut.putText("Please provide a single PID as an argument.");
        return;
      }
      _KernelInterruptQueue.enqueue(new Interrupt(RUN_PROGRAM_IRQ, args));
    };

    public shellClearMem = args => {
      _KernelInterruptQueue.enqueue(new Interrupt(REQ_CLEAR_MEM_IRQ, []));
    };

    public shellRunall = args => {
      _KernelInterruptQueue.enqueue(new Interrupt(RUN_ALL_PROGRAMS_IRQ, []));
    };
  }
}
