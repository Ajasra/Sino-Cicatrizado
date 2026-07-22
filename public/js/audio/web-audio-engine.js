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
  triggerGlitch,
  createContinuousEmitterOuroPreto
} from './generators/ouro-preto.js';
import {
  triggerChicagoRail,
  triggerChicagoWind,
  triggerChicagoFoghorn,
  triggerChicagoBridge,
  triggerChicagoSteam,
  createContinuousEmitterChicago
} from './generators/chicago.js';
import {
  triggerShanghaiGong,
  triggerShanghaiRiver,
  triggerShanghaiMaglev,
  triggerShanghaiCicadas,
  triggerShanghaiConstructionDrums,
  createContinuousEmitterShanghai
} from './generators/shanghai.js';
import {
  triggerShanghaiGlitch,
  triggerShanghaiHarshFeedback,
  triggerShanghaiCircuitBend,
  triggerShanghaiSubRumble,
  createContinuousEmitterShanghaiNoiseStatic,
  createContinuousEmitterShanghaiNoiseDrone,
  createContinuousEmitterShanghaiNoiseSubRumble
} from './generators/shanghai-noise.js';

import { calculateHaversineMeters } from '../spatial.js';



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
    this.proximityEmitters = [];
    this.lastCoords = null;
    this.lastCoordsTime = null;
    this.activeNodes = [];
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

    // 3. Dual Out-of-Phase LFO Filter Sweep (0.011 Hz & 0.017 Hz polyrhythm)
    const droneFilter = this.ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    const initialCutoff = this.currentCityProfile === 'chicago' ? 550.0 : (this.currentCityProfile === 'shanghai' ? 420.0 : 380.0);
    droneFilter.frequency.setValueAtTime(initialCutoff, now);
    droneFilter.Q.setValueAtTime(2.5, now);

    const lfo1 = this.ctx.createOscillator();
    const lfoGain1 = this.ctx.createGain();
    lfo1.type = 'sine';
    lfo1.frequency.setValueAtTime(0.011, now);
    lfoGain1.gain.setValueAtTime(110.0, now);

    const lfo2 = this.ctx.createOscillator();
    const lfoGain2 = this.ctx.createGain();
    lfo2.type = 'triangle';
    lfo2.frequency.setValueAtTime(0.017, now);
    lfoGain2.gain.setValueAtTime(70.0, now);

    lfo1.connect(lfoGain1);
    lfoGain1.connect(droneFilter.frequency);
    lfo2.connect(lfoGain2);
    lfoGain2.connect(droneFilter.frequency);

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
    lfo1.start(now);
    lfo2.start(now);

    this.continuousDrone = {
      subOsc1,
      subOsc2,
      harmOsc1,
      harmOsc2,
      droneFilter,
      lfo1,
      lfo2,
      droneMasterGain,
      baseFreq,
      targetCutoff: initialCutoff
    };
  }

  morphContinuousDrone(cityKey) {
    if (!this.ctx || !this.continuousDrone) return;
    const now = this.ctx.currentTime;
    const baseFreq = cityKey === 'chicago' ? 45.0 : (cityKey === 'shanghai_noise' ? 48.0 : (cityKey === 'shanghai' ? 65.0 : 55.0));
    const targetCutoff = cityKey === 'chicago' ? 550.0 : (cityKey === 'shanghai_noise' ? 650.0 : (cityKey === 'shanghai' ? 420.0 : 380.0));

    const d = this.continuousDrone;
    d.targetCutoff = targetCutoff;
    d.baseFreq = baseFreq;
    try {
      d.subOsc1.frequency.exponentialRampToValueAtTime(baseFreq, now + 4.0);
      d.subOsc2.frequency.exponentialRampToValueAtTime(baseFreq + 0.35, now + 4.0);
      d.harmOsc1.frequency.exponentialRampToValueAtTime(baseFreq * 2.0, now + 4.0);
      d.harmOsc2.frequency.exponentialRampToValueAtTime(baseFreq * 3.0, now + 4.0);
      d.droneFilter.frequency.exponentialRampToValueAtTime(targetCutoff, now + 4.0);
    } catch (_) {}

    // Refresh proximity emitters for new city
    if (this.activeNodes && this.activeNodes.length > 0) {
      this.setProximityNodes(this.activeNodes);
    }
  }

  // ponytail: Dynamic Somatic Movement & Proximity Attenuation Update
  updateSomaticPosition(coords) {
    if (!this.ctx || !coords) return;
    const now = this.ctx.currentTime;

    // Calculate movement velocity (meters per second)
    let speedMps = 0;
    if (this.lastCoords && this.lastCoordsTime) {
      const distMeters = calculateHaversineMeters(this.lastCoords, coords);
      const dt = Math.max(0.1, now - this.lastCoordsTime);
      speedMps = distMeters / dt;
    }
    this.lastCoords = coords;
    this.lastCoordsTime = now;

    // 1. Modulate background drone brightness based on movement speed
    if (this.continuousDrone) {
      const speedBoost = Math.min(speedMps * 25.0, 300.0); // up to +300Hz brightness
      const targetFreq = Math.max(100.0, this.continuousDrone.targetCutoff + speedBoost);
      try {
        this.continuousDrone.droneFilter.frequency.setTargetAtTime(targetFreq, now, 0.5);
      } catch (_) {}
    }

    // 2. Update Proximity Attenuation for Active Continuous Emitters
    this.proximityEmitters.forEach((emitter) => {
      if (!emitter.coords || !emitter.instance || !emitter.instance.masterGain) return;
      const dist = calculateHaversineMeters(coords, emitter.coords);
      const maxRange = emitter.maxRange || 300.0; // 300 meters ambient radius
      let gainNorm = 0;
      if (dist < maxRange) {
        gainNorm = Math.pow(1.0 - (dist / maxRange), 2); // Quadratic proximity curve
      }
      const targetGain = gainNorm * (emitter.maxGain || 0.45);
      try {
        emitter.instance.masterGain.gain.setTargetAtTime(targetGain, now, 0.3);
      } catch (_) {}
    });
  }

  // Setup/Refresh Continuous Proximity Emitters anchored to active city nodes
  setProximityNodes(nodesList = []) {
    this.activeNodes = nodesList;
    if (!this.ctx) return;

    // Stop and clear previous emitters
    this.proximityEmitters.forEach((e) => {
      if (e.instance && typeof e.instance.stop === 'function') {
        e.instance.stop();
      }
    });
    this.proximityEmitters = [];

    if (!nodesList || nodesList.length === 0) return;

    // Select top 3 nodes as continuous ambient sound anchors
    const anchorNodes = nodesList.slice(0, 3);
    anchorNodes.forEach((node, idx) => {
      if (!node.coords) return;
      let emitterInstance = null;

      if (this.currentCityProfile === 'chicago') {
        emitterInstance = createContinuousEmitterChicago(this, { baseFrequency: 220 + idx * 40 });
      } else if (this.currentCityProfile === 'shanghai_noise') {
        if (idx % 3 === 0) {
          emitterInstance = createContinuousEmitterShanghaiNoiseStatic(this, { baseFrequency: 440 + idx * 60 });
        } else if (idx % 3 === 1) {
          emitterInstance = createContinuousEmitterShanghaiNoiseSubRumble(this, { baseFrequency: 38 + idx * 5 });
        } else {
          emitterInstance = createContinuousEmitterShanghaiNoiseDrone(this, { baseFrequency: 48 + idx * 10 });
        }
      } else if (this.currentCityProfile === 'shanghai') {
        emitterInstance = createContinuousEmitterShanghai(this, { baseFrequency: 65 + idx * 10 });
      } else {
        emitterInstance = createContinuousEmitterOuroPreto(this, { baseFrequency: 55 + idx * 15 });
      }

      if (emitterInstance) {
        this.proximityEmitters.push({
          nodeId: node.id,
          coords: node.coords,
          maxRange: 350.0,
          maxGain: 0.4,
          instance: emitterInstance
        });
      }
    });

    if (this.lastCoords) {
      this.updateSomaticPosition(this.lastCoords);
    }
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
    const pill = document.getElementById('pill-battery');
    if (pill) pill.textContent = `BATTERY: ${Math.round(batteryLevel * 100)}%`;
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
      case 'shanghai_cicadas':
      case 'cicadas':
        triggerShanghaiCicadas(this, params, triggerTime, delaySeconds);
        break;
      case 'shanghai_construction':
      case 'construction_drums':
        triggerShanghaiConstructionDrums(this, params, triggerTime, delaySeconds);
        break;
      case 'shanghai_glitch':
        triggerShanghaiGlitch(this, params, triggerTime, delaySeconds);
        break;
      case 'shanghai_harsh_feedback':
      case 'harsh_feedback':
        triggerShanghaiHarshFeedback(this, params, triggerTime, delaySeconds);
        break;
      case 'shanghai_circuit_bend':
      case 'circuit_bend':
        triggerShanghaiCircuitBend(this, params, triggerTime, delaySeconds);
        break;
      case 'shanghai_sub_rumble':
      case 'sub_rumble':
        triggerShanghaiSubRumble(this, params, triggerTime, delaySeconds);
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
      case 'chicago_steam':
      case 'steam':
        triggerChicagoSteam(this, params, triggerTime, delaySeconds);
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
