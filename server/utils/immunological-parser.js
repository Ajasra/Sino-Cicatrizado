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

  return {
    carrierType: ['sine', 'triangle', 'sawtooth'].includes(data.carrierType) ? data.carrierType : 'sine',
    baseFrequency: clamp(Number(data.baseFrequency) || 220.0, bounds.baseFrequency.min, bounds.baseFrequency.max),
    harmonicity: clamp(Number(data.harmonicity) || 1.414, bounds.harmonicity.min, bounds.harmonicity.max),
    decay: clamp(Number(data.decay) || 1.5, bounds.decay.min, bounds.decay.max),
    gain: clamp(Number(data.gain) || 1.0, bounds.gain.min, bounds.gain.max),
    euclideanDensity: Math.round(clamp(Number(data.euclideanDensity) || 3, bounds.euclideanDensity.min, bounds.euclideanDensity.max))
  };
}

function clamp(value, min, max) {
  if (isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export function getBasalSoapstonePreset() {
  return {
    carrierType: 'sine',
    baseFrequency: 220.0,
    harmonicity: 1.414,
    decay: 1.5,
    gain: 1.0,
    euclideanDensity: 3
  };
}
