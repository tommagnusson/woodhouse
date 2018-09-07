export class Settings {
  public osClock = 0; // Page 23.
  public mode = Mode.KERNEL;
  public isTraceEnabled = true;
  public isSarcasticMode = false;
  public hardwareClockID = null;

  // For testing (and enrichment)...
  public glados = null;
}

export enum Mode {
  // See page 21.
  KERNEL,
  USER
}

const settings = new Settings();
export default settings;
