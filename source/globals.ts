/* ------------
   Globals.ts

   Global CONSTANTS and _Variables.
   (Global over both the OS and Hardware Simulation / Host.)

   This code references page numbers in the text book:
   Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
   ------------ */

//
// Global CONSTANTS (TypeScript 1.5 introduced const. Very cool.)
//
const APP_NAME: string = 'Woodhouse'; // see: TV Show Archer
const APP_VERSION: string = '1.0.0';

const CPU_CLOCK_INTERVAL: number = 100; // This is in ms (milliseconds) so 1000 = 1 second.

enum IRQ {
  TIMER_IRQ,
  KEYBOARD_IRQ,
  LOAD_PROGRAM_IRQ,
  RUN_PROGRAM_IRQ,
  BREAK_PROGRAM_IRQ,
  ERR_PROGRAM_IRQ,
  REQ_CLEAR_MEM_IRQ,
  CONTEXT_SWITCH_IRQ,
  RUN_ALL_PROGRAMS_IRQ,
  KILL_PROGRAM,
  FILE_SYSTEM_IRQ
}

const KEYBOARD_IRQ = IRQ.KEYBOARD_IRQ.valueOf();

enum ScheduleType {
  RoundRobin
}
//
// Global Variables
// TODO: Make a global object and use that instead of the "_" naming convention in the global namespace.
//
var _Memory: TSOS.Memory;
var _MemoryGuardian: TSOS.MemoryGuardian;
var _CPU: TSOS.Cpu; // Utilize TypeScript's type annotation system to ensure that _CPU is an instance of the Cpu class.
var _Scheduler: TSOS.Scheduler;

var _OSclock: number = 0; // Page 23.

var _Mode: number = 0; // (currently unused)  0 = Kernel Mode, 1 = User Mode.  See page 21.

var _ProgramInput: HTMLTextAreaElement;
var _Canvas: HTMLCanvasElement; // Initialized in Control.hostInit().
var _DrawingContext: any; // = _Canvas.getContext("2d");  // Assigned here for type safety, but re-initialized in Control.hostInit() for OCD and logic.
var _DefaultFontFamily: string = 'sans'; // Ignored, I think. The was just a place-holder in 2008, but the HTML canvas may have use for it.
var _DefaultFontSize: number = 13;
var _FontHeightMargin: number = 4; // Additional space added to font size when advancing a line.

var _Trace: boolean = true; // Default the OS trace to be on.

// The OS Kernel and its queues.
var _Kernel: TSOS.Kernel;
var _KernelInterruptQueue: TSOS.Queue<any>;
var _KernelInputQueue: TSOS.Queue<any>;
var _KernelBuffers: any[];

// Standard input and output
var _StdIn; // Same "to null or not to null" issue as above.
var _StdOut;

// UI
var _Console: TSOS.Console;
var _OsShell: TSOS.Shell;

// At least this OS is not trying to kill you. (Yet.)
var _SarcasticMode: boolean = false;
var _SingleStepIsEnabled: boolean = false;
var _ShouldStep: boolean = false;

var _krnKeyboardDriver: TSOS.DeviceDriver;
let _Disk: TSOS.Disk;
let _krnFileSystemDriver: TSOS.FileSystemDeviceDriver; // just going with the global pattern for now
// let it be known I hate it though...

var _hardwareClockID: number = null;

// For testing (and enrichment)...
var Glados: any = null; // This is the function Glados() in glados.js on Labouseur.com.
var _GLaDOS: any = null; // If the above is linked in, this is the instantiated instance of Glados.

var _Status: string = '';

var onDocumentLoad = function() {
  TSOS.Control.hostInit();
};
