import { AbstractAudioEngine } from './abstract-engine.js';
import { AudioContextManager } from './audio-context-manager.js';
import { CLIENT_CONFIG } from '../config.js';

/**
 * Pure Procedural Spatial & Modal Audio Engine for Sino Cicatrizado.
 * 100% procedurally synthesized in real time — 0 external audio samples / files.
 */
export class WebAudioEngine extends AbstractAudioEngine {
  constructor() {
    super();
    this.ctx = null;
    this.bitCrusher = null;
    this.masterGain = null;
    this.limiter = null;
    this.currentBits = 16;

    // Procedural Convolver Space Nodes
    this.convolverCathedral = null;
    this.convolverMine = null;
    this.convolverValley = null;
  }

  async init() {
    this.ctx = AudioContextManager.getContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);

    // Limiter: prevents polyphonic summing from clipping when multiple nodes fire simultaneously
    this.limiter = this.ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -6;   // start compressing at -6dBFS
    this.limiter.knee.value = 3;
    this.limiter.ratio.value = 20;       // hard limiting
    this.limiter.attack.value = 0.003;   // 3ms — catches transients
    this.limiter.release.value = 0.25;   // 250ms — preserves bell tails

    // Connect masterGain through limiter to destination
    this.masterGain.connect(this.limiter);
    this.limiter.connect(this.ctx.destination);

    // -------------------------------------------------------------------------
    // 100% Procedural Convolver Impulse Response Generation (No Audio Files)
    // -------------------------------------------------------------------------

    // Cathedral / Church Tower Space (3.2s warm exponential decay)
    this.convolverCathedral = this.ctx.createConvolver();
    this.convolverCathedral.buffer = this.createProceduralImpulseResponse(3.2, 3.2);
    const cathedralGain = this.ctx.createGain();
    cathedralGain.gain.setValueAtTime(0.30, this.ctx.currentTime);
    this.convolverCathedral.connect(cathedralGain);
    cathedralGain.connect(this.masterGain);

    // Mine / Subterranean Chamber Space (1.4s dense metallic early reflections)
    this.convolverMine = this.ctx.createConvolver();
    this.convolverMine.buffer = this.createProceduralImpulseResponse(1.4, 4.8, { metalRing: true });
    const mineGain = this.ctx.createGain();
    mineGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    this.convolverMine.connect(mineGain);
    mineGain.connect(this.masterGain);

    // Mountain Valley Space (5.0s long diffuse tail)
    this.convolverValley = this.ctx.createConvolver();
    this.convolverValley.buffer = this.createProceduralImpulseResponse(5.0, 2.2);
    const valleyGain = this.ctx.createGain();
    valleyGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    this.convolverValley.connect(valleyGain);
    valleyGain.connect(this.masterGain);
  }

  async resume() {
    return await AudioContextManager.ensureResumed();
  }

  /**
   * Generates a 100% procedural stereo Impulse Response AudioBuffer directly in JavaScript.
   */
  createProceduralImpulseResponse(durationSeconds = 2.0, decayRate = 3.0, options = {}) {
    const sampleRate = this.ctx.sampleRate;
    const length = Math.max(1, Math.round(sampleRate * durationSeconds));
    const buffer = this.ctx.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / length;
      const envelope = Math.exp(-t * decayRate);

      let nL = (Math.random() * 2 - 1);
      let nR = (Math.random() * 2 - 1);

      if (options.metalRing) {
        // Metallic modal comb ringing for subterranean mine acoustics
        const ring = Math.sin(i * 0.08) * 0.35 + Math.sin(i * 0.21) * 0.2;
        nL = nL * 0.6 + ring;
        nR = nR * 0.6 + ring;
      }

      left[i] = nL * envelope;
      right[i] = nR * envelope;
    }

    return buffer;
  }

  updateBatteryLevel(batteryLevel) {
    let newBits;
    if (batteryLevel >= 0.5) {
      newBits = 16;
    } else if (batteryLevel >= 0.15) {
      newBits = Math.round(4 + ((batteryLevel - 0.15) / 0.35) * 12);
    } else {
      newBits = 4;
    }

    if (newBits === this.currentBits) return;
    this.currentBits = newBits;

    if (newBits >= 16) {
      // Bypass bitcrusher — clean direct path through limiter
      if (this.bitCrusher) {
        try {
          this.masterGain.disconnect(this.bitCrusher);
          this.bitCrusher.disconnect(this.limiter);
        } catch (_) {}
        this.bitCrusher = null;
      }
      this.masterGain.connect(this.limiter);
    } else {
      // Insert bitcrusher for low-battery degradation effect
      if (!this.bitCrusher) {
        const bufferSize = 4096;
        this.bitCrusher = this.ctx.createScriptProcessor(bufferSize, 1, 1);
        this.bitCrusher.onaudioprocess = (e) => {
          const input = e.inputBuffer.getChannelData(0);
          const output = e.outputBuffer.getChannelData(0);
          const step = Math.pow(0.5, this.bitCrusher.bits || 8);
          for (let i = 0; i < input.length; i++) {
            output[i] = step * Math.round(input[i] / step);
          }
        };
        try { this.masterGain.disconnect(this.limiter); } catch (_) {}
        this.masterGain.connect(this.bitCrusher);
        this.bitCrusher.connect(this.limiter);
      }
      this.bitCrusher.bits = newBits;
    }

    const pill = document.getElementById('pill-battery');
    if (pill) pill.textContent = `BATTERY: ${Math.round(batteryLevel * 100)}% (${newBits}-BIT)`;
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

  // 1. Deep Atmospheric Bronze Bell (Physical Modal Synthesis + Cathedral Convolver)
  triggerDeepBell(params, triggerTime, delaySeconds) {
    const baseFreq = params.baseFrequency || 110.0;
    const decay = params.decay || 6.0;
    const gainVal = params.gain !== undefined ? params.gain : 1.0;

    // Physical bronze modal frequency ratios: Hum, Prime, Tierce (minor 3rd), Quint, Nominal, Supernominal
    const modalRatios = [0.5, 1.0, 1.20, 1.50, 2.0, 2.76, 3.25];

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(1.0, triggerTime + 0.08);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay + 0.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const cutoff = params.filterCutoff || 800.0;
    filter.frequency.setValueAtTime(cutoff, triggerTime);
    filter.frequency.exponentialRampToValueAtTime(140.0, triggerTime + decay);
    filter.Q.setValueAtTime(2.2, triggerTime);

    modalRatios.forEach((ratio, idx) => {
      // Twin detuned oscillators for physical acoustic beating (cast metal warble)
      const oscA = this.ctx.createOscillator();
      const oscB = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      const freq = baseFreq * ratio;
      const detuneHz = idx === 0 ? 0.0 : 0.35 * (idx % 2 === 0 ? 1 : -1);

      oscA.type = params.carrierType || 'sine';
      oscB.type = params.carrierType || 'sine';

      oscA.frequency.setValueAtTime(freq, triggerTime);
      oscB.frequency.setValueAtTime(freq + detuneHz, triggerTime);

      const partialAmp = (1.0 / (idx * 0.75 + 1)) * gainVal * 0.5;
      oscGain.gain.setValueAtTime(0, this.ctx.currentTime);
      oscGain.gain.linearRampToValueAtTime(partialAmp, triggerTime + 0.06);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, triggerTime + (decay / (idx === 0 ? 0.75 : ratio)));

      oscA.connect(oscGain);
      oscB.connect(oscGain);
      oscGain.connect(gainNode);

      oscA.start(triggerTime);
      oscB.start(triggerTime);
      oscA.stop(triggerTime + decay + 0.6);
      oscB.stop(triggerTime + decay + 0.6);
    });

    gainNode.connect(filter);
    filter.connect(this.masterGain);
    if (this.convolverCathedral) {
      filter.connect(this.convolverCathedral);
    }

    this.scheduleCleanup([gainNode, filter], delaySeconds + decay + 1.0);
  }

  // 2. Continuous Sub-Bass Flux Drone (Procedural Mountain Valley Convolver)
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
    if (this.convolverValley) {
      filter.connect(this.convolverValley);
    }

    this.scheduleCleanup([droneGainNode, filter, lfoGain], delaySeconds + decay + 1.0);
  }

  // 3. Industrial Somatic Friction (FM Synthesis + Metallic Noise Strike + Mine Chamber Convolver)
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
    if (this.convolverMine) {
      waveShaper.connect(this.convolverMine);
    }

    carrier.start(triggerTime);
    carrier.stop(triggerTime + decay + 0.1);

    this.scheduleCleanup([mainGainNode, noiseGain, noiseFilter, waveShaper], delaySeconds + decay + 0.5);
  }

  // 4. Forensic Glitch (Ring Modulation multiplier + micro-stutter bursts + Mine Convolver)
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
    if (this.convolverMine) {
      glitchGain.connect(this.convolverMine);
    }

    this.scheduleCleanup([glitchGain, ringGain, noiseFilter], delaySeconds + decay + 0.5);
  }

  // 5. Classic Sacred Bronze Bell (Physical Modal Synthesis + Cathedral Convolver)
  triggerSacredBell(params, triggerTime, delaySeconds) {
    const baseFreq = params.baseFrequency || CLIENT_CONFIG.AUDIO.DEFAULT_FREQUENCY_HZ;
    const decay = params.decay || 1.5;
    const gainVal = params.gain !== undefined ? params.gain : 1.0;

    // Physical colonial bronze bell modal ratios (Hum, Prime, Tierce minor 3rd, Quint, Nominal, Supernominal)
    const modalRatios = [0.5, 1.0, 1.20, 1.50, 2.0, 2.76, 3.25];

    const bellGainNode = this.ctx.createGain();
    bellGainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    bellGainNode.gain.linearRampToValueAtTime(1.0, triggerTime + 0.05);
    bellGainNode.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay + 0.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(params.filterCutoff || 1200, triggerTime);
    filter.Q.setValueAtTime(1.5, triggerTime);

    modalRatios.forEach((ratio, idx) => {
      // Twin detuned oscillators for physical acoustic beating
      const oscA = this.ctx.createOscillator();
      const oscB = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      const freq = baseFreq * ratio;
      const detuneHz = idx === 0 ? 0.0 : 0.35 * (idx % 2 === 0 ? 1 : -1);

      oscA.type = params.carrierType || 'sine';
      oscB.type = params.carrierType || 'sine';

      oscA.frequency.setValueAtTime(freq, triggerTime);
      oscB.frequency.setValueAtTime(freq + detuneHz, triggerTime);

      const partialAmp = (1.0 / (idx + 1)) * gainVal * 0.5;
      oscGain.gain.setValueAtTime(0, this.ctx.currentTime);
      oscGain.gain.linearRampToValueAtTime(partialAmp, triggerTime + 0.05);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay / ratio);

      oscA.connect(oscGain);
      oscB.connect(oscGain);
      oscGain.connect(bellGainNode);

      oscA.start(triggerTime);
      oscB.start(triggerTime);
      oscA.stop(triggerTime + decay + 0.6);
      oscB.stop(triggerTime + decay + 0.6);
    });

    bellGainNode.connect(filter);
    filter.connect(this.masterGain);
    if (this.convolverCathedral) {
      filter.connect(this.convolverCathedral);
    }

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
