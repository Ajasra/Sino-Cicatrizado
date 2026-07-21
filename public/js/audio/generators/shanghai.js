/**
 * Shanghai Procedural Acoustic Generators
 * Jing'an temple gongs, Huangpu river ferries & high-speed electromagnetic Maglev soaring resonance.
 */

// A. Bund Custom House & Jing'an Sacred Bronze Gong
export function triggerShanghaiGong(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const baseFreq = params.baseFrequency || 220.0;
  const decay = params.decay || 5.0;
  const gainVal = params.gain !== undefined ? params.gain : 0.9;

  const mainGainNode = ctx.createGain();
  mainGainNode.gain.setValueAtTime(0, ctx.currentTime);
  mainGainNode.gain.linearRampToValueAtTime(gainVal * 0.5, triggerTime + 0.03);
  mainGainNode.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(params.filterCutoff || 1500.0, triggerTime);
  filter.Q.setValueAtTime(2.0, triggerTime);

  // Eastern Gong modal ratios (Hum 0.5, Fundamental 1.0, Major 2nd 1.12, Minor 6th 1.62, Nominal 2.38)
  const gongRatios = [0.5, 1.0, 1.12, 1.62, 2.38, 3.14];

  gongRatios.forEach((ratio, idx) => {
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = params.carrierType || 'sine';
    const freq = baseFreq * ratio;
    osc.frequency.setValueAtTime(freq, triggerTime);

    // Subtle pitch bend down on impact for eastern gong characteristic
    if (idx === 1) {
      osc.frequency.setValueAtTime(freq + 4.0, triggerTime);
      osc.frequency.exponentialRampToValueAtTime(freq, triggerTime + 0.15);
    }

    const partialAmp = (1.0 / (idx * 0.8 + 1)) * 0.25;
    oscGain.gain.setValueAtTime(0, ctx.currentTime);
    oscGain.gain.linearRampToValueAtTime(partialAmp, triggerTime + 0.03);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, triggerTime + (decay / (ratio * 0.8)));

    osc.connect(oscGain);
    oscGain.connect(filter);

    osc.start(triggerTime);
    osc.stop(triggerTime + decay + 0.5);
  });

  filter.connect(mainGainNode);
  mainGainNode.connect(engine.masterGain);
  if (engine.convolverHuangpuRiver) {
    mainGainNode.connect(engine.convolverHuangpuRiver);
  }

  engine.scheduleCleanup([mainGainNode, filter], delaySeconds + decay + 0.5);
}

// B. Huangpu River Ferry & Cargo Vessel Foghorn
export function triggerShanghaiRiver(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const baseFreq = params.baseFrequency || 85.0; // Deep vessel horn
  const decay = params.decay || 5.5;
  const gainVal = params.gain !== undefined ? params.gain : 0.9;

  const mainGainNode = ctx.createGain();
  mainGainNode.gain.setValueAtTime(0, ctx.currentTime);
  mainGainNode.gain.linearRampToValueAtTime(gainVal * 0.55, triggerTime + 0.3); // River swell
  mainGainNode.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(320.0, triggerTime);
  filter.frequency.exponentialRampToValueAtTime(140.0, triggerTime + decay);

  // Water Vibrato Modulation (0.2 Hz slow river chorus)
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.setValueAtTime(0.2, triggerTime);
  lfoGain.gain.setValueAtTime(1.5, triggerTime);

  [1.0, 1.006, 0.5].forEach((ratio) => {
    const osc = ctx.createOscillator();
    osc.type = ratio === 0.5 ? 'sine' : 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq * ratio, triggerTime);

    lfo.connect(osc.frequency);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.3, triggerTime);

    osc.connect(oscGain);
    oscGain.connect(filter);

    osc.start(triggerTime);
    osc.stop(triggerTime + decay + 0.3);
  });

  lfo.start(triggerTime);
  lfo.stop(triggerTime + decay + 0.3);

  filter.connect(mainGainNode);
  mainGainNode.connect(engine.masterGain);
  if (engine.convolverHuangpuRiver) {
    mainGainNode.connect(engine.convolverHuangpuRiver);
  }

  engine.scheduleCleanup([mainGainNode, filter, lfoGain], delaySeconds + decay + 0.5);
}

// C. High-Speed Maglev Electromagnetic Rail Glide
export function triggerShanghaiMaglev(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const baseFreq = params.baseFrequency || 350.0;
  const decay = params.decay || 3.0;
  const gainVal = params.gain !== undefined ? params.gain : 0.85;

  const mainGainNode = ctx.createGain();
  mainGainNode.gain.setValueAtTime(0, ctx.currentTime);
  mainGainNode.gain.linearRampToValueAtTime(gainVal * 0.45, triggerTime + 0.2);
  mainGainNode.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay);

  // Electromagnetic Soaring Frequency Pitch Sweep (350Hz -> 680Hz -> 250Hz)
  const oscA = ctx.createOscillator();
  const oscB = ctx.createOscillator();
  oscA.type = 'sawtooth';
  oscB.type = 'square';

  oscA.frequency.setValueAtTime(baseFreq, triggerTime);
  oscA.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, triggerTime + (decay * 0.4));
  oscA.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, triggerTime + decay);

  oscB.frequency.setValueAtTime(baseFreq * 1.5, triggerTime);
  oscB.frequency.exponentialRampToValueAtTime(baseFreq * 2.2, triggerTime + (decay * 0.5));

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(baseFreq * 2, triggerTime);
  filter.frequency.exponentialRampToValueAtTime(params.filterCutoff || 3800.0, triggerTime + decay * 0.4);
  filter.Q.setValueAtTime(4.0, triggerTime);

  oscA.connect(filter);
  oscB.connect(filter);
  filter.connect(mainGainNode);

  mainGainNode.connect(engine.masterGain);
  if (engine.convolverHuangpuRiver) {
    mainGainNode.connect(engine.convolverHuangpuRiver);
  }

  oscA.start(triggerTime);
  oscB.start(triggerTime);
  oscA.stop(triggerTime + decay + 0.2);
  oscB.stop(triggerTime + decay + 0.2);

  engine.scheduleCleanup([mainGainNode, filter], delaySeconds + decay + 0.5);
}

// D. Summer Bamboo & Yuyuan Garden High-Frequency Cicadas Swarm (12 Hz Tremolo)
export function triggerShanghaiCicadas(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const baseFreq = params.baseFrequency || 4200.0;
  const decay = params.decay || 2.5;
  const gainVal = params.gain !== undefined ? params.gain : 0.6;

  const mainGainNode = ctx.createGain();
  mainGainNode.gain.setValueAtTime(0, ctx.currentTime);
  mainGainNode.gain.linearRampToValueAtTime(gainVal * 0.35, triggerTime + 0.1);
  mainGainNode.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay);

  // Tremolo Modulation (12 Hz rapid wing vibration)
  const tremoloOsc = ctx.createOscillator();
  const tremoloGain = ctx.createGain();
  tremoloOsc.type = 'sine';
  tremoloOsc.frequency.setValueAtTime(12.0, triggerTime);
  tremoloGain.gain.setValueAtTime(0.4, triggerTime);
  tremoloOsc.connect(tremoloGain.gain);

  const carrier = ctx.createOscillator();
  carrier.type = 'sawtooth';
  carrier.frequency.setValueAtTime(baseFreq, triggerTime);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(baseFreq, triggerTime);
  filter.Q.setValueAtTime(6.0, triggerTime);

  carrier.connect(filter);
  filter.connect(tremoloGain);
  tremoloGain.connect(mainGainNode);
  mainGainNode.connect(engine.masterGain);

  tremoloOsc.start(triggerTime);
  carrier.start(triggerTime);
  tremoloOsc.stop(triggerTime + decay);
  carrier.stop(triggerTime + decay);

  engine.scheduleCleanup([mainGainNode, filter, tremoloGain], delaySeconds + decay + 0.5);
}

// E. Pudong Skyscraper Heavy Construction Piling Drums & Metallic Impact
export function triggerShanghaiConstructionDrums(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const baseFreq = params.baseFrequency || 90.0;
  const decay = params.decay || 1.4;
  const gainVal = params.gain !== undefined ? params.gain : 0.85;

  const mainGainNode = ctx.createGain();
  mainGainNode.gain.setValueAtTime(0, ctx.currentTime);
  mainGainNode.gain.linearRampToValueAtTime(gainVal * 0.6, triggerTime + 0.01);
  mainGainNode.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay);

  // Heavy Sub Impact Pitch Drop (180Hz -> 65Hz)
  const subOsc = ctx.createOscillator();
  subOsc.type = 'sine';
  subOsc.frequency.setValueAtTime(baseFreq * 2.0, triggerTime);
  subOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, triggerTime + 0.12);

  // Metallic Piling Strike Transient
  const metalOsc = ctx.createOscillator();
  metalOsc.type = 'square';
  metalOsc.frequency.setValueAtTime(baseFreq * 3.4, triggerTime);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(950.0, triggerTime);

  subOsc.connect(filter);
  metalOsc.connect(filter);
  filter.connect(mainGainNode);
  mainGainNode.connect(engine.masterGain);
  if (engine.convolverHuangpuRiver) {
    mainGainNode.connect(engine.convolverHuangpuRiver);
  }

  subOsc.start(triggerTime);
  metalOsc.start(triggerTime);
  subOsc.stop(triggerTime + decay);
  metalOsc.stop(triggerTime + decay);

  engine.scheduleCleanup([mainGainNode, filter], delaySeconds + decay + 0.5);
}

// F. Continuous Proximity River & Vessel Drift Emitter for Shanghai Huangpu River
export function createContinuousEmitterShanghaiRiver(engine, params = {}) {
  if (!engine.ctx) return null;
  const ctx = engine.ctx;
  const now = ctx.currentTime;
  const baseFreq = params.baseFrequency || 65.0;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, now);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(280.0, now);

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  osc1.type = 'sawtooth';
  osc2.type = 'sine';
  osc1.frequency.setValueAtTime(baseFreq, now);
  osc2.frequency.setValueAtTime(baseFreq * 1.006, now);

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.setValueAtTime(0.18, now);
  lfoGain.gain.setValueAtTime(1.5, now);
  lfo.connect(osc1.frequency);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(masterGain);
  masterGain.connect(engine.masterGain);
  if (engine.convolverHuangpuRiver) {
    masterGain.connect(engine.convolverHuangpuRiver);
  }

  osc1.start(now);
  osc2.start(now);
  lfo.start(now);

  return {
    masterGain,
    filter,
    stop: () => {
      try {
        osc1.stop();
        osc2.stop();
        lfo.stop();
        masterGain.disconnect();
      } catch (_) {}
    }
  };
}

// Alias for backwards compatibility
export const createContinuousEmitterShanghai = createContinuousEmitterShanghaiRiver;

// G. Continuous Proximity Bund Neon & Urban Electromagnetic Ambient Emitter
export function createContinuousEmitterShanghaiCyber(engine, params = {}) {
  if (!engine.ctx) return null;
  const ctx = engine.ctx;
  const now = ctx.currentTime;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, now);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(720.0, now);
  filter.Q.setValueAtTime(3.5, now);

  const osc1 = ctx.createOscillator();
  osc1.type = 'square';
  osc1.frequency.setValueAtTime(130.0, now);

  osc1.connect(filter);
  filter.connect(masterGain);
  masterGain.connect(engine.masterGain);

  osc1.start(now);

  return {
    masterGain,
    filter,
    stop: () => {
      try {
        osc1.stop();
        masterGain.disconnect();
      } catch (_) {}
    }
  };
}


