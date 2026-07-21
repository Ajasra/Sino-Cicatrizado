export class AudioContextManager {
  static instance = null;

  static getContext() {
    if (!AudioContextManager.instance) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      AudioContextManager.instance = new AudioCtx();
    }
    return AudioContextManager.instance;
  }

  static async ensureResumed() {
    const ctx = AudioContextManager.getContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    return ctx;
  }
}
