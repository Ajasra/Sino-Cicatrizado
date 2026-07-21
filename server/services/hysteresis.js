import { CONFIG } from '../config.js';
import { calculateHaversineMeters } from './spatial.js';
import { updateNodeStateVector } from '../db/database.js';

export function evaluateSomaticProximity(somaticPosition, targetNode) {
  const distanceMeters = calculateHaversineMeters(somaticPosition, targetNode.coordinates);

  if (distanceMeters > CONFIG.PROXIMITY_MUTATION_THRESHOLD_M) {
    return null; // Outside proximity interaction zone
  }

  // Hysteresis calculation: P_{t+1} = P_t + alpha * exp(-lambda * d) * (P_{limit} - P_t)
  const alpha = CONFIG.SCAR_COEFFICIENT_ALPHA;
  const lambda = CONFIG.SPATIAL_DECAY_LAMBDA;
  const spatialWeight = Math.exp(-lambda * distanceMeters);

  const currentVector = targetNode.stateVector || {};
  const bounds = CONFIG.PARAMETER_BOUNDS;
  const scarIncrement = alpha * spatialWeight;
  const currentScarIndex = (targetNode.scarIndex || 0.0) + scarIncrement;

  // Multi-parameter hysteretic scar mutation
  const baseFreq = Number(currentVector.baseFrequency) || 220.0;
  // Microtonal pitch drift up/down (±3% oscillation as scars accumulate)
  const pitchDrift = 1.0 + (Math.sin(currentScarIndex * 8.5) * 0.03 * spatialWeight);
  const newFreq = clamp(baseFreq * pitchDrift, bounds.baseFrequency.min, bounds.baseFrequency.max);

  // Harmonicity drift
  const currentHarm = Number(currentVector.harmonicity) || 1.414;
  const newHarm = clamp(mutateParameter(currentHarm, bounds.harmonicity, alpha, spatialWeight), bounds.harmonicity.min, bounds.harmonicity.max);

  // Decay envelope tail variation
  const currentDecay = Number(currentVector.decay) || 1.5;
  const decayDelta = (Math.cos(currentScarIndex * 4.2) * 0.2 * spatialWeight);
  const newDecay = clamp(currentDecay + decayDelta, bounds.decay.min, bounds.decay.max);

  // FM Index distortion increases with scar accumulation
  const currentFm = Number(currentVector.fmIndex) || 0.0;
  const newFm = clamp(currentFm + (scarIncrement * 2.5), bounds.fmIndex.min, bounds.fmIndex.max);

  // Filter cutoff shift (darkening resonance as scars build up)
  const currentCutoff = Number(currentVector.filterCutoff) || 1200.0;
  const newCutoff = clamp(currentCutoff - (scarIncrement * 300.0), bounds.filterCutoff.min, bounds.filterCutoff.max);

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
    baseFrequency: Math.round(newFreq * 100) / 100,
    harmonicity: Math.round(newHarm * 1000) / 1000,
    decay: Math.round(newDecay * 100) / 100,
    gain: Math.round(mutateParameter(Number(currentVector.gain) || 1.0, bounds.gain, alpha, spatialWeight) * 100) / 100,
    euclideanDensity: Math.round(mutateParameter(Number(currentVector.euclideanDensity) || 2, bounds.euclideanDensity, alpha, spatialWeight)),
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
    distanceMeters
  };
}

function mutateParameter(currentValue, paramBound, alpha, spatialWeight) {
  const limit = paramBound.limit;
  const mutated = currentValue + alpha * spatialWeight * (limit - currentValue);
  return Math.min(Math.max(mutated, paramBound.min), paramBound.max);
}

function clamp(val, min, max) {
  if (isNaN(val)) return min;
  return Math.min(Math.max(val, min), max);
}
