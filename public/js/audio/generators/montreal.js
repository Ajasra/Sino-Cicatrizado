import { createNoiseBuffer, makeDistortionCurve } from '../general-filter.js';

/**
 * Montreal Experimental & New Media (MUTEK / SAT / RÉSO) Procedural Acoustic Generators
 * 
 * 8 Modular Instruments for Montreal:
 * 1. triggerMontrealSatGeodetic       - SAT Satosphère 360° Geodetic Dome spatial burst
 * 2. triggerMontrealMicroGlitch       - Mile End modular micro-montage & jitter
 * 3. triggerMontrealSubTactile        - MUTEK Nocturne sub-bass physical impact
 * 4. triggerMontrealSpectralBell      - Algorithmic additive inharmonic spectral bell
 * 5. triggerMontrealHydroOptic        - St. Lawrence hydrophone ice & optical laser pulse
 * 6. createContinuousEmitterMontrealModularDrone  - Bain Mathieu / Eastern Bloc analog modular drift
 * 7. createContinuousEmitterMontrealGranularCloud - RÉSO subterranean pedway granular cloud
 * 8. createContinuousEmitterMontrealFarineHum     - Farine Five Roses 60Hz cybernetic EMF neon hum
 */

// ===========================================================================
// TRANSIENT / TRIGGER INSTRUMENTS
// ===========================================================================

// 1. SAT Satosphère 360° Geodetic Dome Spatial Burst
export function triggerMontrealSatGeodetic(engine, params = {}, triggerTime = 0, delaySeconds = 0) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const baseFreq = params.baseFrequency || 440.0;
  const decay = params.decay || 2.4;
  const gainVal = params.gain !== undefined ? params.gain : 0.8;

  const startValTime = Math.max(ctx.currentTime, triggerTime);
  const mainGain = ctx.createGain();
  mainGain.gain.setValueAtTime(0, startValTime);
  mainGain.gain.linearRampToValueAtTime(gainVal * 0.55, startValTime + 0.008);
  mainGain.gain.exponentialRampToValueAtTime(0.0001, startValTime + decay);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(baseFreq * 1.5, startValTime);
  filter.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, startValTime + decay);
  filter.Q.setValueAtTime(4.0, startValTime);

  // 5 Clustered micro-detuned spatial partials
  const ratios = [0.985, 1.0, 1.015, 1.503, 2.008];
  const oscs = [];

  ratios.forEach((ratio, i) => {
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = i % 2 === 0 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(baseFreq * ratio, startValTime);

    const partGain = (0.4 / ratios.length) * (1.0 - i * 0.1);
    oscGain.gain.setValueAtTime(partGain, startValTime);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, startValTime + (decay * (1.0 - i * 0.12)));

    osc.connect(oscGain);
    oscGain.connect(filter);

    osc.start(startValTime);
    osc.stop(startValTime + decay + 0.1);
    oscs.push(osc);
  });

  filter.connect(mainGain);
  mainGain.connect(engine.masterGain);

  if (engine.convolverCathedral) {
    const revSend = ctx.createGain();
    revSend.gain.setValueAtTime(0.35, startValTime);
    mainGain.connect(revSend);
    revSend.connect(engine.convolverCathedral);
  }

  engine.scheduleCleanup([mainGain, filter], delaySeconds + decay + 0.3);
}

// 2. Mile End Modular Micro-Glitch & Jitter (Raster-noton / Akufen micromontage)
export function triggerMontrealMicroGlitch(engine, params = {}, triggerTime = 0, delaySeconds = 0) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const baseFreq = params.baseFrequency || 580.0;
  const decay = params.decay || 0.8;
  const gainVal = params.gain !== undefined ? params.gain : 0.85;

  const startValTime = Math.max(ctx.currentTime, triggerTime);
  const mainGain = ctx.createGain();
  mainGain.gain.setValueAtTime(0, startValTime);
  mainGain.gain.linearRampToValueAtTime(gainVal * 0.6, startValTime + 0.003);
  mainGain.gain.exponentialRampToValueAtTime(0.0001, startValTime + decay);

  // Micro-burst white noise transient
  const noiseBuf = createNoiseBuffer(ctx, 0.06);
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuf;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.setValueAtTime(3200.0, startValTime);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.4, startValTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, startValTime + 0.05);

  noiseSrc.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(mainGain);

  noiseSrc.start(startValTime);
  noiseSrc.stop(startValTime + 0.07);

  // Rapid pitch-stepped square/saw pulses
  const intervals = [1.0, 1.498, 2.245, 0.749];
  intervals.forEach((interval, idx) => {
    const pulseOsc = ctx.createOscillator();
    const pulseGain = ctx.createGain();
    pulseOsc.type = params.carrierType || 'square';

    const tOffset = startValTime + (idx * 0.025);
    pulseOsc.frequency.setValueAtTime(baseFreq * interval, tOffset);
    pulseGain.gain.setValueAtTime(0.28 / (idx + 1), tOffset);
    pulseGain.gain.exponentialRampToValueAtTime(0.0001, tOffset + 0.15);

    pulseOsc.connect(pulseGain);
    pulseGain.connect(mainGain);

    pulseOsc.start(tOffset);
    pulseOsc.stop(tOffset + 0.18);
  });

  const shaper = ctx.createWaveShaper();
  shaper.curve = makeDistortionCurve(6);
  mainGain.connect(shaper);
  shaper.connect(engine.masterGain);

  engine.scheduleCleanup([mainGain, shaper], delaySeconds + decay + 0.3);
}

// 3. MUTEK Nocturne Sub-Tactile Impact (Deep 95Hz -> 34Hz physical drop)
export function triggerMontrealSubTactile(engine, params = {}, triggerTime = 0, delaySeconds = 0) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const startFreq = params.baseFrequency || 95.0;
  const endFreq = 34.0;
  const decay = params.decay || 1.8;
  const gainVal = params.gain !== undefined ? params.gain : 0.95;

  const startValTime = Math.max(ctx.currentTime, triggerTime);
  const mainGain = ctx.createGain();
  mainGain.gain.setValueAtTime(0, startValTime);
  mainGain.gain.linearRampToValueAtTime(gainVal * 0.8, startValTime + 0.015);
  mainGain.gain.exponentialRampToValueAtTime(0.0001, startValTime + decay);

  // Primary sub drop oscillator
  const subOsc = ctx.createOscillator();
  subOsc.type = 'sine';
  subOsc.frequency.setValueAtTime(startFreq, startValTime);
  subOsc.frequency.exponentialRampToValueAtTime(endFreq, startValTime + 0.08);

  // Harmonic triangle layer for presence
  const harmOsc = ctx.createOscillator();
  harmOsc.type = 'triangle';
  harmOsc.frequency.setValueAtTime(startFreq * 2, startValTime);
  harmOsc.frequency.exponentialRampToValueAtTime(endFreq * 2, startValTime + 0.08);

  const harmGain = ctx.createGain();
  harmGain.gain.setValueAtTime(0.18, startValTime);
  harmGain.gain.exponentialRampToValueAtTime(0.0001, startValTime + 0.4);

  harmOsc.connect(harmGain);
  harmGain.connect(mainGain);

  // Sub lowpass steep filter
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(140.0, startValTime);

  subOsc.connect(lp);
  lp.connect(mainGain);
  mainGain.connect(engine.masterGain);

  subOsc.start(startValTime);
  harmOsc.start(startValTime);
  subOsc.stop(startValTime + decay + 0.1);
  harmOsc.stop(startValTime + decay + 0.1);

  engine.scheduleCleanup([mainGain, lp, harmGain], delaySeconds + decay + 0.2);
}

// 4. Algorithmic Spectral Bell (Additive inharmonic golden-ratio partials)
export function triggerMontrealSpectralBell(engine, params = {}, triggerTime = 0, delaySeconds = 0) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const f0 = params.baseFrequency || 260.0;
  const decay = params.decay || 4.2;
  const gainVal = params.gain !== undefined ? params.gain : 0.75;

  const startValTime = Math.max(ctx.currentTime, triggerTime);
  const mainGain = ctx.createGain();
  mainGain.gain.setValueAtTime(0, startValTime);
  mainGain.gain.linearRampToValueAtTime(gainVal * 0.5, startValTime + 0.01);
  mainGain.gain.exponentialRampToValueAtTime(0.0001, startValTime + decay);

  // Golden ratio & inharmonic spectral series: [1.0, 1.618, 2.414, 3.141, 4.236]
  const spectralRatios = [1.0, 1.618, 2.414, 3.141, 4.236];
  const amps = [1.0, 0.65, 0.42, 0.28, 0.15];
  const decayFactors = [1.0, 0.85, 0.65, 0.45, 0.3];

  spectralRatios.forEach((ratio, idx) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f0 * ratio, startValTime);

    const partDecay = decay * decayFactors[idx];
    g.gain.setValueAtTime(amps[idx] * 0.3, startValTime);
    g.gain.exponentialRampToValueAtTime(0.0001, startValTime + partDecay);

    // Subtle micro-FM on fundamental partial
    if (idx === 0) {
      const mod = ctx.createOscillator();
      const modG = ctx.createGain();
      mod.type = 'sine';
      mod.frequency.setValueAtTime(f0 * 1.414, startValTime);
      modG.gain.setValueAtTime(f0 * 0.8, startValTime);
      modG.gain.exponentialRampToValueAtTime(0.1, startValTime + 0.3);

      mod.connect(modG);
      modG.connect(osc.frequency);
      mod.start(startValTime);
      mod.stop(startValTime + 0.4);
    }

    osc.connect(g);
    g.connect(mainGain);

    osc.start(startValTime);
    osc.stop(startValTime + partDecay + 0.1);
  });

  mainGain.connect(engine.masterGain);

  if (engine.convolverValley) {
    const send = ctx.createGain();
    send.gain.setValueAtTime(0.4, startValTime);
    mainGain.connect(send);
    send.connect(engine.convolverValley);
  }

  engine.scheduleCleanup([mainGain], delaySeconds + decay + 0.3);
}

// 5. St. Lawrence Hydrophone & Optical Laser Pulse
export function triggerMontrealHydroOptic(engine, params = {}, triggerTime = 0, delaySeconds = 0) {
  if (!engine.ctx) return;
  const ctx = engine.ctx;
  const baseFreq = params.baseFrequency || 1400.0;
  const decay = params.decay || 1.1;
  const gainVal = params.gain !== undefined ? params.gain : 0.8;

  const startValTime = Math.max(ctx.currentTime, triggerTime);
  const mainGain = ctx.createGain();
  mainGain.gain.setValueAtTime(0, startValTime);
  mainGain.gain.linearRampToValueAtTime(gainVal * 0.55, startValTime + 0.004);
  mainGain.gain.exponentialRampToValueAtTime(0.0001, startValTime + decay);

  // Fast FM Laser Chirp (Carrier: 1400Hz -> 320Hz, Modulator: 380Hz)
  const carrier = ctx.createOscillator();
  const modulator = ctx.createOscillator();
  const modGain = ctx.createGain();

  carrier.type = 'sine';
  modulator.type = 'sawtooth';

  carrier.frequency.setValueAtTime(baseFreq, startValTime);
  carrier.frequency.exponentialRampToValueAtTime(320.0, startValTime + 0.25);

  modulator.frequency.setValueAtTime(380.0, startValTime);
  modGain.gain.setValueAtTime(900.0, startValTime);
  modGain.gain.exponentialRampToValueAtTime(0.1, startValTime + 0.25);

  modulator.connect(modGain);
  modGain.connect(carrier.frequency);

  // Highpass filter for crystalline hydro-optic presence
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(750.0, startValTime);

  carrier.connect(hp);
  hp.connect(mainGain);

  carrier.start(startValTime);
  modulator.start(startValTime);
  carrier.stop(startValTime + decay + 0.1);
  modulator.stop(startValTime + decay + 0.1);

  mainGain.connect(engine.masterGain);

  engine.scheduleCleanup([mainGain, hp, modGain], delaySeconds + decay + 0.2);
}

// ===========================================================================
// CONTINUOUS AMBIENT PROXIMITY EMITTERS
// ===========================================================================

// 6. Bain Mathieu / Eastern Bloc Modular Analog Drift (Dual Sawtooth Phasing Drone)
export function createContinuousEmitterMontrealModularDrone(engine, params = {}) {
  if (!engine.ctx) return null;
  const ctx = engine.ctx;
  const now = ctx.currentTime;
  const baseFreq = params.baseFrequency || 45.0;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(0.14, now + 2.0);

  // Dual detuned sawtooths + sub-triangle
  const saw1 = ctx.createOscillator();
  const saw2 = ctx.createOscillator();
  const subTri = ctx.createOscillator();

  saw1.type = 'sawtooth';
  saw2.type = 'sawtooth';
  subTri.type = 'triangle';

  saw1.frequency.setValueAtTime(baseFreq, now);
  saw2.frequency.setValueAtTime(baseFreq + 0.38, now); // Slow 0.38Hz phasing beat
  subTri.frequency.setValueAtTime(baseFreq * 0.5, now); // 22.5 Hz sub

  // Dual asynchronous LFOs modulating 4-pole lowpass filter
  const lfo1 = ctx.createOscillator();
  const lfoGain1 = ctx.createGain();
  lfo1.type = 'sine';
  lfo1.frequency.setValueAtTime(0.05, now);
  lfoGain1.gain.setValueAtTime(140.0, now);
  lfo1.connect(lfoGain1);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(380.0, now);
  filter.Q.setValueAtTime(3.0, now);
  lfoGain1.connect(filter.frequency);

  saw1.connect(filter);
  saw2.connect(filter);
  subTri.connect(filter);
  filter.connect(masterGain);
  masterGain.connect(engine.masterGain);

  saw1.start(now);
  saw2.start(now);
  subTri.start(now);
  lfo1.start(now);

  return {
    masterGain,
    stop() {
      const stopTime = ctx.currentTime;
      masterGain.gain.linearRampToValueAtTime(0.0001, stopTime + 1.5);
      setTimeout(() => {
        try {
          saw1.stop();
          saw2.stop();
          subTri.stop();
          lfo1.stop();
          masterGain.disconnect();
        } catch (_) {}
      }, 1600);
    }
  };
}

// 7. RÉSO Granular Subterranean Cloud (Micro-grain pedway texture)
export function createContinuousEmitterMontrealGranularCloud(engine, params = {}) {
  if (!engine.ctx) return null;
  const ctx = engine.ctx;
  const now = ctx.currentTime;
  const baseFreq = params.baseFrequency || 480.0;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(0.11, now + 2.0);

  // Pink noise source into bandpass wandering filter
  const noiseBuf = createNoiseBuffer(ctx, 4.0);
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuf;
  noiseSrc.loop = true;

  const bpFilter = ctx.createBiquadFilter();
  bpFilter.type = 'bandpass';
  bpFilter.frequency.setValueAtTime(baseFreq, now);
  bpFilter.Q.setValueAtTime(5.5, now);

  // Slow LFO shifting the spectral centroid
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(0.09, now);
  lfoGain.gain.setValueAtTime(280.0, now);
  lfo.connect(lfoGain);
  lfoGain.connect(bpFilter.frequency);

  noiseSrc.connect(bpFilter);
  bpFilter.connect(masterGain);
  masterGain.connect(engine.masterGain);

  noiseSrc.start(now);
  lfo.start(now);

  return {
    masterGain,
    stop() {
      const stopTime = ctx.currentTime;
      masterGain.gain.linearRampToValueAtTime(0.0001, stopTime + 1.5);
      setTimeout(() => {
        try {
          noiseSrc.stop();
          lfo.stop();
          masterGain.disconnect();
        } catch (_) {}
      }, 1600);
    }
  };
}

// 8. Farine Five Roses 60Hz Cybernetic EMF Neon Hum
export function createContinuousEmitterMontrealFarineHum(engine, params = {}) {
  if (!engine.ctx) return null;
  const ctx = engine.ctx;
  const now = ctx.currentTime;
  const fundamental = 60.0; // 60Hz North American power grid

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(0.12, now + 2.0);

  // Harmonics: 60Hz, 120Hz, 180Hz, 300Hz
  const harmonics = [1, 2, 3, 5];
  const gains = [0.08, 0.05, 0.03, 0.015];
  const oscs = [];

  harmonics.forEach((h, idx) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(fundamental * h, now);
    g.gain.setValueAtTime(gains[idx], now);

    osc.connect(g);
    g.connect(masterGain);
    osc.start(now);
    oscs.push(osc);
  });

  // Slow tremolo (breathing neon tube)
  const tremolo = ctx.createOscillator();
  const tremoloGain = ctx.createGain();
  tremolo.type = 'sine';
  tremolo.frequency.setValueAtTime(0.12, now);
  tremoloGain.gain.setValueAtTime(0.03, now);
  tremolo.connect(tremoloGain);
  tremoloGain.connect(masterGain.gain);
  tremolo.start(now);

  masterGain.connect(engine.masterGain);

  return {
    masterGain,
    stop() {
      const stopTime = ctx.currentTime;
      masterGain.gain.linearRampToValueAtTime(0.0001, stopTime + 1.2);
      setTimeout(() => {
        try {
          oscs.forEach(o => o.stop());
          tremolo.stop();
          masterGain.disconnect();
        } catch (_) {}
      }, 1400);
    }
  };
}
