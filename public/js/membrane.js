import { CLIENT_CONFIG } from './config.js';

export class ImmunologicalMembrane {
  static sanitizePayload(rawPayload) {
    let data = rawPayload;

    if (typeof rawPayload === 'string') {
      try {
        data = JSON.parse(rawPayload);
      } catch (err) {
        console.warn('[Immunology] Client payload syntax error. Returning Soapstone default.');
        return { ...CLIENT_CONFIG.DEFAULT_SOAPSTONE_PRESET };
      }
    }

    if (!data || typeof data !== 'object') {
      return { ...CLIENT_CONFIG.DEFAULT_SOAPSTONE_PRESET };
    }

    return {
      carrierType: ['sine', 'triangle', 'sawtooth'].includes(data.carrierType) ? data.carrierType : 'sine',
      baseFrequency: clamp(Number(data.baseFrequency) || 220.0, 80.0, 880.0),
      harmonicity: clamp(Number(data.harmonicity) || 1.414, 0.5, 4.0),
      decay: clamp(Number(data.decay) || 1.5, 0.1, 6.0),
      gain: clamp(Number(data.gain) || 1.0, 0.0, 1.0),
      euclideanDensity: Math.round(clamp(Number(data.euclideanDensity) || 3, 1, 16))
    };
  }
}

function clamp(val, min, max) {
  if (isNaN(val)) return min;
  return Math.min(Math.max(val, min), max);
}
