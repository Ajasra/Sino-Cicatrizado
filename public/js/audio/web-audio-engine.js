import { AbstractAudioEngine } from './abstract-engine.js';
import { AudioContextManager } from './audio-context-manager.js';
import {
  createProceduralImpulseResponse,
  applyReflectorDSPChain,
  createNoiseBuffer,
  makeDistortionCurve
} from './general-filter.js';
import {
  triggerSacredBell,
  triggerDeepBell,
  triggerDrone,
  triggerIndustrial,
  triggerGlitch
} from './generators/ouro-preto.js';
import {
  triggerChicagoRail,
  triggerChicagoWind,
  triggerChicagoFoghorn,
  triggerChicagoBridge
} from './generators/chicago.js';
import {
  triggerShanghaiGong,
  triggerShanghaiRiver,
  triggerShanghaiMaglev
} from './generators/shanghai.js';

/**
 * Pure Procedural Spatial & Modal Audio Engine for Sino Cicatrizado.
 * ponytail: Sovereign core engine managing AudioContext lifecycle, convolvers, continuous drones,
 * and routing sound synthesis to modular city generators.
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
    this.continuousDrone = null;
  }

  setCityAcousticProfile(cityKey) {
    this.currentCityProfile = cityKey || 'ouro_preto';
    console.log(`[AudioEngine] Switched acoustic profile to: ${this.currentCityProfile}`);
    if (this.continuousDrone) {
      this.morphContinuousDrone(this.currentCityProfile);
    }
  }

  // ponytail: Sovereign Isolation offline lowpass degradation toggle (450Hz heavily dampened vs 20kHz open)
  setSovereignIsolation(isIsolated) {
    if (!this.ctx || !this.isolationFilter) return;
    const targetFreq = isIsolated ? 450.0 : 20000.0;
    const rampTime = isIsolated ? 1.5 : 5.0; // 5s smooth re-sync curve per PRD §5.1
    try {
      this.isolationFilter.frequency.exponentialRampToValueAtTime(targetFreq, this.ctx.currentTime + rampTime);
    } catch (_) {
      this.isolationFilter.frequency.setValueAtTime(targetFreq, this.ctx.currentTime);
    }
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

    // ponytail: Sovereign Isolation lowpass filter (degrades audio spectrum when network disconnects)
    this.isolationFilter = this.ctx.createBiquadFilter();
    this.isolationFilter.type = 'lowpass';
    this.isolationFilter.frequency.setValueAtTime(20000, this.ctx.currentTime); // default open

    // Connect masterGain through isolationFilter then limiter to destination
    this.masterGain.connect(this.isolationFilter);
    this.isolationFilter.connect(this.limiter);
    this.limiter.connect(this.ctx.destination);

    // -------------------------------------------------------------------------
    // Procedural Convolver Impulse Response Generation
    // -------------------------------------------------------------------------

    // Ouro Preto: Cathedral / Church Tower Space (3.0s warm exponential lowpass decay)
    this.convolverCathedral = this.ctx.createConvolver();
    this.convolverCathedral.buffer = createProceduralImpulseResponse(this.ctx, 3.0, 3.5, { lpCutoff: 1800 });
    const cathedralGain = this.ctx.createGain();
    cathedralGain.gain.setValueAtTime(0.20, this.ctx.currentTime);
    this.convolverCathedral.connect(cathedralGain);
    cathedralGain.connect(this.masterGain);

    // Ouro Preto: Mine / Subterranean Chamber Space (1.2s dense lowpass metallic reflections)
    this.convolverMine = this.ctx.createConvolver();
    this.convolverMine.buffer = createProceduralImpulseResponse(this.ctx, 1.2, 5.0, { metalRing: true, lpCutoff: 2400 });
    const mineGain = this.ctx.createGain();
    mineGain.gain.setValueAtTime(0.22, this.ctx.currentTime);
    this.convolverMine.connect(mineGain);
    mineGain.connect(this.masterGain);

    // Ouro Preto: Mountain Valley Space (4.5s long lowpass diffuse tail)
    this.convolverValley = this.ctx.createConvolver();
    this.convolverValley.buffer = createProceduralImpulseResponse(this.ctx, 4.5, 2.5, { lpCutoff: 1200 });
    const valleyGain = this.ctx.createGain();
    valleyGain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    this.convolverValley.connect(valleyGain);
    valleyGain.connect(this.masterGain);

    // Chicago: Lake Michigan Wind Canyon Space (4.0s wide open atmospheric reverb)
    this.convolverWindCanyon = this.ctx.createConvolver();
    this.convolverWindCanyon.buffer = createProceduralImpulseResponse(this.ctx, 4.0, 2.0, { lpCutoff: 3000 });
    const windGain = this.ctx.createGain();
    windGain.gain.setValueAtTime(0.22, this.ctx.currentTime);
    this.convolverWindCanyon.connect(windGain);
    windGain.connect(this.masterGain);

    // Chicago: Steel Bridge & River Corridor Space (1.8s metallic beam impulse)
    this.convolverSteelBridge = this.ctx.createConvolver();
    this.convolverSteelBridge.buffer = createProceduralImpulseResponse(this.ctx, 1.8, 4.0, { metalRing: true, lpCutoff: 3500 });
    const bridgeGain = this.ctx.createGain();
    bridgeGain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    this.convolverSteelBridge.connect(bridgeGain);
    bridgeGain.connect(this.masterGain);

    // Initialize Continuous Evolving Drone Layer
    this.startContinuousDrone();
  }

  async resume() {
    const res = await AudioContextManager.ensureResumed();
    if (!this.continuousDrone && this.ctx) {
      this.startContinuousDrone();
    }
    return res;
  }

  startContinuousDrone() {
    if (!this.ctx || this.continuousDrone) return;

    const now = this.ctx.currentTime;
    const droneMasterGain = this.ctx.createGain();
    droneMasterGain.gain.setValueAtTime(0, now);
    droneMasterGain.gain.linearRampToValueAtTime(0.35, now + 3.0); // 3s smooth fade-in

    // 1. Detuned Binaural Sub-Bass Oscillators
    const baseFreq = this.currentCityProfile === 'chicago' ? 45.0 : (this.currentCityProfile === 'shanghai' ? 65.0 : 55.0);
    const subOsc1 = this.ctx.createOscillator();
    const subOsc2 = this.ctx.createOscillator();
    subOsc1.type = 'sine';
    subOsc2.type = 'sine';
    subOsc1.frequency.setValueAtTime(baseFreq, now);
    subOsc2.frequency.setValueAtTime(baseFreq + 0.35, now); // 0.35 Hz binaural beating

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.4, now);
    subOsc1.connect(subGain);
    subOsc2.connect(subGain);

    // 2. Evolving Modal Overtones
    const harmOsc1 = this.ctx.createOscillator();
    const harmOsc2 = this.ctx.createOscillator();
    harmOsc1.type = 'triangle';
    harmOsc2.type = 'sine';
    harmOsc1.frequency.setValueAtTime(baseFreq * 2.0, now);
    harmOsc2.frequency.setValueAtTime(baseFreq * 3.0, now);

    const harmGain = this.ctx.createGain();
    harmGain.gain.setValueAtTime(0.2, now);
    harmOsc1.connect(harmGain);
    harmOsc2.connect(harmGain);

    // 3. Ultra-slow LFO Filter Sweep (0.015 Hz = 66s cycle)
    const droneFilter = this.ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    const initialCutoff = this.currentCityProfile === 'chicago' ? 550.0 : 380.0;
    droneFilter.frequency.setValueAtTime(initialCutoff, now);
    droneFilter.Q.setValueAtTime(2.5, now);

    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.015, now);
    lfoGain.gain.setValueAtTime(160.0, now); // Sweeps cutoff between 220Hz and 540Hz

    lfo.connect(lfoGain);
    lfoGain.connect(droneFilter.frequency);

    subGain.connect(droneFilter);
    harmGain.connect(droneFilter);
    droneFilter.connect(droneMasterGain);

    droneMasterGain.connect(this.masterGain);
    if (this.convolverValley) {
      droneMasterGain.connect(this.convolverValley);
    }

    subOsc1.start(now);
    subOsc2.start(now);
    harmOsc1.start(now);
    harmOsc2.start(now);
    lfo.start(now);

    this.continuousDrone = {
      subOsc1,
      subOsc2,
      harmOsc1,
      harmOsc2,
      droneFilter,
      lfo,
      droneMasterGain,
      baseFreq
    };
  }

  morphContinuousDrone(cityKey) {
    if (!this.ctx || !this.continuousDrone) return;
    const now = this.ctx.currentTime;
    const baseFreq = cityKey === 'chicago' ? 45.0 : (cityKey === 'shanghai' ? 65.0 : 55.0);
    const targetCutoff = cityKey === 'chicago' ? 550.0 : (cityKey === 'shanghai' ? 420.0 : 380.0);

    const d = this.continuousDrone;
    try {
      d.subOsc1.frequency.exponentialRampToValueAtTime(baseFreq, now + 4.0);
      d.subOsc2.frequency.exponentialRampToValueAtTime(baseFreq + 0.35, now + 4.0);
      d.harmOsc1.frequency.exponentialRampToValueAtTime(baseFreq * 2.0, now + 4.0);
      d.harmOsc2.frequency.exponentialRampToValueAtTime(baseFreq * 3.0, now + 4.0);
      d.droneFilter.frequency.exponentialRampToValueAtTime(targetCutoff, now + 4.0);
    } catch (_) {}
  }

  // Reflector DSP chain delegation
  applyReflectorDSPChain(sourceNode, params = {}, triggerTime = 0, decay = 2.0) {
    return applyReflectorDSPChain(this, sourceNode, params, triggerTime, decay);
  }

  // General Filter / DSP helpers delegates
  createProceduralImpulseResponse(durationSeconds = 2.0, decayRate = 3.0, options = {}) {
    return createProceduralImpulseResponse(this.ctx, durationSeconds, decayRate, options);
  }

  createNoiseBuffer(durationSeconds = 0.1) {
    return createNoiseBuffer(this.ctx, durationSeconds);
  }

  makeDistortionCurve(amount = 3) {
    return makeDistortionCurve(amount);
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
      if (this.currentCityProfile === 'shanghai') {
        soundType = 'shanghai_gong';
      } else if (this.currentCityProfile === 'chicago') {
        soundType = 'chicago_foghorn';
      } else {
        soundType = 'bell_sacred';
      }
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
      case 'shanghai_gong':
      case 'gong':
        triggerShanghaiGong(this, params, triggerTime, delaySeconds);
        break;
      case 'shanghai_river':
        triggerShanghaiRiver(this, params, triggerTime, delaySeconds);
        break;
      case 'shanghai_maglev':
      case 'maglev':
        triggerShanghaiMaglev(this, params, triggerTime, delaySeconds);
        break;
      case 'chicago_rail':
      case 'rail':
        triggerChicagoRail(this, params, triggerTime, delaySeconds);
        break;
      case 'chicago_wind':
      case 'wind':
        triggerChicagoWind(this, params, triggerTime, delaySeconds);
        break;
      case 'chicago_foghorn':
      case 'foghorn':
        triggerChicagoFoghorn(this, params, triggerTime, delaySeconds);
        break;
      case 'chicago_bridge':
      case 'bridge':
        triggerChicagoBridge(this, params, triggerTime, delaySeconds);
        break;
      case 'bell_deep':
        triggerDeepBell(this, params, triggerTime, delaySeconds);
        break;
      case 'drone':
        triggerDrone(this, params, triggerTime, delaySeconds);
        break;
      case 'industrial':
        triggerIndustrial(this, params, triggerTime, delaySeconds);
        break;
      case 'glitch':
        triggerGlitch(this, params, triggerTime, delaySeconds);
        break;
      case 'bell_sacred':
      default:
        if (this.currentCityProfile === 'shanghai') {
          triggerShanghaiGong(this, params, triggerTime, delaySeconds);
        } else if (this.currentCityProfile === 'chicago') {
          triggerChicagoFoghorn(this, params, triggerTime, delaySeconds);
        } else {
          triggerSacredBell(this, params, triggerTime, delaySeconds);
        }
        break;
    }
  }

  // City Generator Delegates (Backwards compatibility for direct calls)
  triggerShanghaiGong(params, triggerTime, delaySeconds) {
    triggerShanghaiGong(this, params, triggerTime, delaySeconds);
  }

  triggerShanghaiRiver(params, triggerTime, delaySeconds) {
    triggerShanghaiRiver(this, params, triggerTime, delaySeconds);
  }

  triggerShanghaiMaglev(params, triggerTime, delaySeconds) {
    triggerShanghaiMaglev(this, params, triggerTime, delaySeconds);
  }

  triggerChicagoRail(params, triggerTime, delaySeconds) {
    triggerChicagoRail(this, params, triggerTime, delaySeconds);
  }

  triggerChicagoWind(params, triggerTime, delaySeconds) {
    triggerChicagoWind(this, params, triggerTime, delaySeconds);
  }

  triggerChicagoFoghorn(params, triggerTime, delaySeconds) {
    triggerChicagoFoghorn(this, params, triggerTime, delaySeconds);
  }

  triggerChicagoBridge(params, triggerTime, delaySeconds) {
    triggerChicagoBridge(this, params, triggerTime, delaySeconds);
  }

  triggerDeepBell(params, triggerTime, delaySeconds) {
    triggerDeepBell(this, params, triggerTime, delaySeconds);
  }

  triggerDrone(params, triggerTime, delaySeconds) {
    triggerDrone(this, params, triggerTime, delaySeconds);
  }

  triggerIndustrial(params, triggerTime, delaySeconds) {
    triggerIndustrial(this, params, triggerTime, delaySeconds);
  }

  triggerGlitch(params, triggerTime, delaySeconds) {
    triggerGlitch(this, params, triggerTime, delaySeconds);
  }

  triggerSacredBell(params, triggerTime, delaySeconds) {
    triggerSacredBell(this, params, triggerTime, delaySeconds);
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
