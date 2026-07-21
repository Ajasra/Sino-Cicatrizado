export class AbstractAudioEngine {
  async init() {
    throw new Error('Abstract method init() must be implemented.');
  }

  async resume() {
    throw new Error('Abstract method resume() must be implemented.');
  }

  triggerBell(params, delaySeconds = 0) {
    throw new Error('Abstract method triggerBell() must be implemented.');
  }

  updateBatteryLevel(batteryLevel) {
    throw new Error('Abstract method updateBatteryLevel() must be implemented.');
  }
}
