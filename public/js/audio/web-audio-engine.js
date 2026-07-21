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
    const soundType = params.soundType || 'bell_sacred';

    // Temporary local bitcrusher override if specified by params
    if (params.bitDepth && params.bitDepth < 16 && this.bitCrusher) {
      const origBits = this.bitCrusher.bits;
      this.bitCrusher.bits = Math.min(origBits, params.bitDepth);
      setTimeout(() => {
        if (this.bitCrusher) this.bitCrusher.bits = origBits;
      }, (delaySeconds + (params.decay || 2.0) + 1.0) * 1000);
    }

    switch (soundType) {
      case 'bell_deep':
        this.triggerDeepBell(params, triggerTime, delaySeconds);
        break;
      case 'drone':
        this.triggerDrone(params, triggerTime, delaySeconds);
        break;
      case 'industrial':
        this.triggerIndustrial(params, triggerTime, delaySeconds);
        break;
      case 'glitch':
        this.triggerGlitch(params, triggerTime, delaySeconds);
        break;
      case 'bell_sacred':
      default:
        this.triggerSacredBell(params, triggerTime, delaySeconds);
        break;
    }
  }

  // 1. Deep Atmospheric Drone Bell (Sub-bass, long 6-12s decay, detuned beating)
  triggerDeepBell(params, triggerTime, delaySeconds) {
    const baseFreq = params.baseFrequency || 110.0;
    const decay = params.decay || 6.0;
    const gainVal = params.gain !== undefined ? params.gain : 1.0;
    const partialRatios = CLIENT_CONFIG.AUDIO.DEEP_BELL_PARTIALS || [0.5, 1.0, 1.004, 1.414, 2.76];

    // Master envelope: peak at 1.0, gainVal applied per-partial only (prevent double-gain squaring)
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(1.0, triggerTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay + 0.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const cutoff = params.filterCutoff || 800.0;
    filter.frequency.setValueAtTime(cutoff, triggerTime);
    filter.frequency.exponentialRampToValueAtTime(120.0, triggerTime + decay);
    filter.Q.setValueAtTime(2.5, triggerTime);

    partialRatios.forEach((ratio, idx) => {
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      osc.type = params.carrierType || 'sine';
      osc.frequency.setValueAtTime(baseFreq * ratio, triggerTime);

      // gainVal applied here once — spatial distance attenuation is perceptually correct
      const partialAmp = (1.0 / (idx * 0.8 + 1)) * gainVal;
      oscGain.gain.setValueAtTime(0, this.ctx.currentTime);
      oscGain.gain.linearRampToValueAtTime(partialAmp, triggerTime + 0.08);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, triggerTime + (decay / (idx === 0 ? 0.8 : ratio)));

      osc.connect(oscGain);
      oscGain.connect(gainNode);

      osc.start(triggerTime);
      osc.stop(triggerTime + decay + 0.6);
    });

    gainNode.connect(filter);
    filter.connect(this.masterGain);

    this.scheduleCleanup([gainNode, filter], delaySeconds + decay + 1.0);
  }

  // 2. Continuous Sub-Bass Flux Drone (Layered saw/triangle, LFO lowpass modulation)
  triggerDrone(params, triggerTime, delaySeconds) {
    const baseFreq = params.baseFrequency || 65.0;
    const decay = params.decay || 8.0;
    const gainVal = params.gain !== undefined ? params.gain : 0.8;

    const droneGainNode = this.ctx.createGain();
    droneGainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    droneGainNode.gain.linearRampToValueAtTime(gainVal * 0.7, triggerTime + 1.5);
    droneGainNode.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const startCutoff = params.filterCutoff || 500.0;
    filter.frequency.setValueAtTime(startCutoff, triggerTime);

    // LFO modulation for filter cutoff
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(0.15, triggerTime); // 0.15 Hz slow LFO
    lfoGain.gain.setValueAtTime(250.0, triggerTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start(triggerTime);
    lfo.stop(triggerTime + decay + 0.5);

    // Layered detuned sub-oscillators
    [0.995, 1.0, 1.005, 2.0].forEach((ratio) => {
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      osc.type = params.carrierType || (ratio > 1.5 ? 'triangle' : 'sawtooth');
      osc.frequency.setValueAtTime(baseFreq * ratio, triggerTime);

      const amp = ratio > 1.5 ? 0.3 : 0.5;
      oscGain.gain.setValueAtTime(amp, triggerTime);

      osc.connect(oscGain);
      oscGain.connect(droneGainNode);

      osc.start(triggerTime);
      osc.stop(triggerTime + decay + 0.5);
    });

    droneGainNode.connect(filter);
    filter.connect(this.masterGain);

    this.scheduleCleanup([droneGainNode, filter, lfoGain], delaySeconds + decay + 1.0);
  }

  // 3. Industrial Somatic Friction (FM Synthesis + High-Q Resonant Noise Burst + Distortion Drive)
  triggerIndustrial(params, triggerTime, delaySeconds) {
    const carrierFreq = params.baseFrequency || 140.0;
    const fmRatio = params.harmonicity || 2.71;
    const modFreq = carrierFreq * fmRatio;
    const fmIndex = params.fmIndex !== undefined ? params.fmIndex : 4.5;
    const decay = params.decay || 1.2;
    const gainVal = params.gain !== undefined ? params.gain : 0.9;

    const mainGainNode = this.ctx.createGain();
    mainGainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    mainGainNode.gain.linearRampToValueAtTime(gainVal, triggerTime + 0.01);
    mainGainNode.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay);

    // FM Carrier
    const carrier = this.ctx.createOscillator();
    carrier.type = params.carrierType || 'sawtooth';
    carrier.frequency.setValueAtTime(carrierFreq, triggerTime);

    // FM Modulator
    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    modulator.type = 'sine';
    modulator.frequency.setValueAtTime(modFreq, triggerTime);
    modGain.gain.setValueAtTime(fmIndex * modFreq, triggerTime);
    modGain.gain.exponentialRampToValueAtTime(0.1, triggerTime + (decay * 0.7));

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    modulator.start(triggerTime);
    modulator.stop(triggerTime + decay);

    // Resonant Metallic Noise Strike
    const noiseBuffer = this.createNoiseBuffer(0.15); // 150ms noise burst
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(params.filterCutoff || 2500.0, triggerTime);
    noiseFilter.Q.setValueAtTime(18.0, triggerTime); // High Q metallic ring

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(gainVal * 0.8, triggerTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, triggerTime + 0.15);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseSource.start(triggerTime);

    // Distortion WaveShaper
    const waveShaper = this.ctx.createWaveShaper();
    waveShaper.curve = this.makeDistortionCurve(15);

    carrier.connect(mainGainNode);
    noiseGain.connect(mainGainNode);
    mainGainNode.connect(waveShaper);
    waveShaper.connect(this.masterGain);

    carrier.start(triggerTime);
    carrier.stop(triggerTime + decay + 0.1);

    this.scheduleCleanup([mainGainNode, noiseGain, noiseFilter, waveShaper], delaySeconds + decay + 0.5);
  }

  // 4. Forensic Glitch (Ring Modulation multiplier + micro-stutter bursts)
  triggerGlitch(params, triggerTime, delaySeconds) {
    const baseFreq = params.baseFrequency || 330.0;
    const decay = params.decay || 0.4;
    const gainVal = params.gain !== undefined ? params.gain : 0.9;

    const glitchGain = this.ctx.createGain();
    glitchGain.gain.setValueAtTime(0, this.ctx.currentTime);
    glitchGain.gain.linearRampToValueAtTime(gainVal, triggerTime + 0.005);
    glitchGain.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay);

    // Primary Square Carrier
    const carrier = this.ctx.createOscillator();
    carrier.type = 'square';
    carrier.frequency.setValueAtTime(baseFreq, triggerTime);

    // Ring Modulator Multiplier
    const ringMod = this.ctx.createOscillator();
    const ringGain = this.ctx.createGain();
    ringMod.type = 'square';
    ringMod.frequency.setValueAtTime(baseFreq * (params.harmonicity || 1.73), triggerTime);

    // Multiply signals via Gain Node modulation
    ringMod.connect(ringGain.gain);
    carrier.connect(ringGain);
    ringGain.connect(glitchGain);

    ringMod.start(triggerTime);
    carrier.start(triggerTime);
    ringMod.stop(triggerTime + decay);
    carrier.stop(triggerTime + decay);

    // Micro-stutter noise impulse
    const noiseBuffer = this.createNoiseBuffer(0.04);
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(params.filterCutoff || 3500.0, triggerTime);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(glitchGain);
    noiseSource.start(triggerTime);

    glitchGain.connect(this.masterGain);

    this.scheduleCleanup([glitchGain, ringGain, noiseFilter], delaySeconds + decay + 0.5);
  }

  // 5. Classic Sacred Bronze Bell
  triggerSacredBell(params, triggerTime, delaySeconds) {
    const baseFreq = params.baseFrequency || CLIENT_CONFIG.AUDIO.DEFAULT_FREQUENCY_HZ;
    const decay = params.decay || 1.5;
    const gainVal = params.gain !== undefined ? params.gain : 1.0;
    const partialRatios = CLIENT_CONFIG.AUDIO.INHARMONIC_PARTIALS;

    // Master envelope at 1.0 — gainVal applied per-partial only
    const bellGainNode = this.ctx.createGain();
    bellGainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    bellGainNode.gain.linearRampToValueAtTime(1.0, triggerTime + 0.05);
    bellGainNode.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay + 0.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(params.filterCutoff || 1200, triggerTime);
    filter.Q.setValueAtTime(1.5, triggerTime);

    partialRatios.forEach((ratio, idx) => {
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      osc.type = params.carrierType || 'sine';
      osc.frequency.setValueAtTime(baseFreq * ratio, triggerTime);

      // gainVal applied once here for spatial attenuation
      const partialAmp = (1.0 / (idx + 1)) * gainVal;
      oscGain.gain.setValueAtTime(0, this.ctx.currentTime);
      oscGain.gain.linearRampToValueAtTime(partialAmp, triggerTime + 0.05);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay / ratio);

      osc.connect(oscGain);
      oscGain.connect(bellGainNode);

      osc.start(triggerTime);
      osc.stop(triggerTime + decay + 0.6);
    });

    bellGainNode.connect(filter);
    filter.connect(this.masterGain);

    this.scheduleCleanup([bellGainNode, filter], delaySeconds + decay + 1.0);
  }

  // Helper: Create White/Pink Noise Buffer
  createNoiseBuffer(durationSeconds = 0.1) {
    const bufferSize = Math.max(1, Math.round(this.ctx.sampleRate * durationSeconds));
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // Helper: Soft-clipping WaveShaper Curve
  makeDistortionCurve(amount = 20) {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  scheduleCleanup(nodesArray = [], delayMs = 1000) {
    setTimeout(() => {
      nodesArray.forEach((node) => {
        try {
          if (node && typeof node.disconnect === 'function') node.disconnect();
        } catch {
          // Node already disconnected
        }
      });
    }, delayMs * 1000);
  }
}
