import { createNoiseBuffer, makeDistortionCurve } from '../general-filter.js';

/**
 * Chicago Procedural Acoustic Generators
 * Elevated L-train rail track clatter, skyscraper wind tunnels, Lake Michigan foghorns & iron drawbridges.
 */

// A. Elevated L-Train Rail Track Clatter & Iron Friction
export function triggerChicagoRail(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const baseFreq = params.baseFrequency || 140.0;
  const decay = params.decay || 1.8;
  const gainVal = params.gain !== undefined ? params.gain : 0.85;

  const mainGainNode = ctx.createGain();
  mainGainNode.gain.setValueAtTime(0, ctx.currentTime);
  mainGainNode.gain.linearRampToValueAtTime(gainVal * 0.5, triggerTime + 0.015);
  mainGainNode.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay);

  // FM Sawtooth / Square Carrier for metallic iron rail sound
  const carrier = ctx.createOscillator();
  carrier.type = params.carrierType || 'sawtooth';
  carrier.frequency.setValueAtTime(baseFreq, triggerTime);

  const modulator = ctx.createOscillator();
  const modGain = ctx.createGain();
  modulator.type = 'square';
  modulator.frequency.setValueAtTime(baseFreq * (params.harmonicity || 2.1), triggerTime);
  modGain.gain.setValueAtTime((params.fmIndex || 4.5) * baseFreq, triggerTime);
  modGain.gain.exponentialRampToValueAtTime(0.1, triggerTime + (decay * 0.6));

  modulator.connect(modGain);
  modGain.connect(carrier.frequency);
  modulator.start(triggerTime);
  modulator.stop(triggerTime + decay);

  // Rhythmic Wheel Click Transient
  const noiseBuffer = createNoiseBuffer(ctx, 0.05); // 50ms click
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(params.filterCutoff || 2800.0, triggerTime);
  noiseFilter.Q.setValueAtTime(6.0, triggerTime);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(gainVal * 0.25, triggerTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, triggerTime + 0.05);

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseSource.start(triggerTime);

  carrier.connect(mainGainNode);
  noiseGain.connect(mainGainNode);

  mainGainNode.connect(engine.masterGain);
  if (engine.convolverSteelBridge) {
    mainGainNode.connect(engine.convolverSteelBridge);
  }

  carrier.start(triggerTime);
  carrier.stop(triggerTime + decay + 0.1);

  engine.scheduleCleanup([mainGainNode, noiseFilter, noiseGain], delaySeconds + decay + 0.5);
}

// B. Skyscraper Wind Tunnel & Lake Michigan Wind Gale Whistle
export function triggerChicagoWind(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const baseFreq = params.baseFrequency || 220.0;
  const decay = params.decay || 5.0;
  const gainVal = params.gain !== undefined ? params.gain : 0.7;

  const mainGainNode = ctx.createGain();
  mainGainNode.gain.setValueAtTime(0, ctx.currentTime);
  mainGainNode.gain.linearRampToValueAtTime(gainVal * 0.4, triggerTime + 0.8);
  mainGainNode.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay);

  // Whistling Wind Resonant Sine Sweeper
  const oscA = ctx.createOscillator();
  const oscB = ctx.createOscillator();
  oscA.type = 'sine';
  oscB.type = 'triangle';

  oscA.frequency.setValueAtTime(baseFreq, triggerTime);
  oscA.frequency.exponentialRampToValueAtTime(baseFreq * 1.6, triggerTime + (decay * 0.5));
  oscA.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, triggerTime + decay);

  oscB.frequency.setValueAtTime(baseFreq * 1.5, triggerTime);
  oscB.frequency.exponentialRampToValueAtTime(baseFreq * 2.1, triggerTime + (decay * 0.6));

  // High Q Bandpass Wind Noise Filter
  const noiseBuffer = createNoiseBuffer(ctx, decay);
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  const windFilter = ctx.createBiquadFilter();
  windFilter.type = 'bandpass';
  windFilter.frequency.setValueAtTime(baseFreq * 1.2, triggerTime);
  windFilter.frequency.exponentialRampToValueAtTime(baseFreq * 2.4, triggerTime + decay * 0.5);
  windFilter.Q.setValueAtTime(10.0, triggerTime); // Sharp whistle peak

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(gainVal * 0.2, triggerTime + 0.2);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay);

  noiseSource.connect(windFilter);
  windFilter.connect(noiseGain);

  oscA.connect(mainGainNode);
  oscB.connect(mainGainNode);
  noiseGain.connect(mainGainNode);

  mainGainNode.connect(engine.masterGain);
  if (engine.convolverWindCanyon) {
    mainGainNode.connect(engine.convolverWindCanyon);
  }

  oscA.start(triggerTime);
  oscB.start(triggerTime);
  noiseSource.start(triggerTime);

  oscA.stop(triggerTime + decay + 0.2);
  oscB.stop(triggerTime + decay + 0.2);
  noiseSource.stop(triggerTime + decay + 0.2);

  engine.scheduleCleanup([mainGainNode, windFilter, noiseGain], delaySeconds + decay + 0.5);
}

// C. Lake Michigan Deep Maritime Foghorn (Sub-Bass Swell)
export function triggerChicagoFoghorn(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const baseFreq = params.baseFrequency || 65.0; // Deep sub frequency (45-85Hz)
  const decay = params.decay || 6.0;
  const gainVal = params.gain !== undefined ? params.gain : 0.95;

  const mainGainNode = ctx.createGain();
  mainGainNode.gain.setValueAtTime(0, ctx.currentTime);
  mainGainNode.gain.linearRampToValueAtTime(gainVal * 0.6, triggerTime + 0.4); // Foghorn atmospheric swell
  mainGainNode.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(180.0, triggerTime);
  filter.frequency.linearRampToValueAtTime(params.filterCutoff || 550.0, triggerTime + 0.5);
  filter.frequency.exponentialRampToValueAtTime(120.0, triggerTime + decay);

  // Dual detuned sub saw/square foghorn oscillators
  [1.0, 1.004, 0.5, 1.5].forEach((ratio) => {
    const osc = ctx.createOscillator();
    osc.type = ratio === 0.5 ? 'sine' : 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq * ratio, triggerTime);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(ratio === 0.5 ? 0.4 : 0.2, triggerTime);

    osc.connect(oscGain);
    oscGain.connect(filter);

    osc.start(triggerTime);
    osc.stop(triggerTime + decay + 0.3);
  });

  filter.connect(mainGainNode);
  mainGainNode.connect(engine.masterGain);
  if (engine.convolverWindCanyon) {
    mainGainNode.connect(engine.convolverWindCanyon);
  }

  engine.scheduleCleanup([mainGainNode, filter], delaySeconds + decay + 0.5);
}

// D. Chicago River Steel Drawbridge Iron Groan & Metallic Thud
export function triggerChicagoBridge(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const baseFreq = params.baseFrequency || 110.0;
  const decay = params.decay || 3.0;
  const gainVal = params.gain !== undefined ? params.gain : 0.85;

  const mainGainNode = ctx.createGain();
  mainGainNode.gain.setValueAtTime(0, ctx.currentTime);
  mainGainNode.gain.linearRampToValueAtTime(gainVal * 0.55, triggerTime + 0.02);
  mainGainNode.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay);

  // Sub-harmonic iron beam thud
  const subOsc = ctx.createOscillator();
  subOsc.type = 'sine';
  subOsc.frequency.setValueAtTime(baseFreq * 0.5, triggerTime);

  // Metallic Bridge Beam Inharmonic Ring (Ratios: 1.0, 2.41, 3.82)
  [1.0, 2.41, 3.82].forEach((ratio, idx) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq * ratio, triggerTime);

    const oscGain = ctx.createGain();
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
  const waveShaper = ctx.createWaveShaper();
  waveShaper.curve = makeDistortionCurve(4);

  mainGainNode.connect(waveShaper);
  waveShaper.connect(engine.masterGain);
  if (engine.convolverSteelBridge) {
    mainGainNode.connect(engine.convolverSteelBridge);
  }

  engine.scheduleCleanup([mainGainNode, waveShaper], delaySeconds + decay + 0.5);
}
