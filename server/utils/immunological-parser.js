import { CONFIG } from '../config.js';

export function validateSynthPreset(rawPreset) {
  let data = rawPreset;

  if (typeof rawPreset === 'string') {
    try {
      data = JSON.parse(rawPreset);
    } catch (err) {
      console.warn('[Immunology] Syntax error parsing payload. Reverting to Basal Soapstone Drone.');
      return getBasalSoapstonePreset();
    }
  }

  if (!data || typeof data !== 'object') {
    return getBasalSoapstonePreset();
  }

  const bounds = CONFIG.PARAMETER_BOUNDS;

  const soundTypePattern = /^[a-z0-9_]{2,40}$/i;
  const soundType = (typeof data.soundType === 'string' && soundTypePattern.test(data.soundType))
    ? data.soundType.toLowerCase()
    : 'bell_sacred';

  const validFilterTypes = ['lowpass', 'highpass', 'bandpass', 'notch', 'comb'];
  const filterType = validFilterTypes.includes(data.filterType) ? data.filterType : 'lowpass';

  return {
    soundType,
    carrierType: ['sine', 'triangle', 'sawtooth'].includes(data.carrierType) ? data.carrierType : 'sine',
    baseFrequency: clamp(Number(data.baseFrequency) || 220.0, bounds.baseFrequency.min, bounds.baseFrequency.max),
    harmonicity: clamp(Number(data.harmonicity) || 1.414, bounds.harmonicity.min, bounds.harmonicity.max),
    decay: clamp(Number(data.decay) || 1.5, bounds.decay.min, bounds.decay.max),
    gain: clamp(Number(data.gain) || 1.0, bounds.gain.min, bounds.gain.max),
    euclideanDensity: Math.round(clamp(Number(data.euclideanDensity) || 3, bounds.euclideanDensity.min, bounds.euclideanDensity.max)),
    echoProbability: clamp(Number(data.echoProbability) || 0.7, bounds.echoProbability ? bounds.echoProbability.min : 0.1, bounds.echoProbability ? bounds.echoProbability.max : 0.9),
    fmIndex: clamp(Number(data.fmIndex) || 0.0, bounds.fmIndex ? bounds.fmIndex.min : 0.0, bounds.fmIndex ? bounds.fmIndex.max : 10.0),
    filterCutoff: clamp(Number(data.filterCutoff) || 1200.0, bounds.filterCutoff ? bounds.filterCutoff.min : 100.0, bounds.filterCutoff ? bounds.filterCutoff.max : 5000.0),
    filterType,
    delayTimeMs: clamp(Number(data.delayTimeMs) || 250.0, 50.0, 1000.0),
    feedbackRatio: clamp(Number(data.feedbackRatio) || 0.3, 0.0, 0.85),
    combResonance: clamp(Number(data.combResonance) || 0.0, 0.0, 0.95),
    bitDepth: Math.round(clamp(Number(data.bitDepth) || 16, bounds.bitDepth ? bounds.bitDepth.min : 2, bounds.bitDepth ? bounds.bitDepth.max : 16))
  };
}

function clamp(value, min, max) {
  if (isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export function getBasalSoapstonePreset() {
  return {
    soundType: 'bell_sacred',
    carrierType: 'sine',
    baseFrequency: 220.0,
    harmonicity: 1.414,
    decay: 1.5,
    gain: 1.0,
    euclideanDensity: 3,
    echoProbability: 0.7,
    fmIndex: 0.0,
    filterCutoff: 1200.0,
    filterType: 'lowpass',
    delayTimeMs: 250.0,
    feedbackRatio: 0.3,
    combResonance: 0.0,
    bitDepth: 16
  };
}
