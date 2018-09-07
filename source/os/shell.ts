import "../globals";

import Utils from "../utils";
import ShellCommand from "./shellCommand";
import UserCommand from "./userCommand";
import settings from "../settings";
import Console from "./console";
import { Globals } from "../globals";

/* ------------
   Shell.ts

   The OS Shell - The "command line interface" (CLI) for the console.

    Note: While fun and learning are the primary goals of all enrichment center activities,
          serious injuries may occur when trying to write your own Operating System.
   ------------ */

// TODO: Write a base class / prototype for system services and let Shell inherit from it.

export default class Shell {
  // Properties
  public promptStr = ">";
  public commandList = [];
  public curses =
    "[fuvg],[cvff],[shpx],[phag],[pbpxfhpxre],[zbgureshpxre],[gvgf]";
  public apologies = "[sorry]";

  public stdIn: Console;
  public stdOut: Console;

  // a function to be called for shutdown
  // should only be bestowed by the kernel
  private readonly shutDown: any;

  constructor(stdIn: Console, stdOut: Console, shutDown) {
    this.stdIn = stdIn;
    this.stdOut = stdOut;

    this.shutDown = shutDown;

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

    // ps  - list the running processes and their IDs
    // kill <id> - kills the specified process id.

    //
    // Display the initial prompt.
    this.putPrompt();
  }

  public putPrompt() {
    this.stdOut.putText(this.promptStr);
  }

  public handleInput(log?: any) {
    return buffer => {
      if (log) {
        log("Shell Command~" + buffer);
      }
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
      // TypeScript/JavaScript may not support associative arrays in all browsers so we have to iterate over the
      // command list in attempt to find a match.  TODO: Is there a better way? Probably. Someone work it out and tell me in class.
      var index: number = 0;
      var found: boolean = false;
      var fn = undefined;
      while (!found && index < this.commandList.length) {
        if (this.commandList[index].command === cmd) {
          found = true;
          fn = this.commandList[index].func;
        } else {
          ++index;
        }
      }
      if (found) {
        this.execute(fn, args);
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
    };
  }

  // Note: args is an option parameter, ergo the ? which allows TypeScript to understand that.
  public execute(fn, args?) {
    // We just got a command, so advance the line...
    this.stdOut.advanceLine();
    // ... call the command function passing in the args with some über-cool functional programming ...
    fn(args);
    // Check to see if we need to advance the line again
    if (this.stdOut.currentXPosition > 0) {
      this.stdOut.advanceLine();
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
    this.stdOut.putText("Invalid Command. ");
    if (settings.isSarcasticMode) {
      this.stdOut.putText("Unbelievable. You, [subject name here],");
      this.stdOut.advanceLine();
      this.stdOut.putText("must be the pride of [subject hometown here].");
    } else {
      this.stdOut.putText("Type 'help' for, well... help.");
    }
  }

  public shellCurse() {
    this.stdOut.putText("Oh, so that's how it's going to be, eh? Fine.");
    this.stdOut.advanceLine();
    this.stdOut.putText("Bitch.");
    settings.isSarcasticMode = true;
  }

  public shellApology() {
    if (settings.isSarcasticMode) {
      this.stdOut.putText("I think we can put our differences behind us.");
      this.stdOut.advanceLine();
      this.stdOut.putText("For science . . . You monster.");
      settings.isSarcasticMode = false;
    } else {
      this.stdOut.putText("For what?");
    }
  }

  public shellVer(args) {
    this.stdOut.putText(Globals.APP_NAME + " version " + Globals.APP_VERSION);
  }

  public shellHelp(args) {
    this.stdOut.putText("Commands:");
    for (var i in this.commandList) {
      this.stdOut.advanceLine();
      this.stdOut.putText(
        "  " +
          this.commandList[i].command +
          " " +
          this.commandList[i].description
      );
    }
  }

  public shellShutdown(args) {
    this.stdOut.putText("Shutting down...");
    // Call Kernel shutdown routine.
    this.shutDown();
    // TODO: Stop the final prompt from being displayed.  If possible.  Not a high priority.  (Damn OCD!)
  }

  public shellCls(args) {
    this.stdOut.clearScreen();
    this.stdOut.resetXY();
  }

  public shellMan(args) {
    if (args.length > 0) {
      var topic = args[0];
      switch (topic) {
        case "help":
          this.stdOut.putText(
            "Help displays a list of (hopefully) valid commands."
          );
          break;
        // TODO: Make descriptive MANual page entries for the the rest of the shell commands here.
        default:
          this.stdOut.putText("No manual entry for " + args[0] + ".");
      }
    } else {
      this.stdOut.putText("Usage: man <topic>  Please supply a topic.");
    }
  }

  public shellTrace(args) {
    if (args.length > 0) {
      var setting = args[0];
      switch (setting) {
        case "on":
          if (settings.isTraceEnabled && settings.isSarcasticMode) {
            this.stdOut.putText("Trace is already on, doofus.");
          } else {
            settings.isTraceEnabled = true;
            this.stdOut.putText("Trace ON");
          }
          break;
        case "off":
          settings.isTraceEnabled = false;
          this.stdOut.putText("Trace OFF");
          break;
        default:
          this.stdOut.putText("Invalid arguement.  Usage: trace <on | off>.");
      }
    } else {
      this.stdOut.putText("Usage: trace <on | off>");
    }
  }

  public shellRot13(args) {
    if (args.length > 0) {
      // Requires Utils.ts for rot13() function.
      this.stdOut.putText(
        args.join(" ") + " = '" + Utils.rot13(args.join(" ")) + "'"
      );
    } else {
      this.stdOut.putText("Usage: rot13 <string>  Please supply a string.");
    }
  }

  public shellPrompt(args) {
    if (args.length > 0) {
      this.promptStr = args[0];
    } else {
      this.stdOut.putText("Usage: prompt <string>  Please supply a string.");
    }
  }
}
