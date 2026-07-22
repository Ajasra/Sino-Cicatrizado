/**
 * General Filter & Reusable DSP Utilities for Sino Cicatrizado.
 * Standard Web Audio API node builders, procedural impulse response generation,
 * noise buffers, and multi-mode reflector DSP filter chains.
 */

/**
 * Generates a 100% procedural stereo Impulse Response AudioBuffer directly in JavaScript.
 * Uses lowpass noise smoothing to eliminate static/hiss.
 */
export function createProceduralImpulseResponse(ctx, durationSeconds = 2.0, decayRate = 3.0, options = {}) {
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.round(sampleRate * durationSeconds));
  const buffer = ctx.createBuffer(2, length, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  const targetCutoff = options.lpCutoff || 2000;
  const lpCoeff = Math.exp(-2 * Math.PI * targetCutoff / sampleRate);

  let lastL = 0;
  let lastR = 0;

  for (let i = 0; i < length; i++) {
    const t = i / length;
    const envelope = Math.exp(-t * decayRate);
    const damp = Math.exp(-t * (decayRate * 2.2));

    let rawL = (Math.random() * 2 - 1);
    let rawR = (Math.random() * 2 - 1);

    if (options.metalRing) {
      const ring = Math.sin(i * 0.08) * 0.25 + Math.sin(i * 0.21) * 0.15;
      rawL = rawL * 0.6 + ring;
      rawR = rawR * 0.6 + ring;
    }

    // Lowpass filtering to eliminate static hiss
    lastL = lastL * lpCoeff + rawL * (1 - lpCoeff);
    lastR = lastR * lpCoeff + rawR * (1 - lpCoeff);

    left[i] = (lastL * damp + rawL * envelope * 0.08);
    right[i] = (lastR * damp + rawR * envelope * 0.08);
  }

  // Peak normalization
  let maxPeak = 0;
  for (let i = 0; i < length; i++) {
    maxPeak = Math.max(maxPeak, Math.abs(left[i]), Math.abs(right[i]));
  }
  if (maxPeak > 0) {
    for (let i = 0; i < length; i++) {
      left[i] = (left[i] / maxPeak) * 0.35;
      right[i] = (right[i] / maxPeak) * 0.35;
    }
  }

  return buffer;
}

/**
 * Helper: Create White/Pink Noise Buffer
 */
export function createNoiseBuffer(ctx, durationSeconds = 0.1) {
  const bufferSize = Math.max(1, Math.round(ctx.sampleRate * durationSeconds));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/**
 * Helper: Soft-clipping WaveShaper Curve (Gentle warm saturation)
 */
export function makeDistortionCurve(amount = 3) {
  const k = amount;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

/**
 * Reflector Node DSP Chain Processor
 * Multi-mode filter bank (lowpass, highpass, bandpass, notch, comb),
 * FDN feedback delay, tape-warp pitch modulation, and scar timbral degradation.
 */
export function applyReflectorDSPChain(engine, sourceNode, params = {}, triggerTime = 0, decay = 2.0) {
  if (!engine || !engine.ctx || !sourceNode) return sourceNode;

  const ctx = engine.ctx;
  const now = triggerTime || ctx.currentTime;
  const filterType = params.filterType || 'lowpass';
  const filterCutoff = params.filterCutoff || 1200.0;
  const scarIndex = params.scarIndex || 0.0;

  let outputChain = sourceNode;

  // 1. Multi-Mode Filter Bank (lowpass, highpass, bandpass, notch, comb)
  if (filterType === 'comb' || (params.combResonance && params.combResonance > 0.05)) {
    const combDelayTime = 1.0 / Math.max(55.0, params.baseFrequency || 220.0);
    const combDelay = ctx.createDelay(0.1);
    combDelay.delayTime.setValueAtTime(combDelayTime, now);

    const combFeedback = ctx.createGain();
    const resonanceVal = Math.min(0.95, (params.combResonance || 0.6) + Math.min(scarIndex * 0.1, 0.2));
    combFeedback.gain.setValueAtTime(resonanceVal, now);

    sourceNode.connect(combDelay);
    combDelay.connect(combFeedback);
    combFeedback.connect(combDelay);

    const combGain = ctx.createGain();
    combGain.gain.setValueAtTime(0.7, now);
    combDelay.connect(combGain);

    outputChain = combGain;
  } else {
    const biquad = ctx.createBiquadFilter();
    biquad.type = ['lowpass', 'highpass', 'bandpass', 'notch'].includes(filterType) ? filterType : 'lowpass';
    biquad.frequency.setValueAtTime(filterCutoff, now);

    const baseQ = filterType === 'bandpass' ? 4.0 : 1.5;
    const qVal = Math.min(12.0, baseQ + scarIndex * 1.8);
    biquad.Q.setValueAtTime(qVal, now);

    sourceNode.connect(biquad);
    outputChain = biquad;
  }

  // 2. Feedback Delay Network (FDN) & Tape-Warp Pitch Modulation
  const delayTimeSec = (params.delayTimeMs || 250.0) / 1000.0;
  const feedbackRatio = Math.min(0.85, params.feedbackRatio !== undefined ? params.feedbackRatio : 0.3);

  if (feedbackRatio > 0.05 && delayTimeSec > 0.01) {
    const fdnDelay = ctx.createDelay(2.0);
    fdnDelay.delayTime.setValueAtTime(delayTimeSec, now);

    // Tape-warp pitch modulation LFO (subtle analog delay flutter)
    const warpLfo = ctx.createOscillator();
    const warpGain = ctx.createGain();
    warpLfo.type = 'sine';
    warpLfo.frequency.setValueAtTime(0.5 + scarIndex * 0.4, now);
    warpGain.gain.setValueAtTime(0.0025 * (1.0 + scarIndex), now);

    warpLfo.connect(warpGain);
    warpGain.connect(fdnDelay.delayTime);
    warpLfo.start(now);
    warpLfo.stop(now + decay + 2.0);

    const fdnFeedback = ctx.createGain();
    fdnFeedback.gain.setValueAtTime(feedbackRatio, now);
    fdnFeedback.gain.exponentialRampToValueAtTime(0.0001, now + decay + 2.0);

    const dampFilter = ctx.createBiquadFilter();
    dampFilter.type = 'lowpass';
    dampFilter.frequency.setValueAtTime(Math.min(3000.0, filterCutoff * 1.5), now);

    const delayLoopSum = ctx.createGain();
    delayLoopSum.gain.setValueAtTime(1.0, now);

    outputChain.connect(fdnDelay);
    fdnDelay.connect(dampFilter);
    dampFilter.connect(fdnFeedback);
    fdnFeedback.connect(fdnDelay); // Isolate feedback loop inside delay node
    fdnDelay.connect(delayLoopSum);
    outputChain.connect(delayLoopSum);

    outputChain = delayLoopSum;
  }

  // 3. Scarred Timbral Degradation & SH Noise Distortion/Echo Expansion
  const isNoisyProfile = engine.currentCityProfile === 'shanghai_noise' || params.soundType?.startsWith('shanghai_') || scarIndex > 1.5;

  if (isNoisyProfile) {
    // Lowpass filter to tame harsh highs and keep echo low, deep & dark
    const echoToneFilter = ctx.createBiquadFilter();
    echoToneFilter.type = 'lowpass';
    const cutoffFreq = engine.currentCityProfile === 'shanghai_noise' ? 850.0 : 1200.0;
    echoToneFilter.frequency.setValueAtTime(cutoffFreq, now);

    // Sub-octave ring modulation (baseF * 0.5) for a deep, low, dark rumble echo
    const ringOsc = ctx.createOscillator();
    const ringGain = ctx.createGain();
    ringOsc.type = 'sine';
    const baseF = params.baseFrequency || 180.0;
    ringOsc.frequency.setValueAtTime(Math.min(120.0, baseF * 0.5), now); // Deep low tone

    const ringIntensity = engine.currentCityProfile === 'shanghai_noise' ? 0.35 : 0.25;
    ringGain.gain.setValueAtTime(ringIntensity, now);
    ringOsc.connect(ringGain.gain);

    const saturationShaper = ctx.createWaveShaper();
    saturationShaper.curve = makeDistortionCurve(10);

    outputChain.connect(echoToneFilter);
    echoToneFilter.connect(saturationShaper);
    saturationShaper.connect(ringGain);

    ringOsc.start(now);
    ringOsc.stop(now + decay + 0.5);

    outputChain = ringGain;
  }

  // Connect final output chain to master gain and spatial convolvers
  if (engine.masterGain) {
    outputChain.connect(engine.masterGain);
  }

  if (engine.convolverCathedral && filterType === 'lowpass') {
    outputChain.connect(engine.convolverCathedral);
  } else if (engine.convolverWindCanyon && (filterType === 'bandpass' || filterType === 'highpass')) {
    outputChain.connect(engine.convolverWindCanyon);
  } else if (engine.convolverMine) {
    outputChain.connect(engine.convolverMine);
  }

  return outputChain;
}
