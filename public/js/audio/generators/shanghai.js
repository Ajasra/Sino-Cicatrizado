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
