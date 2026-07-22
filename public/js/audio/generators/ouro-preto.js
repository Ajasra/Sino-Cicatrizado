import { CLIENT_CONFIG } from '../../config.js';
import { applyReflectorDSPChain, createNoiseBuffer, makeDistortionCurve } from '../general-filter.js';

/**
 * Ouro Preto Procedural Acoustic Generators
 * Colonial soapstone bells, baroque cathedral reverb & subterranean mine resonances.
 */

// 1. Deep Atmospheric Bronze Bell (Clean Physical Modal Synthesis + Lowpass Cathedral Convolver)
export function triggerDeepBell(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const startValTime = Math.max(ctx.currentTime, triggerTime);
  const baseFreq = params.baseFrequency || 110.0;
  const decay = params.decay || 6.0;
  const gainVal = params.gain !== undefined ? params.gain : 0.8;

  // Physical bronze modal ratios: Hum, Prime, Tierce (minor 3rd), Quint, Nominal, Supernominal, Octave
  const modalRatios = [0.5, 1.0, 1.20, 1.50, 2.0, 2.76, 3.25];

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, startValTime);
  gainNode.gain.linearRampToValueAtTime(0.45, startValTime + 0.06);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startValTime + decay + 0.5);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  const cutoff = params.filterCutoff || 800.0;
  filter.frequency.setValueAtTime(cutoff, startValTime);
  filter.frequency.exponentialRampToValueAtTime(140.0, startValTime + decay);
  filter.Q.setValueAtTime(1.8, startValTime);

  modalRatios.forEach((ratio, idx) => {
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    const freq = baseFreq * ratio;
    const detuneCents = idx === 0 ? 0 : (idx % 2 === 0 ? 6 : -6);

    osc.type = params.carrierType || 'sine';
    osc.frequency.setValueAtTime(freq, startValTime);
    if (detuneCents !== 0) {
      osc.detune.setValueAtTime(detuneCents, startValTime);
    }

    const partialAmp = (1.0 / (idx * 0.9 + 1)) * gainVal * 0.35;
    oscGain.gain.setValueAtTime(0, startValTime);
    oscGain.gain.linearRampToValueAtTime(partialAmp, startValTime + 0.05);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, startValTime + (decay / (idx === 0 ? 0.75 : ratio)));

    osc.connect(oscGain);
    oscGain.connect(gainNode);

    osc.start(startValTime);
    osc.stop(startValTime + decay + 0.6);
  });

  gainNode.connect(filter);
  filter.connect(engine.masterGain);
  if (engine.convolverCathedral) {
    filter.connect(engine.convolverCathedral);
  }

  engine.scheduleCleanup([gainNode, filter], delaySeconds + decay + 1.0);
}

// 2. Continuous Sub-Bass Flux Drone (Subtle Mountain Valley Convolver)
export function triggerDrone(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const startValTime = Math.max(ctx.currentTime, triggerTime);
  const baseFreq = params.baseFrequency || 65.0;
  const decay = params.decay || 8.0;
  const gainVal = params.gain !== undefined ? params.gain : 0.6;

  const droneGainNode = ctx.createGain();
  droneGainNode.gain.setValueAtTime(0, startValTime);
  droneGainNode.gain.linearRampToValueAtTime(gainVal * 0.4, startValTime + 1.2);
  droneGainNode.gain.exponentialRampToValueAtTime(0.0001, startValTime + decay);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  const startCutoff = params.filterCutoff || 500.0;
  filter.frequency.setValueAtTime(startCutoff, startValTime);

  // LFO modulation for filter cutoff
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.setValueAtTime(0.12, startValTime); // 0.12 Hz slow LFO
  lfoGain.gain.setValueAtTime(180.0, startValTime);
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start(startValTime);
  lfo.stop(startValTime + decay + 0.5);

  // Layered detuned sub-oscillators (pure sine & triangle)
  [0.997, 1.0, 1.003, 2.0].forEach((ratio) => {
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = ratio > 1.5 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(baseFreq * ratio, startValTime);

    const amp = ratio > 1.5 ? 0.2 : 0.35;
    oscGain.gain.setValueAtTime(amp, startValTime);

    osc.connect(oscGain);
    oscGain.connect(droneGainNode);

    osc.start(startValTime);
    osc.stop(startValTime + decay + 0.5);
  });

  droneGainNode.connect(filter);
  filter.connect(engine.masterGain);
  if (engine.convolverValley) {
    filter.connect(engine.convolverValley);
  }

  engine.scheduleCleanup([droneGainNode, filter, lfoGain], delaySeconds + decay + 1.0);
}

// 3. Industrial Somatic Friction (FM Synthesis + Soft Saturation + Mine Convolver)
export function triggerIndustrial(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const startValTime = Math.max(ctx.currentTime, triggerTime);
  const carrierFreq = params.baseFrequency || 140.0;
  const fmRatio = params.harmonicity || 2.71;
  const modFreq = carrierFreq * fmRatio;
  const fmIndex = params.fmIndex !== undefined ? Math.min(params.fmIndex, 4.0) : 2.5;
  const decay = params.decay || 1.2;
  const gainVal = params.gain !== undefined ? params.gain : 0.6;

  const mainGainNode = ctx.createGain();
  mainGainNode.gain.setValueAtTime(0, startValTime);
  mainGainNode.gain.linearRampToValueAtTime(gainVal * 0.5, startValTime + 0.01);
  mainGainNode.gain.exponentialRampToValueAtTime(0.0001, startValTime + decay);

  // FM Carrier
  const carrier = ctx.createOscillator();
  carrier.type = 'triangle';
  carrier.frequency.setValueAtTime(carrierFreq, startValTime);

  // FM Modulator
  const modulator = ctx.createOscillator();
  const modGain = ctx.createGain();
  modulator.type = 'sine';
  modulator.frequency.setValueAtTime(modFreq, startValTime);
  modGain.gain.setValueAtTime(fmIndex * modFreq, startValTime);
  modGain.gain.exponentialRampToValueAtTime(0.1, startValTime + (decay * 0.7));

  modulator.connect(modGain);
  modGain.connect(carrier.frequency);
  modulator.start(startValTime);
  modulator.stop(startValTime + decay);

  // Subtle Metallic Pick Attack
  const noiseBuffer = createNoiseBuffer(ctx, 0.08); // 80ms click
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(params.filterCutoff || 2200.0, startValTime);
  noiseFilter.Q.setValueAtTime(8.0, startValTime);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(gainVal * 0.15, startValTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, startValTime + 0.08);

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseSource.start(startValTime);

  // Soft Saturation WaveShaper
  const waveShaper = ctx.createWaveShaper();
  waveShaper.curve = makeDistortionCurve(3); // Gentle warm saturation

  carrier.connect(mainGainNode);
  noiseGain.connect(mainGainNode);
  mainGainNode.connect(waveShaper);
  waveShaper.connect(engine.masterGain);
  if (engine.convolverMine) {
    waveShaper.connect(engine.convolverMine);
  }

  carrier.start(startValTime);
  carrier.stop(startValTime + decay + 0.1);

  engine.scheduleCleanup([mainGainNode, noiseGain, noiseFilter, waveShaper], delaySeconds + decay + 0.5);
}

// 4. Forensic Glitch (Clean Ring Modulation + Mine Convolver)
export function triggerGlitch(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const startValTime = Math.max(ctx.currentTime, triggerTime);
  const baseFreq = params.baseFrequency || 330.0;
  const decay = params.decay || 0.4;
  const gainVal = params.gain !== undefined ? params.gain : 0.5;

  const glitchGain = ctx.createGain();
  glitchGain.gain.setValueAtTime(0, startValTime);
  glitchGain.gain.linearRampToValueAtTime(gainVal * 0.4, startValTime + 0.005);
  glitchGain.gain.exponentialRampToValueAtTime(0.0001, startValTime + decay);

  // Primary Carrier
  const carrier = ctx.createOscillator();
  carrier.type = 'square';
  carrier.frequency.setValueAtTime(baseFreq, startValTime);

  // Ring Modulator Multiplier
  const ringMod = ctx.createOscillator();
  const ringGain = ctx.createGain();
  ringMod.type = 'triangle';
  ringMod.frequency.setValueAtTime(baseFreq * (params.harmonicity || 1.73), startValTime);

  ringMod.connect(ringGain.gain);
  carrier.connect(ringGain);
  ringGain.connect(glitchGain);

  ringMod.start(startValTime);
  carrier.start(startValTime);
  ringMod.stop(startValTime + decay);
  carrier.stop(startValTime + decay);

  glitchGain.connect(engine.masterGain);
  if (engine.convolverMine) {
    glitchGain.connect(engine.convolverMine);
  }

  engine.scheduleCleanup([glitchGain, ringGain], delaySeconds + decay + 0.5);
}

// 5. Classic Sacred Bronze Bell (Clean Physical Modal Synthesis + Lowpass Cathedral Convolver)
export function triggerSacredBell(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const startValTime = Math.max(ctx.currentTime, triggerTime);
  const baseFreq = params.baseFrequency || CLIENT_CONFIG.AUDIO.DEFAULT_FREQUENCY_HZ;
  const decay = params.decay || 1.5;
  const gainVal = params.gain !== undefined ? params.gain : 0.8;

  // Physical colonial bronze bell modal ratios (Hum, Prime, Tierce minor 3rd, Quint, Nominal, Supernominal, Octave)
  const modalRatios = [0.5, 1.0, 1.20, 1.50, 2.0, 2.76, 3.25];

  const bellGainNode = ctx.createGain();
  bellGainNode.gain.setValueAtTime(0, startValTime);
  bellGainNode.gain.linearRampToValueAtTime(0.5, startValTime + 0.04);
  bellGainNode.gain.exponentialRampToValueAtTime(0.0001, startValTime + decay + 0.5);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(params.filterCutoff || 1200, startValTime);
  filter.Q.setValueAtTime(1.5, startValTime);

  modalRatios.forEach((ratio, idx) => {
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    const freq = baseFreq * ratio;
    const detuneCents = idx === 0 ? 0 : (idx % 2 === 0 ? 6 : -6);

    osc.type = params.carrierType || 'sine';
    osc.frequency.setValueAtTime(freq, startValTime);
    if (detuneCents !== 0) {
      osc.detune.setValueAtTime(detuneCents, startValTime);
    }

    const partialAmp = (1.0 / (idx * 0.9 + 1)) * gainVal * 0.35;
    oscGain.gain.setValueAtTime(0, startValTime);
    oscGain.gain.linearRampToValueAtTime(partialAmp, startValTime + 0.04);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, startValTime + decay / ratio);

    osc.connect(oscGain);
    oscGain.connect(bellGainNode);

    osc.start(startValTime);
    osc.stop(startValTime + decay + 0.6);
  });

  bellGainNode.connect(filter);
  applyReflectorDSPChain(engine, filter, params, triggerTime, decay);

  engine.scheduleCleanup([bellGainNode, filter], delaySeconds + decay + 1.0);
}

// 6. Continuous Proximity Sub-Hum Emitter for Ouro Preto Mine Resonances
export function createContinuousEmitterOuroPretoMine(engine, params = {}) {
  if (!engine.ctx) return null;
  const ctx = engine.ctx;
  const now = ctx.currentTime;
  const baseFreq = params.baseFrequency || 55.0;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, now);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(320.0, now);
  filter.Q.setValueAtTime(2.0, now);

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  osc1.type = 'triangle';
  osc2.type = 'sine';
  osc1.frequency.setValueAtTime(baseFreq, now);
  osc2.frequency.setValueAtTime(baseFreq * 1.5, now);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(masterGain);
  masterGain.connect(engine.masterGain);
  if (engine.convolverMine) {
    masterGain.connect(engine.convolverMine);
  }

  osc1.start(now);
  osc2.start(now);

  return {
    masterGain,
    filter,
    stop: () => {
      try {
        osc1.stop();
        osc2.stop();
        masterGain.disconnect();
      } catch (_) {}
    }
  };
}

// Alias for backwards compatibility
export const createContinuousEmitterOuroPreto = createContinuousEmitterOuroPretoMine;

// 7. Continuous Proximity Mountain Valley Flux Drone Emitter
export function createContinuousEmitterOuroPretoDrone(engine, params = {}) {
  if (!engine.ctx) return null;
  const ctx = engine.ctx;
  const now = ctx.currentTime;
  const baseFreq = params.baseFrequency || 65.0;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, now);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(480.0, now);

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.setValueAtTime(0.12, now);
  lfoGain.gain.setValueAtTime(150.0, now);
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  const oscs = [0.997, 1.0, 1.003, 2.0].map((ratio) => {
    const osc = ctx.createOscillator();
    osc.type = ratio > 1.5 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(baseFreq * ratio, now);
    osc.connect(filter);
    osc.start(now);
    return osc;
  });

  filter.connect(masterGain);
  masterGain.connect(engine.masterGain);
  if (engine.convolverValley) {
    masterGain.connect(engine.convolverValley);
  }
  lfo.start(now);

  return {
    masterGain,
    filter,
    stop: () => {
      try {
        lfo.stop();
        oscs.forEach((o) => o.stop());
        masterGain.disconnect();
      } catch (_) {}
    }
  };
}


