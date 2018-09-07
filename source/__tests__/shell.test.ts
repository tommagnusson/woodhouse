// // Setup reference: https://github.com/basarat/typescript-book/blob/master/docs/testing/jest.md

// import "../globals.ts";
// import "../host/control.ts";
// import "../host/cpu.ts";

// import "../os/interrupt.ts";
// import "../os/canvastext.ts";
// import "../os/console.ts";
// import "../os/deviceDriver.ts";
// import "../os/deviceDriverKeyboard.ts";
// import "../os/queue.ts";
// import "../os/shell.ts";
// import "../os/shellCommand.ts";
// import "../os/userCommand.ts";
// import "../os/kernel.ts";

// // describe('shell commands', () => {
// //   // beforeEach(() => {
// //   //   TSOS.Control.hostInit();
// //   // });

// //   // test('ver command', () => {

// //   // });
// // });

// describe("shell methods", () => {
//   test("parse input", () => {
//     const commandBuffer = "  cmd arg1   ARG2  arg3  ";

//     const userCommand = _OsShell.parseInput(commandBuffer);

//     expect(userCommand.command).toEqual("cmd");
//     expect(userCommand.args).toEqual(["arg1", "arg2", "arg3"]);
//   });
// });
