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
    this.convolverWindCanyon = null;
    this.convolverSteelBridge = null;

    this.currentCityProfile = 'ouro_preto';
  }

  setCityAcousticProfile(cityKey) {
    this.currentCityProfile = cityKey || 'ouro_preto';
    console.log(`[AudioEngine] Switched acoustic profile to: ${this.currentCityProfile}`);
  }

  async init() {
    this.ctx = AudioContextManager.getContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);

    // Limiter: prevents polyphonic summing from clipping when multiple nodes fire simultaneously
    this.limiter = this.ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -12;  // transparent ceiling at -12dBFS
    this.limiter.knee.value = 6;
    this.limiter.ratio.value = 12;       // smooth soft limiting
    this.limiter.attack.value = 0.005;   // 5ms attack to catch transients smoothly
    this.limiter.release.value = 0.20;   // 200ms release

    // Connect masterGain through limiter to destination
    this.masterGain.connect(this.limiter);
    this.limiter.connect(this.ctx.destination);

    // -------------------------------------------------------------------------
    // Procedural Convolver Impulse Response Generation
    // -------------------------------------------------------------------------

    // Ouro Preto: Cathedral / Church Tower Space (3.0s warm exponential lowpass decay)
    this.convolverCathedral = this.ctx.createConvolver();
    this.convolverCathedral.buffer = this.createProceduralImpulseResponse(3.0, 3.5, { lpCutoff: 1800 });
    const cathedralGain = this.ctx.createGain();
    cathedralGain.gain.setValueAtTime(0.20, this.ctx.currentTime);
    this.convolverCathedral.connect(cathedralGain);
    cathedralGain.connect(this.masterGain);

    // Ouro Preto: Mine / Subterranean Chamber Space (1.2s dense lowpass metallic reflections)
    this.convolverMine = this.ctx.createConvolver();
    this.convolverMine.buffer = this.createProceduralImpulseResponse(1.2, 5.0, { metalRing: true, lpCutoff: 2400 });
    const mineGain = this.ctx.createGain();
    mineGain.gain.setValueAtTime(0.22, this.ctx.currentTime);
    this.convolverMine.connect(mineGain);
    mineGain.connect(this.masterGain);

    // Ouro Preto: Mountain Valley Space (4.5s long lowpass diffuse tail)
    this.convolverValley = this.ctx.createConvolver();
    this.convolverValley.buffer = this.createProceduralImpulseResponse(4.5, 2.5, { lpCutoff: 1200 });
    const valleyGain = this.ctx.createGain();
    valleyGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    this.convolverValley.connect(valleyGain);
    valleyGain.connect(this.masterGain);

    // Chicago: Lake Michigan Wind Canyon Space (4.0s wide open atmospheric reverb)
    this.convolverWindCanyon = this.ctx.createConvolver();
    this.convolverWindCanyon.buffer = this.createProceduralImpulseResponse(4.0, 2.0, { lpCutoff: 3000 });
    const windGain = this.ctx.createGain();
    windGain.gain.setValueAtTime(0.22, this.ctx.currentTime);
    this.convolverWindCanyon.connect(windGain);
    windGain.connect(this.masterGain);

    // Chicago: Steel Bridge & River Corridor Space (1.8s metallic beam impulse)
    this.convolverSteelBridge = this.ctx.createConvolver();
    this.convolverSteelBridge.buffer = this.createProceduralImpulseResponse(1.8, 4.0, { metalRing: true, lpCutoff: 3500 });
    const bridgeGain = this.ctx.createGain();
    bridgeGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    this.convolverSteelBridge.connect(bridgeGain);
    bridgeGain.connect(this.masterGain);
  }

  async resume() {
    return await AudioContextManager.ensureResumed();
  }

  /**
   * Generates a 100% procedural stereo Impulse Response AudioBuffer directly in JavaScript.
   * Uses lowpass noise smoothing to eliminate static/hiss.
   */
  createProceduralImpulseResponse(durationSeconds = 2.0, decayRate = 3.0, options = {}) {
    const sampleRate = this.ctx.sampleRate;
    const length = Math.max(1, Math.round(sampleRate * durationSeconds));
    const buffer = this.ctx.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    const targetCutoff = options.lpCutoff || 2000;
    const lpCoeff = Math.exp(-2 * Math.PI * targetCutoff / sampleRate);

    let lastL = 0;
    let lastR = 0;

    for (let i = 0; i < length; i++) {
      const t = i / length;
      const envelope = Math.exp(-t * decayRate);
      const damp = Math.exp(-t * (decayRate * 2.2));

      let rawL = (Math.random() * 2 - 1);
      let rawR = (Math.random() * 2 - 1);

      if (options.metalRing) {
        const ring = Math.sin(i * 0.08) * 0.25 + Math.sin(i * 0.21) * 0.15;
        rawL = rawL * 0.6 + ring;
        rawR = rawR * 0.6 + ring;
      }

      // Lowpass filtering to eliminate static hiss
      lastL = lastL * lpCoeff + rawL * (1 - lpCoeff);
      lastR = lastR * lpCoeff + rawR * (1 - lpCoeff);

      left[i] = (lastL * damp + rawL * envelope * 0.08);
      right[i] = (lastR * damp + rawR * envelope * 0.08);
    }

    // Peak normalization
    let maxPeak = 0;
    for (let i = 0; i < length; i++) {
      maxPeak = Math.max(maxPeak, Math.abs(left[i]), Math.abs(right[i]));
    }
    if (maxPeak > 0) {
      for (let i = 0; i < length; i++) {
        left[i] = (left[i] / maxPeak) * 0.35;
        right[i] = (right[i] / maxPeak) * 0.35;
      }
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
    let soundType = params.soundType;

    if (!soundType) {
      soundType = this.currentCityProfile === 'chicago' ? 'chicago_foghorn' : 'bell_sacred';
    }

    // Temporary local bitcrusher override if specified by params
    if (params.bitDepth && params.bitDepth < 16 && this.bitCrusher) {
      const origBits = this.bitCrusher.bits;
      this.bitCrusher.bits = Math.min(origBits, params.bitDepth);
      setTimeout(() => {
        if (this.bitCrusher) this.bitCrusher.bits = origBits;
      }, (delaySeconds + (params.decay || 2.0) + 1.0) * 1000);
    }

    switch (soundType) {
      case 'chicago_rail':
      case 'rail':
        this.triggerChicagoRail(params, triggerTime, delaySeconds);
        break;
      case 'chicago_wind':
      case 'wind':
        this.triggerChicagoWind(params, triggerTime, delaySeconds);
        break;
      case 'chicago_foghorn':
      case 'foghorn':
        this.triggerChicagoFoghorn(params, triggerTime, delaySeconds);
        break;
      case 'chicago_bridge':
      case 'bridge':
        this.triggerChicagoBridge(params, triggerTime, delaySeconds);
        break;
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
        if (this.currentCityProfile === 'chicago') {
          this.triggerChicagoFoghorn(params, triggerTime, delaySeconds);
        } else {
          this.triggerSacredBell(params, triggerTime, delaySeconds);
        }
        break;
    }
  }

  // -------------------------------------------------------------------------
  // Chicago Procedural Acoustic Generators
  // -------------------------------------------------------------------------

  // A. Elevated L-Train Rail Track Clatter & Iron Friction
  triggerChicagoRail(params, triggerTime, delaySeconds) {
    const baseFreq = params.baseFrequency || 140.0;
    const decay = params.decay || 1.8;
    const gainVal = params.gain !== undefined ? params.gain : 0.85;

    const mainGainNode = this.ctx.createGain();
    mainGainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    mainGainNode.gain.linearRampToValueAtTime(gainVal * 0.5, triggerTime + 0.015);
    mainGainNode.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay);

    // FM Sawtooth / Square Carrier for metallic iron rail sound
    const carrier = this.ctx.createOscillator();
    carrier.type = params.carrierType || 'sawtooth';
    carrier.frequency.setValueAtTime(baseFreq, triggerTime);

    const modulator = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    modulator.type = 'square';
    modulator.frequency.setValueAtTime(baseFreq * (params.harmonicity || 2.1), triggerTime);
    modGain.gain.setValueAtTime((params.fmIndex || 4.5) * baseFreq, triggerTime);
    modGain.gain.exponentialRampToValueAtTime(0.1, triggerTime + (decay * 0.6));

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    modulator.start(triggerTime);
    modulator.stop(triggerTime + decay);

    // Rhythmic Wheel Click Transient
    const noiseBuffer = this.createNoiseBuffer(0.05); // 50ms click
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(params.filterCutoff || 2800.0, triggerTime);
    noiseFilter.Q.setValueAtTime(6.0, triggerTime);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(gainVal * 0.25, triggerTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, triggerTime + 0.05);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseSource.start(triggerTime);

    carrier.connect(mainGainNode);
    noiseGain.connect(mainGainNode);

    mainGainNode.connect(this.masterGain);
    if (this.convolverSteelBridge) {
      mainGainNode.connect(this.convolverSteelBridge);
    }

    carrier.start(triggerTime);
    carrier.stop(triggerTime + decay + 0.1);

    this.scheduleCleanup([mainGainNode, noiseFilter, noiseGain], delaySeconds + decay + 0.5);
  }

  // B. Skyscraper Wind Tunnel & Lake Michigan Wind Gale Whistle
  triggerChicagoWind(params, triggerTime, delaySeconds) {
    const baseFreq = params.baseFrequency || 220.0;
    const decay = params.decay || 5.0;
    const gainVal = params.gain !== undefined ? params.gain : 0.7;

    const mainGainNode = this.ctx.createGain();
    mainGainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    mainGainNode.gain.linearRampToValueAtTime(gainVal * 0.4, triggerTime + 0.8);
    mainGainNode.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay);

    // Whistling Wind Resonant Sine Sweeper
    const oscA = this.ctx.createOscillator();
    const oscB = this.ctx.createOscillator();
    oscA.type = 'sine';
    oscB.type = 'triangle';

    oscA.frequency.setValueAtTime(baseFreq, triggerTime);
    oscA.frequency.exponentialRampToValueAtTime(baseFreq * 1.6, triggerTime + (decay * 0.5));
    oscA.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, triggerTime + decay);

    oscB.frequency.setValueAtTime(baseFreq * 1.5, triggerTime);
    oscB.frequency.exponentialRampToValueAtTime(baseFreq * 2.1, triggerTime + (decay * 0.6));

    // High Q Bandpass Wind Noise Filter
    const noiseBuffer = this.createNoiseBuffer(decay);
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(baseFreq * 1.2, triggerTime);
    windFilter.frequency.exponentialRampToValueAtTime(baseFreq * 2.4, triggerTime + decay * 0.5);
    windFilter.Q.setValueAtTime(10.0, triggerTime); // Sharp whistle peak

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(gainVal * 0.2, triggerTime + 0.2);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay);

    noiseSource.connect(windFilter);
    windFilter.connect(noiseGain);

    oscA.connect(mainGainNode);
    oscB.connect(mainGainNode);
    noiseGain.connect(mainGainNode);

    mainGainNode.connect(this.masterGain);
    if (this.convolverWindCanyon) {
      mainGainNode.connect(this.convolverWindCanyon);
    }

    oscA.start(triggerTime);
    oscB.start(triggerTime);
    noiseSource.start(triggerTime);

    oscA.stop(triggerTime + decay + 0.2);
    oscB.stop(triggerTime + decay + 0.2);
    noiseSource.stop(triggerTime + decay + 0.2);

    this.scheduleCleanup([mainGainNode, windFilter, noiseGain], delaySeconds + decay + 0.5);
  }

  // C. Lake Michigan Deep Maritime Foghorn (Sub-Bass Swell)
  triggerChicagoFoghorn(params, triggerTime, delaySeconds) {
    const baseFreq = params.baseFrequency || 65.0; // Deep sub frequency (45-85Hz)
    const decay = params.decay || 6.0;
    const gainVal = params.gain !== undefined ? params.gain : 0.95;

    const mainGainNode = this.ctx.createGain();
    mainGainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    mainGainNode.gain.linearRampToValueAtTime(gainVal * 0.6, triggerTime + 0.4); // Foghorn atmospheric swell
    mainGainNode.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180.0, triggerTime);
    filter.frequency.linearRampToValueAtTime(params.filterCutoff || 550.0, triggerTime + 0.5);
    filter.frequency.exponentialRampToValueAtTime(120.0, triggerTime + decay);

    // Dual detuned sub saw/square foghorn oscillators
    [1.0, 1.004, 0.5, 1.5].forEach((ratio) => {
      const osc = this.ctx.createOscillator();
      osc.type = ratio === 0.5 ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(baseFreq * ratio, triggerTime);

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(ratio === 0.5 ? 0.4 : 0.2, triggerTime);

      osc.connect(oscGain);
      oscGain.connect(filter);

      osc.start(triggerTime);
      osc.stop(triggerTime + decay + 0.3);
    });

    filter.connect(mainGainNode);
    mainGainNode.connect(this.masterGain);
    if (this.convolverWindCanyon) {
      mainGainNode.connect(this.convolverWindCanyon);
    }

    this.scheduleCleanup([mainGainNode, filter], delaySeconds + decay + 0.5);
  }

  // D. Chicago River Steel Drawbridge Iron Groan & Metallic Thud
  triggerChicagoBridge(params, triggerTime, delaySeconds) {
    const baseFreq = params.baseFrequency || 110.0;
    const decay = params.decay || 3.0;
    const gainVal = params.gain !== undefined ? params.gain : 0.85;

    const mainGainNode = this.ctx.createGain();
    mainGainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    mainGainNode.gain.linearRampToValueAtTime(gainVal * 0.55, triggerTime + 0.02);
    mainGainNode.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay);

    // Sub-harmonic iron beam thud
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(baseFreq * 0.5, triggerTime);

    // Metallic Bridge Beam Inharmonic Ring (Ratios: 1.0, 2.41, 3.82)
    [1.0, 2.41, 3.82].forEach((ratio, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq * ratio, triggerTime);

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0.3 / (idx + 1), triggerTime);

      osc.connect(oscGain);
      oscGain.connect(mainGainNode);

      osc.start(triggerTime);
      osc.stop(triggerTime + decay + 0.2);
    });

    subOsc.connect(mainGainNode);
    subOsc.start(triggerTime);
    subOsc.stop(triggerTime + decay + 0.2);

    // Soft Saturation WaveShaper
    const waveShaper = this.ctx.createWaveShaper();
    waveShaper.curve = this.makeDistortionCurve(4);

    mainGainNode.connect(waveShaper);
    waveShaper.connect(this.masterGain);
    if (this.convolverSteelBridge) {
      mainGainNode.connect(this.convolverSteelBridge);
    }

    this.scheduleCleanup([mainGainNode, waveShaper], delaySeconds + decay + 0.5);
  }


  // 1. Deep Atmospheric Bronze Bell (Clean Physical Modal Synthesis + Lowpass Cathedral Convolver)
  triggerDeepBell(params, triggerTime, delaySeconds) {
    const baseFreq = params.baseFrequency || 110.0;
    const decay = params.decay || 6.0;
    const gainVal = params.gain !== undefined ? params.gain : 0.8;

    // Physical bronze modal ratios: Hum, Prime, Tierce (minor 3rd), Quint, Nominal, Supernominal
    const modalRatios = [0.5, 1.0, 1.20, 1.50, 2.0, 2.76, 3.25];

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.45, triggerTime + 0.06);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay + 0.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const cutoff = params.filterCutoff || 800.0;
    filter.frequency.setValueAtTime(cutoff, triggerTime);
    filter.frequency.exponentialRampToValueAtTime(140.0, triggerTime + decay);
    filter.Q.setValueAtTime(1.8, triggerTime);

    modalRatios.forEach((ratio, idx) => {
      const oscA = this.ctx.createOscillator();
      const oscB = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      const freq = baseFreq * ratio;
      const detuneHz = idx === 0 ? 0.0 : 0.25 * (idx % 2 === 0 ? 1 : -1);

      oscA.type = params.carrierType || 'sine';
      oscB.type = params.carrierType || 'sine';

      oscA.frequency.setValueAtTime(freq, triggerTime);
      oscB.frequency.setValueAtTime(freq + detuneHz, triggerTime);

      const partialAmp = (1.0 / (idx * 0.9 + 1)) * gainVal * 0.25;
      oscGain.gain.setValueAtTime(0, this.ctx.currentTime);
      oscGain.gain.linearRampToValueAtTime(partialAmp, triggerTime + 0.05);
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

  // 2. Continuous Sub-Bass Flux Drone (Subtle Mountain Valley Convolver)
  triggerDrone(params, triggerTime, delaySeconds) {
    const baseFreq = params.baseFrequency || 65.0;
    const decay = params.decay || 8.0;
    const gainVal = params.gain !== undefined ? params.gain : 0.6;

    const droneGainNode = this.ctx.createGain();
    droneGainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    droneGainNode.gain.linearRampToValueAtTime(gainVal * 0.4, triggerTime + 1.2);
    droneGainNode.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const startCutoff = params.filterCutoff || 500.0;
    filter.frequency.setValueAtTime(startCutoff, triggerTime);

    // LFO modulation for filter cutoff
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(0.12, triggerTime); // 0.12 Hz slow LFO
    lfoGain.gain.setValueAtTime(180.0, triggerTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start(triggerTime);
    lfo.stop(triggerTime + decay + 0.5);

    // Layered detuned sub-oscillators (pure sine & triangle)
    [0.997, 1.0, 1.003, 2.0].forEach((ratio) => {
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      osc.type = ratio > 1.5 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(baseFreq * ratio, triggerTime);

      const amp = ratio > 1.5 ? 0.2 : 0.35;
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

  // 3. Industrial Somatic Friction (FM Synthesis + Soft Saturation + Mine Convolver)
  triggerIndustrial(params, triggerTime, delaySeconds) {
    const carrierFreq = params.baseFrequency || 140.0;
    const fmRatio = params.harmonicity || 2.71;
    const modFreq = carrierFreq * fmRatio;
    const fmIndex = params.fmIndex !== undefined ? Math.min(params.fmIndex, 4.0) : 2.5;
    const decay = params.decay || 1.2;
    const gainVal = params.gain !== undefined ? params.gain : 0.6;

    const mainGainNode = this.ctx.createGain();
    mainGainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    mainGainNode.gain.linearRampToValueAtTime(gainVal * 0.5, triggerTime + 0.01);
    mainGainNode.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay);

    // FM Carrier
    const carrier = this.ctx.createOscillator();
    carrier.type = 'triangle';
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

    // Subtle Metallic Pick Attack
    const noiseBuffer = this.createNoiseBuffer(0.08); // 80ms click
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(params.filterCutoff || 2200.0, triggerTime);
    noiseFilter.Q.setValueAtTime(8.0, triggerTime);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(gainVal * 0.15, triggerTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, triggerTime + 0.08);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseSource.start(triggerTime);

    // Soft Saturation WaveShaper
    const waveShaper = this.ctx.createWaveShaper();
    waveShaper.curve = this.makeDistortionCurve(3); // Gentle warm saturation

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

  // 4. Forensic Glitch (Clean Ring Modulation + Mine Convolver)
  triggerGlitch(params, triggerTime, delaySeconds) {
    const baseFreq = params.baseFrequency || 330.0;
    const decay = params.decay || 0.4;
    const gainVal = params.gain !== undefined ? params.gain : 0.5;

    const glitchGain = this.ctx.createGain();
    glitchGain.gain.setValueAtTime(0, this.ctx.currentTime);
    glitchGain.gain.linearRampToValueAtTime(gainVal * 0.4, triggerTime + 0.005);
    glitchGain.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay);

    // Primary Carrier
    const carrier = this.ctx.createOscillator();
    carrier.type = 'square';
    carrier.frequency.setValueAtTime(baseFreq, triggerTime);

    // Ring Modulator Multiplier
    const ringMod = this.ctx.createOscillator();
    const ringGain = this.ctx.createGain();
    ringMod.type = 'triangle';
    ringMod.frequency.setValueAtTime(baseFreq * (params.harmonicity || 1.73), triggerTime);

    ringMod.connect(ringGain.gain);
    carrier.connect(ringGain);
    ringGain.connect(glitchGain);

    ringMod.start(triggerTime);
    carrier.start(triggerTime);
    ringMod.stop(triggerTime + decay);
    carrier.stop(triggerTime + decay);

    glitchGain.connect(this.masterGain);
    if (this.convolverMine) {
      glitchGain.connect(this.convolverMine);
    }

    this.scheduleCleanup([glitchGain, ringGain], delaySeconds + decay + 0.5);
  }

  // 5. Classic Sacred Bronze Bell (Clean Physical Modal Synthesis + Lowpass Cathedral Convolver)
  triggerSacredBell(params, triggerTime, delaySeconds) {
    const baseFreq = params.baseFrequency || CLIENT_CONFIG.AUDIO.DEFAULT_FREQUENCY_HZ;
    const decay = params.decay || 1.5;
    const gainVal = params.gain !== undefined ? params.gain : 0.8;

    // Physical colonial bronze bell modal ratios (Hum, Prime, Tierce minor 3rd, Quint, Nominal, Supernominal)
    const modalRatios = [0.5, 1.0, 1.20, 1.50, 2.0, 2.76, 3.25];

    const bellGainNode = this.ctx.createGain();
    bellGainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    bellGainNode.gain.linearRampToValueAtTime(0.5, triggerTime + 0.04);
    bellGainNode.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay + 0.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(params.filterCutoff || 1200, triggerTime);
    filter.Q.setValueAtTime(1.5, triggerTime);

    modalRatios.forEach((ratio, idx) => {
      const oscA = this.ctx.createOscillator();
      const oscB = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();

      const freq = baseFreq * ratio;
      const detuneHz = idx === 0 ? 0.0 : 0.25 * (idx % 2 === 0 ? 1 : -1);

      oscA.type = params.carrierType || 'sine';
      oscB.type = params.carrierType || 'sine';

      oscA.frequency.setValueAtTime(freq, triggerTime);
      oscB.frequency.setValueAtTime(freq + detuneHz, triggerTime);

      const partialAmp = (1.0 / (idx * 0.9 + 1)) * gainVal * 0.25;
      oscGain.gain.setValueAtTime(0, this.ctx.currentTime);
      oscGain.gain.linearRampToValueAtTime(partialAmp, triggerTime + 0.04);
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

  // Helper: Soft-clipping WaveShaper Curve (Gentle warm saturation)
  makeDistortionCurve(amount = 3) {
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
