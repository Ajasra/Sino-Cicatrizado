import { createNoiseBuffer, makeDistortionCurve } from '../general-filter.js';

/**
 * São Paulo Procedural Acoustic Generators
 * Concrete brutalist slabs, subterranean Metrô tunnels, Cathedral bronze bells, 
 * Afro-Brazilian berimbau/atabaque wire resonance, and skyward helicopter Doppler shifts.
 */

// 1. Brutalist Concrete Slab Impact & Low-Pass Decay
export function triggerSaoPauloBrutalist(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const baseFreq = params.baseFrequency || 65.0;
  const decay = params.decay || 3.2;
  const gainVal = params.gain !== undefined ? params.gain : 0.85;

  const startValTime = Math.max(ctx.currentTime, triggerTime);
  const mainGainNode = ctx.createGain();
  mainGainNode.gain.setValueAtTime(0, startValTime);
  mainGainNode.gain.linearRampToValueAtTime(gainVal * 0.5, startValTime + 0.02);
  mainGainNode.gain.exponentialRampToValueAtTime(0.0001, startValTime + decay);

  // Deep Sub Osc (MASP / Minhocão Concrete Thud)
  const subOsc = ctx.createOscillator();
  subOsc.type = params.carrierType || 'sine';
  subOsc.frequency.setValueAtTime(baseFreq, triggerTime);
  subOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, triggerTime + decay);

  // Transient Impact Noise Filtered through Lowpass Concrete Resonator
  const noiseBuffer = createNoiseBuffer(ctx, 0.12);
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  const concreteFilter = ctx.createBiquadFilter();
  concreteFilter.type = 'lowpass';
  concreteFilter.frequency.setValueAtTime(params.filterCutoff || 280.0, triggerTime);
  concreteFilter.Q.setValueAtTime(4.0, triggerTime);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(gainVal * 0.4, triggerTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, triggerTime + 0.12);

  noiseSource.connect(concreteFilter);
  concreteFilter.connect(noiseGain);
  noiseSource.start(triggerTime);

  subOsc.connect(mainGainNode);
  noiseGain.connect(mainGainNode);

  mainGainNode.connect(engine.masterGain);
  if (engine.convolverCathedral) {
    mainGainNode.connect(engine.convolverCathedral);
  }

  subOsc.start(triggerTime);
  subOsc.stop(triggerTime + decay + 0.1);

  engine.scheduleCleanup([mainGainNode, concreteFilter, noiseGain], delaySeconds + decay + 0.5);
}

// 2. Subterranean Metro Rail Friction & Tunnel Squeal
export function triggerSaoPauloSubway(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const baseFreq = params.baseFrequency || 135.0;
  const decay = params.decay || 2.4;
  const gainVal = params.gain !== undefined ? params.gain : 0.8;

  const startValTime = Math.max(ctx.currentTime, triggerTime);
  const mainGainNode = ctx.createGain();
  mainGainNode.gain.setValueAtTime(0, startValTime);
  mainGainNode.gain.linearRampToValueAtTime(gainVal * 0.45, startValTime + 0.03);
  mainGainNode.gain.exponentialRampToValueAtTime(0.0001, startValTime + decay);

  // FM Steel Rail Squeal
  const carrier = ctx.createOscillator();
  carrier.type = params.carrierType || 'sawtooth';
  carrier.frequency.setValueAtTime(baseFreq, triggerTime);

  const modulator = ctx.createOscillator();
  const modGain = ctx.createGain();
  modulator.type = 'square';
  modulator.frequency.setValueAtTime(baseFreq * (params.harmonicity || 2.41), triggerTime);
  modGain.gain.setValueAtTime((params.fmIndex || 6.5) * baseFreq, triggerTime);
  modGain.gain.exponentialRampToValueAtTime(0.1, triggerTime + (decay * 0.7));

  modulator.connect(modGain);
  modGain.connect(carrier.frequency);
  modulator.start(triggerTime);
  modulator.stop(triggerTime + decay);

  // Tunnel Bandpass Filter Sweep
  const tunnelFilter = ctx.createBiquadFilter();
  tunnelFilter.type = 'bandpass';
  tunnelFilter.frequency.setValueAtTime(params.filterCutoff || 2400.0, triggerTime);
  tunnelFilter.Q.setValueAtTime(5.5, triggerTime);
  tunnelFilter.frequency.exponentialRampToValueAtTime(800.0, triggerTime + decay);

  carrier.connect(tunnelFilter);
  tunnelFilter.connect(mainGainNode);

  mainGainNode.connect(engine.masterGain);
  if (engine.convolverMine) {
    mainGainNode.connect(engine.convolverMine);
  }

  carrier.start(triggerTime);
  carrier.stop(triggerTime + decay + 0.1);

  engine.scheduleCleanup([mainGainNode, tunnelFilter, modGain], delaySeconds + decay + 0.5);
}

// 3. Cathedral Bronze Bell & Afro-Brazilian Metallic Wire Ring
export function triggerSaoPauloAtabaqueBell(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const baseFreq = params.baseFrequency || 220.0;
  const decay = params.decay || 4.5;
  const gainVal = params.gain !== undefined ? params.gain : 0.9;

  const startValTime = Math.max(ctx.currentTime, triggerTime);
  const mainGainNode = ctx.createGain();
  mainGainNode.gain.setValueAtTime(0, startValTime);
  mainGainNode.gain.linearRampToValueAtTime(gainVal * 0.5, startValTime + 0.008);
  mainGainNode.gain.exponentialRampToValueAtTime(0.0001, startValTime + decay);

  // Inharmonic bronze bell ratios mixed with berimbau wire micro-pitch bend
  const modeRatios = [1.0, 1.48, 2.09, 2.74, 3.82];
  const modeGains = [0.45, 0.25, 0.15, 0.1, 0.05];

  const oscs = [];
  const gains = [];

  modeRatios.forEach((ratio, idx) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = idx === 0 ? 'sine' : 'triangle';

    const freq = baseFreq * ratio;
    osc.frequency.setValueAtTime(freq * 1.02, triggerTime); // Berimbau attack pitch bend
    osc.frequency.exponentialRampToValueAtTime(freq, triggerTime + 0.05);

    g.gain.setValueAtTime(modeGains[idx], startValTime);
    g.gain.exponentialRampToValueAtTime(0.0001, startValTime + (decay / (idx + 1)));

    osc.connect(g);
    g.connect(mainGainNode);
    osc.start(triggerTime);
    osc.stop(triggerTime + decay + 0.1);

    oscs.push(osc);
    gains.push(g);
  });

  mainGainNode.connect(engine.masterGain);
  if (engine.convolverCathedral) {
    mainGainNode.connect(engine.convolverCathedral);
  }

  engine.scheduleCleanup([mainGainNode, ...gains], delaySeconds + decay + 0.5);
}

// 4. Skyline Rotor Blade FM Doppler (Helicopter Flight Path)
export function triggerSaoPauloChopper(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const baseFreq = params.baseFrequency || 85.0;
  const decay = params.decay || 3.8;
  const gainVal = params.gain !== undefined ? params.gain : 0.75;

  const startValTime = Math.max(ctx.currentTime, triggerTime);
  const mainGainNode = ctx.createGain();
  mainGainNode.gain.setValueAtTime(0, startValTime);
  mainGainNode.gain.linearRampToValueAtTime(gainVal * 0.4, startValTime + 0.5);
  mainGainNode.gain.exponentialRampToValueAtTime(0.0001, startValTime + decay);

  // Rotor Thrum (14 Hz Amplitude Tremolo)
  const carrier = ctx.createOscillator();
  carrier.type = params.carrierType || 'sawtooth';
  carrier.frequency.setValueAtTime(baseFreq, triggerTime);
  carrier.frequency.exponentialRampToValueAtTime(baseFreq * 1.15, triggerTime + (decay * 0.5)); // Doppler pitch up
  carrier.frequency.exponentialRampToValueAtTime(baseFreq * 0.85, triggerTime + decay); // Doppler pitch down

  const tremolo = ctx.createOscillator();
  const tremoloGain = ctx.createGain();
  tremolo.frequency.setValueAtTime(14.0, triggerTime); // 14 Hz rotor chop rate
  tremoloGain.gain.setValueAtTime(0.7, triggerTime);

  tremolo.connect(tremoloGain.gain);
  carrier.connect(tremoloGain);

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.setValueAtTime(params.filterCutoff || 850.0, triggerTime);

  tremoloGain.connect(lowpass);
  lowpass.connect(mainGainNode);

  tremolo.start(triggerTime);
  tremolo.stop(triggerTime + decay);
  carrier.start(triggerTime);
  carrier.stop(triggerTime + decay + 0.1);

  mainGainNode.connect(engine.masterGain);
  if (engine.convolverValley) {
    mainGainNode.connect(engine.convolverValley);
  }

  engine.scheduleCleanup([mainGainNode, lowpass, tremoloGain], delaySeconds + decay + 0.5);
}

// 5. Continuous Proximity Emitter: Avenida Paulista Rain & Traffic Canyon
export function createContinuousEmitterSaoPauloTraffic(engine, node) {
  if (!engine.ctx) return null;
  const ctx = engine.ctx;

  const gainNode = ctx.createGain();
  gainNode.gain.value = 0.0;

  const noiseBuffer = createNoiseBuffer(ctx, 4.0);
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  const filter1 = ctx.createBiquadFilter();
  filter1.type = 'lowpass';
  filter1.frequency.value = 450.0;

  const filter2 = ctx.createBiquadFilter();
  filter2.type = 'peaking';
  filter2.frequency.value = 2800.0;
  filter2.Q.value = 1.5;
  filter2.gain.value = 4.0; // Rain/asphalt shimmer

  noiseSource.connect(filter1);
  filter1.connect(filter2);
  filter2.connect(gainNode);

  if (engine.convolverValley) {
    gainNode.connect(engine.convolverValley);
  }
  gainNode.connect(engine.masterGain);

  noiseSource.start();

  return {
    source: noiseSource,
    gainNode,
    type: 'traffic',
    stop() {
      try {
        noiseSource.stop();
        noiseSource.disconnect();
        gainNode.disconnect();
      } catch (e) {}
    }
  };
}

// 6. Continuous Proximity Emitter: Subterranean Metrô Hum & Vault Ventilation Draft
export function createContinuousEmitterSaoPauloSubway(engine, node) {
  if (!engine.ctx) return null;
  const ctx = engine.ctx;

  const gainNode = ctx.createGain();
  gainNode.gain.value = 0.0;

  // Dual detuned 55 Hz sub hum
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  osc1.type = 'sine';
  osc2.type = 'triangle';
  osc1.frequency.value = 54.3;
  osc2.frequency.value = 55.7;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 180.0;

  osc1.connect(lowpass);
  osc2.connect(lowpass);
  lowpass.connect(gainNode);

  if (engine.convolverMine) {
    gainNode.connect(engine.convolverMine);
  }
  gainNode.connect(engine.masterGain);

  osc1.start();
  osc2.start();

  return {
    source: [osc1, osc2],
    gainNode,
    type: 'subway_hum',
    stop() {
      try {
        osc1.stop();
        osc2.stop();
        osc1.disconnect();
        osc2.disconnect();
        gainNode.disconnect();
      } catch (e) {}
    }
  };
}
