///<reference path="../globals.ts" />
///<reference path="deviceDriver.ts" />

/* ----------------------------------
   DeviceDriverKeyboard.ts

   Requires deviceDriver.ts

   The Kernel Keyboard Device Driver.
   ---------------------------------- */

namespace TSOS {
  // Extends DeviceDriver
  export class DeviceDriverKeyboard extends DeviceDriver {
    constructor() {
      super();
    }

    public driverEntry(): void {
      // Initialization routine for this, the kernel-mode Keyboard Device Driver.
      this.status = 'loaded';
      // More?
    }

    public isr(params) {
      // Parse the params.    TODO: Check that the params are valid and osTrapError if not.
      const keyCode = params[0];
      const isShifted = params[1];
      _Kernel.krnTrace('Key code:' + keyCode + ' shifted:' + isShifted);
      let chr = '';

      // The javascript || will return the first nonnull/nonundefined value...
      // This is the type of short circuit behavior is fast
      const toBeEnqueued =
        this.determineChar(keyCode, isShifted) ||
        this.determineNumeric(keyCode, isShifted) ||
        this.determineSymbol(keyCode, isShifted) ||
        this.determineSpecial(keyCode, isShifted);

      if (toBeEnqueued) {
        _KernelInputQueue.enqueue(toBeEnqueued);
      }
    }

    private determineSpecial(keyCode, isShifted) {
      const specialCodeToChar = {
        8: '\b',
        9: '\t',
        13: String.fromCharCode(13),
        32: ' ',
        38: '↑',
        40: '↓'
      };
      return specialCodeToChar[keyCode];
    }

    private determineSymbol(keyCode, isShifted) {
      if (!isShifted) {
        const unshiftedCodeToChar = {
          192: '`',
          186: ';',
          187: '=',
          188: ',',
          189: '-',
          190: '.',
          191: '/',
          219: '[',
          220: '\\',
          221: ']',
          222: "'"
        };
        return unshiftedCodeToChar[keyCode];
      }
      const shiftedCodeToChar = {
        48: ')',
        49: '!',
        50: '@',
        51: '#',
        52: '$',
        53: '%',
        54: '^',
        55: '&',
        56: '*',
        57: '(',
        189: '_',
        187: '+',
        219: '{',
        221: '}',
        220: '|',
        186: ':',
        222: '"',
        188: '<',
        190: '>',
        191: '?',
        192: '~'
      };

      // vector sort of implementation of this
      return shiftedCodeToChar[keyCode];
    }

    private determineNumeric(keyCode, isShifted) {
      const numerics = { lowerInclusive: 48, upperInclusive: 57 };

      if (
        keyCode >= numerics.lowerInclusive &&
        keyCode <= numerics.upperInclusive &&
        !isShifted
      ) {
        return String.fromCharCode(keyCode);
      }
      // not a numeric
      return null;
    }

    private determineChar(keyCode, isShifted): string {
      const uppercase = { lowerInclusive: 65, upperInclusive: 90 };
      const lowercase = { lowerInclusive: 97, upperInclusive: 123 };
      const fromUpperToLowerDiff = 32;

      if (
        keyCode >= uppercase.lowerInclusive &&
        keyCode <= uppercase.upperInclusive
      ) {
        // shift means they want uppercase, which is the case anyways
        if (isShifted) {
          return String.fromCharCode(keyCode);
        }

        // convert keyCode into the lowercase
        return String.fromCharCode(keyCode + fromUpperToLowerDiff);
      }

      // uppercase anyways, we don't care about shift
      if (
        keyCode >= uppercase.lowerInclusive &&
        keyCode <= uppercase.upperInclusive
      ) {
        return String.fromCharCode(keyCode);
      }

      // not a char
      return null;
    }
  }
}
