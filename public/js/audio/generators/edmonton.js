import { createNoiseBuffer, makeDistortionCurve } from '../general-filter.js';

/**
 * Edmonton Procedural Acoustic Generators
 * North Saskatchewan River valley echoes, prairie sub-arctic frost wind, LRT electric rail friction,
 * Muttart glass pyramid chimes, High Level Bridge truss drones, Cree drumming, cold-snap timber
 * creaks, Fringe Festival brass & river valley coyote calls.
 */

// ===========================================================================
// TRIGGER GENERATORS (transient sound events)
// ===========================================================================

// A. Prairie Frost Wind & River Valley Shear
export function triggerEdmontonWind(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const baseFreq = params.baseFrequency || 180.0;
  const decay = params.decay || 3.5;
  const gainVal = params.gain !== undefined ? params.gain : 0.75;

  const startValTime = Math.max(ctx.currentTime, triggerTime);
  const mainGainNode = ctx.createGain();
  mainGainNode.gain.setValueAtTime(0, startValTime);
  mainGainNode.gain.linearRampToValueAtTime(gainVal * 0.5, startValTime + 0.3);
  mainGainNode.gain.exponentialRampToValueAtTime(0.0001, startValTime + decay);

  const noiseBuf = createNoiseBuffer(ctx, Math.min(decay + 0.5, 4.0));
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuf;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.setValueAtTime(baseFreq, startValTime);
  bandpass.frequency.exponentialRampToValueAtTime(Math.max(40.0, baseFreq * 0.4), startValTime + decay);
  bandpass.Q.setValueAtTime(4.5, startValTime);

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(0.4, startValTime);
  lfoGain.gain.setValueAtTime(60.0, startValTime);
  lfo.connect(lfoGain);
  lfoGain.connect(bandpass.frequency);

  noiseSource.connect(bandpass);
  bandpass.connect(mainGainNode);
  lfo.start(startValTime);
  noiseSource.start(startValTime);
  lfo.stop(startValTime + decay + 0.2);
  noiseSource.stop(startValTime + decay + 0.2);

  mainGainNode.connect(engine.masterGain);
  if (engine.convolverValley) mainGainNode.connect(engine.convolverValley);
}

// B. LRT Light Rail Electric Motor & Rail Squeal
export function triggerEdmontonLRT(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const baseFreq = params.baseFrequency || 210.0;
  const decay = params.decay || 2.2;
  const gainVal = params.gain !== undefined ? params.gain : 0.8;

  const startValTime = Math.max(ctx.currentTime, triggerTime);
  const mainGainNode = ctx.createGain();
  mainGainNode.gain.setValueAtTime(0, startValTime);
  mainGainNode.gain.linearRampToValueAtTime(gainVal * 0.6, startValTime + 0.05);
  mainGainNode.gain.exponentialRampToValueAtTime(0.0001, startValTime + decay);

  const carrier = ctx.createOscillator();
  carrier.type = params.carrierType || 'sawtooth';
  carrier.frequency.setValueAtTime(baseFreq, startValTime);
  carrier.frequency.exponentialRampToValueAtTime(baseFreq * 1.6, startValTime + (decay * 0.7));

  const mod = ctx.createOscillator();
  const modGain = ctx.createGain();
  mod.type = 'sine';
  mod.frequency.setValueAtTime(baseFreq * (params.harmonicity || 1.732), startValTime);
  modGain.gain.setValueAtTime((params.fmIndex || 3.5) * baseFreq, startValTime);
  mod.connect(modGain);
  modGain.connect(carrier.frequency);

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.setValueAtTime(params.filterCutoff || 1800.0, startValTime);

  carrier.connect(lowpass);
  lowpass.connect(mainGainNode);

  mod.start(startValTime);
  carrier.start(startValTime);
  mod.stop(startValTime + decay + 0.1);
  carrier.stop(startValTime + decay + 0.1);

  mainGainNode.connect(engine.masterGain);
}

// C. Muttart Glass Pyramid Chime Reflection (crystalline sine partials)
export function triggerEdmontonPyramid(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const baseFreq = params.baseFrequency || 523.25;
  const decay = params.decay || 4.5;
  const gainVal = params.gain !== undefined ? params.gain : 0.7;

  const startValTime = Math.max(ctx.currentTime, triggerTime);
  const mainGainNode = ctx.createGain();
  mainGainNode.gain.setValueAtTime(0, startValTime);
  mainGainNode.gain.linearRampToValueAtTime(gainVal * 0.5, startValTime + 0.02);
  mainGainNode.gain.exponentialRampToValueAtTime(0.0001, startValTime + decay);

  const glassPartials = [1.0, 2.76, 5.4, 8.1];
  glassPartials.forEach((ratio, idx) => {
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq * ratio, startValTime);
    const amp = (gainVal * 0.3) / (idx + 1);
    oscGain.gain.setValueAtTime(amp, startValTime);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, startValTime + (decay / (idx + 1)));
    osc.connect(oscGain);
    oscGain.connect(mainGainNode);
    osc.start(startValTime);
    osc.stop(startValTime + decay + 0.1);
  });

  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.setValueAtTime(params.filterCutoff || 1200.0, startValTime);
  mainGainNode.connect(highpass);
  highpass.connect(engine.masterGain);
  if (engine.convolverCathedral) highpass.connect(engine.convolverCathedral);
}

// D. High Level Bridge Truss Drone (river valley span)
export function triggerEdmontonBridge(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const baseFreq = params.baseFrequency || 90.0;
  const decay = params.decay || 5.0;
  const gainVal = params.gain !== undefined ? params.gain : 0.85;

  const startValTime = Math.max(ctx.currentTime, triggerTime);
  const mainGainNode = ctx.createGain();
  mainGainNode.gain.setValueAtTime(0, startValTime);
  mainGainNode.gain.linearRampToValueAtTime(gainVal * 0.6, startValTime + 0.1);
  mainGainNode.gain.exponentialRampToValueAtTime(0.0001, startValTime + decay);

  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(baseFreq, startValTime);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(params.filterCutoff || 600.0, startValTime);
  filter.Q.setValueAtTime(3.0, startValTime);

  osc.connect(filter);
  filter.connect(mainGainNode);
  osc.start(startValTime);
  osc.stop(startValTime + decay + 0.1);

  mainGainNode.connect(engine.masterGain);
  if (engine.convolverValley) mainGainNode.connect(engine.convolverValley);
}

// E. Cree / Indigenous Hand Drum Pulse & Percussive Resonance (RHYTHM)
export function triggerEdmontonDrum(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const baseFreq = params.baseFrequency || 110.0;
  const decay = params.decay || 1.4;
  const gainVal = params.gain !== undefined ? params.gain : 0.9;

  const startValTime = Math.max(ctx.currentTime, triggerTime);
  const mainGainNode = ctx.createGain();
  mainGainNode.gain.setValueAtTime(gainVal * 0.8, startValTime);
  mainGainNode.gain.exponentialRampToValueAtTime(0.0001, startValTime + decay);

  // Body oscillator — pitched drum skin resonance
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(baseFreq * 1.5, startValTime);
  osc.frequency.exponentialRampToValueAtTime(baseFreq, startValTime + 0.08); // rapid pitch drop

  // Noise transient (stick hit attack)
  const noiseBuf = createNoiseBuffer(ctx, 0.06);
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuf;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(params.filterCutoff || 900.0, startValTime);
  noiseFilter.Q.setValueAtTime(3.0, startValTime);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(gainVal * 0.4, startValTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, startValTime + 0.06);

  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(gainVal * 0.7, startValTime);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, startValTime + decay);

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  osc.connect(oscGain);
  noiseGain.connect(mainGainNode);
  oscGain.connect(mainGainNode);
  osc.start(startValTime);
  osc.stop(startValTime + decay + 0.1);
  noiseSource.start(startValTime);

  mainGainNode.connect(engine.masterGain);
  if (engine.convolverValley) mainGainNode.connect(engine.convolverValley);
}

// F. Cold Snap Timber Frame Creak (sub-zero structural tension) (RHYTHM)
export function triggerEdmontonCold(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const decay = params.decay || 0.3;
  const gainVal = params.gain !== undefined ? params.gain : 0.8;
  const cutoff = params.filterCutoff || 1400.0;

  const startValTime = Math.max(ctx.currentTime, triggerTime);
  const mainGainNode = ctx.createGain();
  mainGainNode.gain.setValueAtTime(gainVal * 0.9, startValTime);
  mainGainNode.gain.exponentialRampToValueAtTime(0.0001, startValTime + decay);

  // Sharp transient noise burst filtered to timber creak character
  const noiseBuf = createNoiseBuffer(ctx, Math.min(decay + 0.05, 0.5));
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuf;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.setValueAtTime(cutoff, startValTime);
  bandpass.frequency.exponentialRampToValueAtTime(cutoff * 0.4, startValTime + decay);
  bandpass.Q.setValueAtTime(12.0, startValTime);

  // Pitch oscillator for the snap body
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime((params.baseFrequency || 600.0), startValTime);
  osc.frequency.exponentialRampToValueAtTime(80.0, startValTime + decay);
  const oscGain = ctx.createGain();
  oscGain.gain.setValueAtTime(gainVal * 0.3, startValTime);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, startValTime + decay * 0.6);

  noiseSource.connect(bandpass);
  bandpass.connect(mainGainNode);
  osc.connect(oscGain);
  oscGain.connect(mainGainNode);
  noiseSource.start(startValTime);
  osc.start(startValTime);
  osc.stop(startValTime + decay + 0.1);

  mainGainNode.connect(engine.masterGain);
}

// G. Fringe Festival Outdoor Brass Ensemble Burst (RHYTHM)
export function triggerEdmontonBrass(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const baseFreq = params.baseFrequency || 293.66; // D4
  const decay = params.decay || 1.8;
  const gainVal = params.gain !== undefined ? params.gain : 0.75;

  const startValTime = Math.max(ctx.currentTime, triggerTime);
  const mainGainNode = ctx.createGain();
  mainGainNode.gain.setValueAtTime(0, startValTime);
  mainGainNode.gain.linearRampToValueAtTime(gainVal * 0.7, startValTime + 0.04);
  mainGainNode.gain.exponentialRampToValueAtTime(0.0001, startValTime + decay);

  // Ensemble of 3 slightly detuned sawtooth oscillators (brass section simulation)
  const detunes = [0, -12, +9]; // cents detuning for ensemble spread
  detunes.forEach((detuneCents) => {
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq, startValTime);
    osc.detune.setValueAtTime(detuneCents, startValTime);
    oscGain.gain.setValueAtTime(gainVal * 0.28, startValTime);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, startValTime + decay);
    osc.connect(oscGain);
    oscGain.connect(mainGainNode);
    osc.start(startValTime);
    osc.stop(startValTime + decay + 0.1);
  });

  // Brass lowpass formant filter
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(params.filterCutoff || 2200.0, startValTime);
  filter.Q.setValueAtTime(1.5, startValTime);
  mainGainNode.connect(filter);
  filter.connect(engine.masterGain);
  if (engine.convolverWindCanyon) filter.connect(engine.convolverWindCanyon);
}

// H. River Valley Coyote Howl (distant FM sine with vibrato LFO) (RHYTHM)
export function triggerEdmontonCoyote(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const baseFreq = params.baseFrequency || 620.0;
  const decay = params.decay || 3.5;
  const gainVal = params.gain !== undefined ? params.gain : 0.6;

  const startValTime = Math.max(ctx.currentTime, triggerTime);
  const mainGainNode = ctx.createGain();
  mainGainNode.gain.setValueAtTime(0, startValTime);
  mainGainNode.gain.linearRampToValueAtTime(gainVal * 0.6, startValTime + 0.25);
  mainGainNode.gain.setTargetAtTime(gainVal * 0.4, startValTime + 0.5, 0.6);
  mainGainNode.gain.exponentialRampToValueAtTime(0.0001, startValTime + decay);

  const carrier = ctx.createOscillator();
  carrier.type = 'sine';
  carrier.frequency.setValueAtTime(baseFreq * 0.8, startValTime);
  carrier.frequency.linearRampToValueAtTime(baseFreq, startValTime + 0.3);
  carrier.frequency.exponentialRampToValueAtTime(baseFreq * 1.4, startValTime + (decay * 0.6));
  carrier.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, startValTime + decay);

  // Vibrato LFO — natural pitch warble
  const vibLfo = ctx.createOscillator();
  const vibGain = ctx.createGain();
  vibLfo.type = 'sine';
  vibLfo.frequency.setValueAtTime(6.0, startValTime);
  vibGain.gain.setValueAtTime(0, startValTime);
  vibGain.gain.linearRampToValueAtTime(18.0, startValTime + 0.5); // vibrato grows in
  vibLfo.connect(vibGain);
  vibGain.connect(carrier.frequency);

  carrier.connect(mainGainNode);
  carrier.start(startValTime);
  vibLfo.start(startValTime);
  carrier.stop(startValTime + decay + 0.2);
  vibLfo.stop(startValTime + decay + 0.2);

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.setValueAtTime(baseFreq, startValTime);
  bandpass.Q.setValueAtTime(2.0, startValTime);

  mainGainNode.connect(bandpass);
  bandpass.connect(engine.masterGain);
  if (engine.convolverValley) bandpass.connect(engine.convolverValley);
}


// ===========================================================================
// CONTINUOUS EMITTERS (ambient background layers)
// ===========================================================================

// I. Continuous River Valley & Prairie Wind Drone
export function createContinuousEmitterEdmontonRiver(engine, params = {}) {
  if (!engine.ctx) return null;
  const ctx = engine.ctx;
  const now = ctx.currentTime;
  const baseFreq = params.baseFrequency || 50.0;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(0.18, now + 3.0);

  // Sub-bass binaural pair
  const subOsc1 = ctx.createOscillator();
  const subOsc2 = ctx.createOscillator();
  subOsc1.type = 'sine';
  subOsc2.type = 'sine';
  subOsc1.frequency.setValueAtTime(baseFreq, now);
  subOsc2.frequency.setValueAtTime(baseFreq + 0.2, now);

  // Looped prairie wind noise layer
  const noiseBuf = createNoiseBuffer(ctx, 3.0);
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuf;
  noiseSrc.loop = true;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.setValueAtTime(320.0, now);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.10, now);

  subOsc1.connect(masterGain);
  subOsc2.connect(masterGain);
  noiseSrc.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(masterGain);
  masterGain.connect(engine.masterGain);

  subOsc1.start(now);
  subOsc2.start(now);
  noiseSrc.start(now);

  return {
    masterGain,
    stop() {
      const stopTime = ctx.currentTime;
      masterGain.gain.linearRampToValueAtTime(0.0001, stopTime + 1.5);
      setTimeout(() => {
        try { subOsc1.stop(); subOsc2.stop(); noiseSrc.stop(); masterGain.disconnect(); } catch (_) {}
      }, 1600);
    }
  };
}

// J. Continuous LRT Electric Rail Proximity Hum (active near transit nodes)
export function createContinuousEmitterEdmontonLRT(engine, params = {}) {
  if (!engine.ctx) return null;
  const ctx = engine.ctx;
  const now = ctx.currentTime;
  const baseFreq = params.baseFrequency || 220.0;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(0.12, now + 2.0);

  // Electric motor inverter hum — two detuned sawtooths
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  osc1.type = 'sawtooth';
  osc2.type = 'sawtooth';
  osc1.frequency.setValueAtTime(baseFreq, now);
  osc2.frequency.setValueAtTime(baseFreq * 1.5, now); // 3rd harmonic

  // Very slow LFO to simulate motor RPM drift
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(0.08, now);
  lfoGain.gain.setValueAtTime(12.0, now);
  lfo.connect(lfoGain);
  lfoGain.connect(osc1.frequency);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800.0, now);
  filter.Q.setValueAtTime(2.0, now);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(masterGain);
  masterGain.connect(engine.masterGain);

  osc1.start(now);
  osc2.start(now);
  lfo.start(now);

  return {
    masterGain,
    stop() {
      const stopTime = ctx.currentTime;
      masterGain.gain.linearRampToValueAtTime(0.0001, stopTime + 1.2);
      setTimeout(() => {
        try { osc1.stop(); osc2.stop(); lfo.stop(); masterGain.disconnect(); } catch (_) {}
      }, 1300);
    }
  };
}
