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
    public commandList: Array<ShellCommand> = [];
    public curses =
      "[fuvg],[cvff],[shpx],[phag],[pbpxfhpxre],[zbgureshpxre],[gvgf],[qvpx]";
    public apologies = "[sorry]";

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

      // ps  - list the running processes and their IDs
      // kill <id> - kills the specified process id.

      //
      // Display the initial prompt.
      this.putPrompt();
    }

    public putPrompt() {
      _StdOut.putText(this.promptStr);
    }

    public handleInput(buffer) {
      _Kernel.krnTrace("Shell Command~" + buffer);
      //
      // Parse the input...
      //
      var userCommand = this.parseInput(buffer);
      // ... and assign the command and args to local variables.
      var cmd = userCommand.command;
      var args = userCommand.args;
      //
      // Determine the command and execute it.
      //
      const maybeCommand = _OsShell.commandList.filter(c => c.command === cmd);
      if (maybeCommand.length === 1) {
        this.execute(maybeCommand[0].func, args);
      } else {
        // It's not found, so check for curses and apologies before declaring the command invalid.
        if (this.curses.indexOf("[" + Utils.rot13(cmd) + "]") >= 0) {
          // Check for curses.
          this.execute(this.shellCurse);
        } else if (this.apologies.indexOf("[" + cmd + "]") >= 0) {
          // Check for apologies.
          this.execute(this.shellApology);
        } else {
          // It's just a bad command. {
          this.execute(this.shellInvalidCommand);
        }
      }
    }

    // Note: args is an option parameter, ergo the ? which allows TypeScript to understand that.
    public execute(fn, args?) {
      // We just got a command, so advance the line...
      _StdOut.advanceLine();
      // ... call the command function passing in the args with some über-cool functional programming ...
      fn(args);
      // Check to see if we need to advance the line again
      if (_StdOut.currentXPosition > 0) {
        _StdOut.advanceLine();
      }
      // ... and finally write the prompt again.
      this.putPrompt();
    }

    public parseInput(buffer): UserCommand {
      // e.g. "help   VER  " -> ["help", "ver"]
      const cmdWords = buffer
        .trim()
        .toLowerCase()
        .split(" ")
        .map(word => word.trim());

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
      console.log(args);
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
  }
}
