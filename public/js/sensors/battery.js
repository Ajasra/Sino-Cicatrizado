export class BatterySensor {
  static async getLevel() {
    if ('getBattery' in navigator && typeof navigator.getBattery === 'function') {
      try {
        const battery = await navigator.getBattery();
        if (battery && typeof battery.level === 'number' && !isNaN(battery.level)) {
          return battery.level;
        }
      } catch {
        return 1.0;
      }
    }
    return 1.0;
  }

  static async watchLevel(onChangeCallback) {
    if ('getBattery' in navigator && typeof navigator.getBattery === 'function') {
      try {
        const battery = await navigator.getBattery();
        if (battery && typeof battery.level === 'number' && !isNaN(battery.level)) {
          const update = () => {
            if (typeof battery.level === 'number' && !isNaN(battery.level)) {
              onChangeCallback(battery.level);
            }
          };
          battery.addEventListener('levelchange', update);
          battery.addEventListener('chargingchange', update);
          update();
          return;
        }
      } catch (e) {
        console.warn('[BatterySensor] getBattery error:', e);
      }
    }
    onChangeCallback(1.0);
  }
}
