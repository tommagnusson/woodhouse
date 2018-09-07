/* ------------
   Globals.ts

   Global CONSTANTS for values that never changed but referenced throughout OS.

   This code references page numbers in the text book:
   Operating System Concepts 8th edition by Silberschatz, Galvin, and Gagne.  ISBN 978-0-470-12872-5
   ------------ */

export enum Globals {
  APP_NAME = "Woodhouse", // c.f. Adult Swim show Archer
  APP_VERSION = "1.0.0",
  CPU_CLOCK_INTERVAL = 100,
  TIMER_IRQ = 0, // Pages 23 (timer), 9 (interrupts), and 561 (interrupt priority).
  KEYBOARD_IRQ = 1, // NOTE: The timer is different from hardware/host clock pulses. Don't confuse these.
  DEFAULT_FONT_FAMILY = "sans",
  DEFAULT_FONT_SIZE = 13,
  FONT_HEIGHT_MARGIN = 4 // Additional space added to font size when advancing a line
}
