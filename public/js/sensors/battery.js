export class BatterySensor {
  static async getLevel() {
    if ('getBattery' in navigator && typeof navigator.getBattery === 'function') {
      try {
        const battery = await navigator.getBattery();
        if (battery && typeof battery.level === 'number' && !isNaN(battery.level)) {
          return battery.level;
        }
      } catch {
        // Fallback below
      }
    }
    return 1.0;
  }

  static async watchLevel(onChangeCallback) {
    let handled = false;

    if ('getBattery' in navigator && typeof navigator.getBattery === 'function') {
      try {
        const battery = await navigator.getBattery();
        if (battery && typeof battery.level === 'number' && !isNaN(battery.level)) {
          handled = true;
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

    if (!handled) {
      // Fallback: Notify initial state (1.0). Allow double-clicking battery pill to simulate lower battery levels for testing.
      onChangeCallback(1.0);
    }
  }
}

