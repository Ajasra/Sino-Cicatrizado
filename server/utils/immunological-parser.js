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

  const validSoundTypes = ['bell_deep', 'bell_sacred', 'drone', 'industrial', 'glitch'];

  return {
    soundType: validSoundTypes.includes(data.soundType) ? data.soundType : 'bell_sacred',
    carrierType: ['sine', 'triangle', 'sawtooth'].includes(data.carrierType) ? data.carrierType : 'sine',
    baseFrequency: clamp(Number(data.baseFrequency) || 220.0, bounds.baseFrequency.min, bounds.baseFrequency.max),
    harmonicity: clamp(Number(data.harmonicity) || 1.414, bounds.harmonicity.min, bounds.harmonicity.max),
    decay: clamp(Number(data.decay) || 1.5, bounds.decay.min, bounds.decay.max),
    gain: clamp(Number(data.gain) || 1.0, bounds.gain.min, bounds.gain.max),
    euclideanDensity: Math.round(clamp(Number(data.euclideanDensity) || 3, bounds.euclideanDensity.min, bounds.euclideanDensity.max)),
    echoProbability: clamp(Number(data.echoProbability) || 0.7, bounds.echoProbability ? bounds.echoProbability.min : 0.1, bounds.echoProbability ? bounds.echoProbability.max : 0.9),
    fmIndex: clamp(Number(data.fmIndex) || 0.0, bounds.fmIndex ? bounds.fmIndex.min : 0.0, bounds.fmIndex ? bounds.fmIndex.max : 10.0),
    filterCutoff: clamp(Number(data.filterCutoff) || 1200.0, bounds.filterCutoff ? bounds.filterCutoff.min : 100.0, bounds.filterCutoff ? bounds.filterCutoff.max : 5000.0),
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
    bitDepth: 16
  };
}
