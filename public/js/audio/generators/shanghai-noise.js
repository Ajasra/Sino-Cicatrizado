/**
 * SH Noise (Shanghai Underground Experimental) Procedural Acoustic Generators
 * Harsh feedback bursts, bitcrushed glitch impulses, circuit bending pitch steps,
 * sub-bass industrial rumbles & dual continuous noise/drone proximity emitters.
 */

// A. Bitcrushed Granular Impulse & Pitch-Jitter Glitch
export function triggerShanghaiGlitch(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const baseFreq = params.baseFrequency || 640.0;
  const decay = params.decay || 1.2;
  const gainVal = params.gain !== undefined ? params.gain : 0.85;

  const mainGainNode = ctx.createGain();
  mainGainNode.gain.setValueAtTime(0, ctx.currentTime);
  mainGainNode.gain.linearRampToValueAtTime(gainVal * 0.5, triggerTime + 0.005);
  mainGainNode.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay);

  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(params.filterCutoff || 2500.0, triggerTime);
  filter.Q.setValueAtTime(5.0, triggerTime);

  // 4 Micro Granular Pitch Stutter Oscillators
  const grains = [1.0, 1.414, 2.718, 0.707];
  grains.forEach((ratio, idx) => {
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = params.carrierType || 'sawtooth';

    const grainFreq = baseFreq * ratio;
    osc.frequency.setValueAtTime(grainFreq, triggerTime + idx * 0.04);
    osc.frequency.setValueAtTime(grainFreq * 1.5, triggerTime + idx * 0.04 + 0.02);

    oscGain.gain.setValueAtTime(0.35 / (idx + 1), triggerTime + idx * 0.04);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, triggerTime + idx * 0.04 + (decay * 0.25));

    osc.connect(oscGain);
    oscGain.connect(filter);

    osc.start(triggerTime + idx * 0.04);
    osc.stop(triggerTime + decay + 0.1);
  });

  filter.connect(mainGainNode);
  mainGainNode.connect(engine.masterGain);

  engine.scheduleCleanup([mainGainNode, filter], delaySeconds + decay + 0.2);
}

// B. High FM-Index Feedback Burst & Filter Sweeper
export function triggerShanghaiHarshFeedback(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const baseFreq = params.baseFrequency || 520.0;
  const decay = params.decay || 2.5;
  const gainVal = params.gain !== undefined ? params.gain : 0.9;
  const fmIndex = params.fmIndex !== undefined ? params.fmIndex : 8.5;

  const mainGain = ctx.createGain();
  mainGain.gain.setValueAtTime(0, ctx.currentTime);
  mainGain.gain.linearRampToValueAtTime(gainVal * 0.5, triggerTime + 0.02);
  mainGain.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay);

  // FM Feedback Pair (Modulator -> Carrier)
  const carrier = ctx.createOscillator();
  const modulator = ctx.createOscillator();
  const modGain = ctx.createGain();

  carrier.type = 'sawtooth';
  modulator.type = 'square';

  carrier.frequency.setValueAtTime(baseFreq, triggerTime);
  modulator.frequency.setValueAtTime(baseFreq * (params.harmonicity || 3.14), triggerTime);
  modGain.gain.setValueAtTime(baseFreq * fmIndex, triggerTime);
  modGain.gain.exponentialRampToValueAtTime(1.0, triggerTime + decay);

  modulator.connect(modGain);
  modGain.connect(carrier.frequency);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1200.0, triggerTime);
  filter.frequency.exponentialRampToValueAtTime(params.filterCutoff || 4800.0, triggerTime + decay * 0.7);
  filter.Q.setValueAtTime(7.0, triggerTime);

  carrier.connect(filter);
  filter.connect(mainGain);
  mainGain.connect(engine.masterGain);

  carrier.start(triggerTime);
  modulator.start(triggerTime);
  carrier.stop(triggerTime + decay + 0.1);
  modulator.stop(triggerTime + decay + 0.1);

  engine.scheduleCleanup([mainGain, filter, modGain], delaySeconds + decay + 0.3);
}

// C. Rapid Stepping Pitch LFO & Ring-Mod Circuit Bend
export function triggerShanghaiCircuitBend(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const baseFreq = params.baseFrequency || 380.0;
  const decay = params.decay || 1.8;
  const gainVal = params.gain !== undefined ? params.gain : 0.85;

  const mainGain = ctx.createGain();
  mainGain.gain.setValueAtTime(0, ctx.currentTime);
  mainGain.gain.linearRampToValueAtTime(gainVal * 0.45, triggerTime + 0.01);
  mainGain.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay);

  // Stepped LFO Modulation
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'square';
  lfo.frequency.setValueAtTime(18.0, triggerTime);
  lfoGain.gain.setValueAtTime(baseFreq * 0.8, triggerTime);

  const carrier = ctx.createOscillator();
  carrier.type = 'square';
  carrier.frequency.setValueAtTime(baseFreq, triggerTime);
  lfo.connect(carrier.frequency);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(params.filterCutoff || 3600.0, triggerTime);
  filter.Q.setValueAtTime(4.0, triggerTime);

  carrier.connect(filter);
  filter.connect(mainGain);
  mainGain.connect(engine.masterGain);

  lfo.start(triggerTime);
  carrier.start(triggerTime);
  lfo.stop(triggerTime + decay);
  carrier.stop(triggerTime + decay);

  engine.scheduleCleanup([mainGain, filter, lfoGain], delaySeconds + decay + 0.2);
}

// D. Heavy Waveshaped Sub-Bass Impact & Industrial Rumble
export function triggerShanghaiSubRumble(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const baseFreq = params.baseFrequency || 40.0;
  const decay = params.decay || 6.0;
  const gainVal = params.gain !== undefined ? params.gain : 0.98;

  const mainGain = ctx.createGain();
  mainGain.gain.setValueAtTime(0, ctx.currentTime);
  mainGain.gain.linearRampToValueAtTime(gainVal * 0.7, triggerTime + 0.04);
  mainGain.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay);

  // Sub-Bass Heavy Oscillators (Sine + Sawtooth + Detuned Sub)
  const subOsc1 = ctx.createOscillator();
  const subOsc2 = ctx.createOscillator();
  const subOsc3 = ctx.createOscillator();
  subOsc1.type = 'sine';
  subOsc2.type = 'sawtooth';
  subOsc3.type = 'square';

  subOsc1.frequency.setValueAtTime(baseFreq, triggerTime);
  subOsc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.55, triggerTime + 0.35);

  subOsc2.frequency.setValueAtTime(baseFreq * 2.0, triggerTime);
  subOsc2.frequency.exponentialRampToValueAtTime(baseFreq * 0.85, triggerTime + 0.45);

  subOsc3.frequency.setValueAtTime(baseFreq * 0.5, triggerTime); // Sub-octave rumble

  // Lowpass Resonant Filter with Slow Distortion Envelope Sweep
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(380.0, triggerTime);
  filter.frequency.exponentialRampToValueAtTime(140.0, triggerTime + decay * 0.6);
  filter.Q.setValueAtTime(4.5, triggerTime);

  // Waveshaper Saturation for Raw Noise Texture
  const shaper = ctx.createWaveShaper();
  if (typeof engine.makeDistortionCurve === 'function') {
    shaper.curve = engine.makeDistortionCurve(12);
  }

  subOsc1.connect(filter);
  subOsc2.connect(filter);
  subOsc3.connect(filter);
  filter.connect(shaper);
  shaper.connect(mainGain);
  mainGain.connect(engine.masterGain);

  subOsc1.start(triggerTime);
  subOsc2.start(triggerTime);
  subOsc3.start(triggerTime);
  subOsc1.stop(triggerTime + decay);
  subOsc2.stop(triggerTime + decay);
  subOsc3.stop(triggerTime + decay);

  engine.scheduleCleanup([mainGain, filter, shaper], delaySeconds + decay + 0.3);
}

// E. Continuous Proximity Emitter #1: High-Frequency Electromagnetic Glitch Static
export function createContinuousEmitterShanghaiNoiseStatic(engine, params = {}) {
  if (!engine.ctx) return null;
  const ctx = engine.ctx;
  const now = ctx.currentTime;
  const baseFreq = params.baseFrequency || 480.0;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, now);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(2200.0, now);
  filter.Q.setValueAtTime(4.0, now);

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  osc1.type = 'sawtooth';
  osc2.type = 'square';

  osc1.frequency.setValueAtTime(baseFreq, now);
  osc2.frequency.setValueAtTime(baseFreq * 1.5, now);

  // Stepped LFO for jitter
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'square';
  lfo.frequency.setValueAtTime(8.0, now);
  lfoGain.gain.setValueAtTime(300.0, now);
  lfo.connect(filter.frequency);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(masterGain);
  masterGain.connect(engine.masterGain);

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

// F. Continuous Proximity Emitter #2: Sub-Bass Industrial Drone & Cellar Hum
export function createContinuousEmitterShanghaiNoiseDrone(engine, params = {}) {
  if (!engine.ctx) return null;
  const ctx = engine.ctx;
  const now = ctx.currentTime;
  const baseFreq = params.baseFrequency || 50.0;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, now);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(180.0, now);
  filter.Q.setValueAtTime(2.5, now);

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  osc1.type = 'sawtooth';
  osc2.type = 'sine';

  osc1.frequency.setValueAtTime(baseFreq, now);
  osc2.frequency.setValueAtTime(baseFreq * 1.015, now);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(masterGain);
  masterGain.connect(engine.masterGain);

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

// G. Continuous Proximity Emitter #3: Waveshaped Sub-Rumble & Low-End Vibratory Pressure Emitter
export function createContinuousEmitterShanghaiNoiseSubRumble(engine, params = {}) {
  if (!engine.ctx) return null;
  const ctx = engine.ctx;
  const now = ctx.currentTime;
  const baseFreq = params.baseFrequency || 38.0;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, now);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(220.0, now);
  filter.Q.setValueAtTime(3.5, now);

  // Sub-bass slow beating oscillators (38Hz & 38.4Hz for 0.4 Hz physical throbbing)
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const oscSub = ctx.createOscillator();

  osc1.type = 'sawtooth';
  osc2.type = 'sine';
  oscSub.type = 'square';

  osc1.frequency.setValueAtTime(baseFreq, now);
  osc2.frequency.setValueAtTime(baseFreq + 0.4, now);
  oscSub.frequency.setValueAtTime(baseFreq * 0.5, now); // Sub-octave rumble

  // Slow LFO filter swell
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(0.08, now);
  lfoGain.gain.setValueAtTime(80.0, now);
  lfo.connect(filter.frequency);

  osc1.connect(filter);
  osc2.connect(filter);
  oscSub.connect(filter);
  filter.connect(masterGain);
  masterGain.connect(engine.masterGain);

  osc1.start(now);
  osc2.start(now);
  oscSub.start(now);
  lfo.start(now);

  return {
    masterGain,
    filter,
    stop: () => {
      try {
        osc1.stop();
        osc2.stop();
        oscSub.stop();
        lfo.stop();
        masterGain.disconnect();
      } catch (_) {}
    }
  };
}

// H. Distorted Metallic Industrial Burst
export function triggerShanghaiIndustrialBurst(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const baseFreq = params.baseFrequency || 320.0;
  const decay = params.decay || 1.6;
  const gainVal = params.gain !== undefined ? params.gain : 0.9;

  const mainGain = ctx.createGain();
  mainGain.gain.setValueAtTime(0, ctx.currentTime);
  mainGain.gain.linearRampToValueAtTime(gainVal * 0.6, triggerTime + 0.008);
  mainGain.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay);

  // Square & Sawtooth metallic pair
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  osc1.type = 'square';
  osc2.type = 'sawtooth';

  osc1.frequency.setValueAtTime(baseFreq, triggerTime);
  osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.3, triggerTime + 0.15);

  osc2.frequency.setValueAtTime(baseFreq * 2.414, triggerTime);
  osc2.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, triggerTime + 0.2);

  const noiseBuffer = engine.createNoiseBuffer(0.2);
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'peaking';
  filter.frequency.setValueAtTime(params.filterCutoff || 2800.0, triggerTime);
  filter.Q.setValueAtTime(6.0, triggerTime);
  filter.gain.setValueAtTime(12.0, triggerTime);

  const shaper = ctx.createWaveShaper();
  if (typeof engine.makeDistortionCurve === 'function') {
    shaper.curve = engine.makeDistortionCurve(16);
  }

  osc1.connect(filter);
  osc2.connect(filter);
  noiseSource.connect(filter);
  filter.connect(shaper);
  shaper.connect(mainGain);
  mainGain.connect(engine.masterGain);

  osc1.start(triggerTime);
  osc2.start(triggerTime);
  noiseSource.start(triggerTime);
  osc1.stop(triggerTime + decay);
  osc2.stop(triggerTime + decay);

  engine.scheduleCleanup([mainGain, filter, shaper], delaySeconds + decay + 0.3);
}

// I. Radio Interference & Resonance Sweep
export function triggerShanghaiRadioGlitch(engine, params, triggerTime, delaySeconds) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const baseFreq = params.baseFrequency || 880.0;
  const decay = params.decay || 1.4;
  const gainVal = params.gain !== undefined ? params.gain : 0.8;

  const mainGain = ctx.createGain();
  mainGain.gain.setValueAtTime(0, ctx.currentTime);
  mainGain.gain.linearRampToValueAtTime(gainVal * 0.5, triggerTime + 0.01);
  mainGain.gain.exponentialRampToValueAtTime(0.0001, triggerTime + decay);

  const noiseBuffer = engine.createNoiseBuffer(decay * 0.8);
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  const carrier = ctx.createOscillator();
  carrier.type = 'triangle';
  carrier.frequency.setValueAtTime(baseFreq, triggerTime);
  carrier.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, triggerTime + decay * 0.5);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(params.filterCutoff || 3500.0, triggerTime);
  filter.frequency.exponentialRampToValueAtTime(800.0, triggerTime + decay * 0.8);
  filter.Q.setValueAtTime(10.0, triggerTime);

  noiseSource.connect(filter);
  carrier.connect(filter);
  filter.connect(mainGain);
  mainGain.connect(engine.masterGain);

  noiseSource.start(triggerTime);
  carrier.start(triggerTime);
  carrier.stop(triggerTime + decay);

  engine.scheduleCleanup([mainGain, filter], delaySeconds + decay + 0.3);
}
