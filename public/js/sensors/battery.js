export class BatterySensor {
  static async getLevel() {
    if ('getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        return battery.level;
      } catch {
        return 1.0;
      }
    }
    // iOS Safari fallback (Battery API unsupported)
    return 1.0;
  }

  static async watchLevel(onChangeCallback) {
    if ('getBattery' in navigator) {
      try {
        const battery = await navigator.getBattery();
        battery.addEventListener('levelchange', () => {
          onChangeCallback(battery.level);
        });
        onChangeCallback(battery.level);
      } catch {
        onChangeCallback(1.0);
      }
    } else {
      onChangeCallback(1.0);
    }
  }
}
