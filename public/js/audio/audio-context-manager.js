export class AudioContextManager {
  static instance = null;
  static keepAliveAudio = null;

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
    AudioContextManager.enableBackgroundKeepAlive();
    return ctx;
  }

  static enableBackgroundKeepAlive() {
    if (AudioContextManager.keepAliveAudio) return;
    try {
      // 1s silent WAV URI to anchor background WebAudio execution on mobile OSes
      const silentWav = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
      const audio = new Audio(silentWav);
      audio.loop = true;
      audio.volume = 0.01; // minimal non-zero stream activity for iOS hardware priority
      audio.play().catch(() => {});
      AudioContextManager.keepAliveAudio = audio;

      // Pipe keep-alive media element through MediaElementAudioSourceNode to explicitly lock AudioContext thread
      const ctx = AudioContextManager.getContext();
      if (ctx) {
        const source = ctx.createMediaElementSource(audio);
        const silentGain = ctx.createGain();
        silentGain.gain.value = 0.0001; // virtually silent
        source.connect(silentGain);
        silentGain.connect(ctx.destination);
      }

      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'Sino Cicatrizado',
          artist: 'Acoustic Membrane'
        });
      }
    } catch (_) {}
  }
}

