export class WakeLockAdapter {
  static async request() {
    if ('wakeLock' in navigator) {
      try {
        const lock = await navigator.wakeLock.request('screen');
        console.log('[WakeLock] Screen WakeLock active.');
        return lock;
      } catch (err) {
        console.warn('[WakeLock] Request failed:', err.message);
      }
    } else {
      console.warn('[WakeLock] Navigator WakeLock API unsupported.');
    }
    return null;
  }
}
