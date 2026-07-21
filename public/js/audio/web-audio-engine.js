import { AbstractAudioEngine } from './abstract-engine.js';
import { AudioContextManager } from './audio-context-manager.js';
import { CLIENT_CONFIG } from '../config.js';

export class WebAudioEngine extends AbstractAudioEngine {
  constructor() {
    super();
    this.ctx = null;
    this.bitCrusher = null;
    this.masterGain = null;
    this.currentBits = 16;
  }

  async init() {
    this.ctx = AudioContextManager.getContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);

    this.setupBitCrusherNode();
    this.masterGain.connect(this.bitCrusher);
    this.bitCrusher.connect(this.ctx.destination);
  }

  async resume() {
    return await AudioContextManager.ensureResumed();
  }

  setupBitCrusherNode() {
    // 4096 buffer size for ScriptProcessor downsampling
    const bufferSize = 4096;
    this.bitCrusher = this.ctx.createScriptProcessor(bufferSize, 1, 1);
    this.bitCrusher.bits = 16;

    this.bitCrusher.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const output = e.outputBuffer.getChannelData(0);

      const bits = this.bitCrusher.bits || 16;
      if (bits >= 16) {
        // High fidelity state: direct pass-through
        for (let i = 0; i < input.length; i++) {
          output[i] = input[i];
        }
      } else {
        // Quantization bit reduction representing thermodynamic node exhaustion
        const step = Math.pow(0.5, bits);
        for (let i = 0; i < input.length; i++) {
          output[i] = step * Math.round(input[i] / step);
        }
      }
    };
  }

  updateBatteryLevel(batteryLevel) {
    if (batteryLevel >= 0.5) {
      this.currentBits = 16;
    } else if (batteryLevel < 0.5 && batteryLevel >= 0.15) {
      this.currentBits = Math.round(4 + ((batteryLevel - 0.15) / 0.35) * 12);
    } else {
      this.currentBits = 4; // Severe quantization and digital dirt
    }

    if (this.bitCrusher) {
      this.bitCrusher.bits = this.currentBits;
    }
  }

  triggerBell(params = {}, delaySeconds = 0) {
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const triggerTime = now + Math.max(0, delaySeconds);
    const baseFreq = params.baseFrequency || CLIENT_CONFIG.AUDIO.DEFAULT_FREQUENCY_HZ;
    const decay = params.decay || 1.5;
    const gainVal = params.gain !== undefined ? params.gain : 1.0;
    const partialRatios = CLIENT_CONFIG.AUDIO.INHARMONIC_PARTIALS;

    const bellGainNode = this.ctx.createGain();
    bellGainNode.gain.setValueAtTime(0, now);
    bellGainNode.gain.linearRampToValueAtTime(gainVal, triggerTime + 0.05);
    bellGainNode.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay + 0.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, triggerTime);
    filter.Q.setValueAtTime(1.5, triggerTime);

    const activeOscillators = [];

    partialRatios.forEach((ratio, idx) => {
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      osc.type = params.carrierType || 'sine';
      osc.frequency.setValueAtTime(baseFreq * ratio, triggerTime);

      const partialAmp = (1.0 / (idx + 1)) * gainVal;
      oscGain.gain.setValueAtTime(0, now);
      oscGain.gain.linearRampToValueAtTime(partialAmp, triggerTime + 0.05);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay / ratio);

      osc.connect(oscGain);
      oscGain.connect(bellGainNode);

      osc.start(triggerTime);
      osc.stop(triggerTime + decay + 0.6);
      activeOscillators.push(osc);
    });

    bellGainNode.connect(filter);
    filter.connect(this.masterGain);

    // Audio node cleanup after decay
    setTimeout(() => {
      try {
        bellGainNode.disconnect();
        filter.disconnect();
      } catch {
        // Node already cleaned up
      }
    }, (delaySeconds + decay + 1.0) * 1000);
  }
}
