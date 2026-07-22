import { CONFIG } from '../config.js';
import { calculateHaversineMeters } from './spatial.js';
import { updateNodeStateVector } from '../db/database.js';

/**
 * Generates a deterministic participant signature from somaticId.
 * Provides unique weight multipliers and directional parameter biases per participant.
 */
export function getSomaticSignature(somaticId) {
  if (!somaticId) {
    return { weightMultiplier: 1.0, pitchDir: 1, filterDir: -1, fmWeight: 1.0, decayDir: 1, harmDir: 1, fmDir: 1 };
  }
  let hash = 5381;
  const str = String(somaticId);
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  const uHash = Math.abs(hash);

  const weightMultiplier = 0.5 + ((uHash % 100) / 100.0) * 1.3; // 0.5x to 1.8x intensity
  const pitchDir = ((uHash >> 2) & 1) === 0 ? 1 : -1;             // +1 (pull pitch up) or -1 (pull pitch down)
  const filterDir = ((uHash >> 3) & 1) === 0 ? 1 : -1;            // +1 (brighten filter) or -1 (darken filter)
  const fmWeight = 0.5 + (((uHash >> 4) % 100) / 100.0) * 1.5;     // 0.5x to 2.0x FM distortion sensitivity
  const decayDir = ((uHash >> 5) & 1) === 0 ? 1 : -1;            // +1 (lengthen decay) or -1 (shorten decay)
  const harmDir = ((uHash >> 6) & 1) === 0 ? 1 : -1;             // +1 (increase harmonicity) or -1 (decrease harmonicity)
  const fmDir = ((uHash >> 7) & 1) === 0 ? 1 : -1;               // +1 (increase FM index) or -1 (decrease FM index)

  return {
    weightMultiplier,
    pitchDir,
    filterDir,
    fmWeight,
    decayDir,
    harmDir,
    fmDir
  };
}

export function evaluateSomaticProximity(somaticPosition, targetNode, somaticSignature = null, crowdMultiplier = 1.0) {
  const distanceMeters = calculateHaversineMeters(somaticPosition, targetNode.coordinates);
  const cityKey = targetNode.city || CONFIG.DEFAULT_CITY;
  const cityConfig = CONFIG.CITIES[cityKey] || CONFIG.CITIES[CONFIG.DEFAULT_CITY];
  const scarRadius = cityConfig?.scarRadiusMeters || CONFIG.PROXIMITY_MUTATION_THRESHOLD_M;

  if (distanceMeters > scarRadius) {
    return null; // Outside city-specific proximity scar interaction zone
  }

  const signature = (typeof somaticSignature === 'object' && somaticSignature !== null)
    ? somaticSignature
    : getSomaticSignature(somaticSignature);

  // Hysteresis calculation: P_{t+1} = P_t + alpha * exp(-lambda * d) * (P_{target} - P_t)
  const alpha = CONFIG.SCAR_COEFFICIENT_ALPHA;
  const lambda = CONFIG.SPATIAL_DECAY_LAMBDA;
  const spatialWeight = Math.exp(-lambda * distanceMeters);

  // Apply participant signature weight multiplier & crowd multiplier
  const effectiveAlpha = alpha * signature.weightMultiplier * crowdMultiplier;
  const scarIncrement = effectiveAlpha * spatialWeight;
  const currentScarIndex = (targetNode.scarIndex || 0.0) + scarIncrement;

  const currentVector = targetNode.stateVector || {};
  const bounds = CONFIG.PARAMETER_BOUNDS;

  // Multi-parameter hysteretic scar mutation influenced by participant signature (directional + or -)
  const fundamentalFreq = Number(currentVector.initialBaseFrequency) || Number(currentVector.baseFrequency) || 220.0;
  const baseFreq = mutateParameterDirectional(fundamentalFreq, bounds.baseFrequency, effectiveAlpha, spatialWeight, signature.pitchDir);

  // Microtonal pitch drift (±3% oscillation) applied to fundamental pitch without runaway compounding
  const pitchDrift = 1.0 + (signature.pitchDir * Math.sin(currentScarIndex * 8.5) * 0.03 * spatialWeight);
  const effectiveFreq = clamp(baseFreq * pitchDrift, bounds.baseFrequency.min, bounds.baseFrequency.max);

  // Harmonicity drift (directional)
  const currentHarm = Number(currentVector.harmonicity) || 1.414;
  const newHarm = mutateParameterDirectional(currentHarm, bounds.harmonicity, effectiveAlpha, spatialWeight, signature.harmDir);

  // Decay envelope tail variation (directional)
  const currentDecay = Number(currentVector.decay) || 1.5;
  const newDecay = mutateParameterDirectional(currentDecay, bounds.decay, effectiveAlpha, spatialWeight, signature.decayDir);

  // FM Index distortion (directional based on signature.fmDir & signature.fmWeight)
  const currentFm = Number(currentVector.fmIndex) || 0.0;
  const newFm = mutateParameterDirectional(currentFm, bounds.fmIndex, effectiveAlpha * signature.fmWeight, spatialWeight, signature.fmDir);

  // Filter cutoff shift (directional based on signature.filterDir)
  const currentCutoff = Number(currentVector.filterCutoff) || 1200.0;
  const newCutoff = mutateParameterDirectional(currentCutoff, bounds.filterCutoff, effectiveAlpha, spatialWeight, signature.filterDir);

  // Bit depth reduction for severe physical exhaustion (lowers from 16 to 4 bit as scarIndex exceeds 1.5)
  const currentBits = Number(currentVector.bitDepth) || 16;
  let newBits = currentBits;
  if (currentScarIndex > 1.5) {
    newBits = Math.max(bounds.bitDepth.min, Math.round(16 - ((currentScarIndex - 1.5) * 4)));
  }

  // Sound Archetype Morphing under extreme scar trauma (> 2.5 scar index)
  let soundType = currentVector.soundType || 'bell_sacred';
  if (currentScarIndex > 3.0) {
    soundType = 'glitch';
  } else if (currentScarIndex > 2.0 && soundType.startsWith('bell')) {
    soundType = 'industrial';
  }

  const mutatedVector = {
    ...currentVector,
    soundType,
    carrierType: currentVector.carrierType || 'sine',
    initialBaseFrequency: Math.round(baseFreq * 100) / 100,
    baseFrequency: Math.round(effectiveFreq * 100) / 100,
    harmonicity: Math.round(newHarm * 1000) / 1000,
    decay: Math.round(newDecay * 100) / 100,
    gain: Math.round(mutateParameterDirectional(Number(currentVector.gain) || 1.0, bounds.gain, effectiveAlpha, spatialWeight, 1) * 100) / 100,
    euclideanDensity: Math.round(mutateParameterDirectional(Number(currentVector.euclideanDensity) || 2, bounds.euclideanDensity, effectiveAlpha, spatialWeight, 1)),
    echoProbability: currentVector.echoProbability || 0.7,
    fmIndex: Math.round(newFm * 100) / 100,
    filterCutoff: Math.round(newCutoff),
    bitDepth: newBits
  };

  // Persist permanent scar mutation to database
  updateNodeStateVector(targetNode.nodeId, mutatedVector, scarIncrement);

  return {
    nodeId: targetNode.nodeId,
    mutatedStateVector: mutatedVector,
    scarIncrement,
    distanceMeters,
    signature
  };
}

function mutateParameterDirectional(currentValue, paramBound, alpha, spatialWeight, direction = 1) {
  const targetLimit = direction >= 0 ? paramBound.max : paramBound.min;
  const mutated = currentValue + alpha * spatialWeight * (targetLimit - currentValue);
  return clamp(mutated, paramBound.min, paramBound.max);
}

function clamp(val, min, max) {
  if (isNaN(val)) return min;
  return Math.min(Math.max(val, min), max);
}
