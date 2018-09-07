// Entry point of the application

import Control from "./host/control";
import settings from "./settings";
import Host from "./host/devices";
import Cpu from "./host/cpu";
import Kernel from "./os/kernel";

// from glados-ipX.js, used to test
const Glados: any = null;
var control: Control;

// Link HTML with JS methods
const hookupHTML = () => {
  const idToAction = {
    btnStartOS: Control.hostBtnStartOS_click,
    btnHaltOS: Control.hostBtnHaltOS_click,
    btnReset: Control.hostBtnReset_click
  };
  for (let btnId in idToAction) {
    document.getElementById(btnId).onclick(idToAction[btnId]);
  }
};

console.log("something");

document.addEventListener("DOMContentLoaded", () => {
  hookupHTML();

  console.log("onload");

  // fires off loading up the hosts

  const cpu = new Cpu();
  const kernel = new Kernel(cpu);
  const host = new Host(kernel);
  Control.hostInit(host);
  if (typeof Glados === "function") {
    settings.glados = new Glados();
    settings.glados.init();

    // injects glados right after the startup
    Control.addAfterStartupCallback(settings.glados.afterStartup);
  }
});
