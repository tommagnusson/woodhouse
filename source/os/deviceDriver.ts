/* ------------------------------
     DeviceDriver.ts

     The "base class" for all Device Drivers.
     ------------------------------ */

namespace TSOS {
  export abstract class DeviceDriver {
    public version = '0.07';
    public status = 'unloaded';
    public preemptable = false;

    abstract driverEntry(): void;
    abstract isr(params: [any]): void;
  }
}
