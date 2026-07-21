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

  const currentVector = targetNode.stateVector;
  const bounds = CONFIG.PARAMETER_BOUNDS;

  const mutatedVector = {
    baseFrequency: mutateParameter(currentVector.baseFrequency, bounds.baseFrequency, alpha, spatialWeight),
    harmonicity: mutateParameter(currentVector.harmonicity, bounds.harmonicity, alpha, spatialWeight),
    decay: mutateParameter(currentVector.decay, bounds.decay, alpha, spatialWeight),
    gain: mutateParameter(currentVector.gain, bounds.gain, alpha, spatialWeight),
    euclideanDensity: Math.round(mutateParameter(currentVector.euclideanDensity, bounds.euclideanDensity, alpha, spatialWeight))
  };

  const scarIncrement = alpha * spatialWeight;

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
  // Clamp value within bounds
  return Math.min(Math.max(mutated, paramBound.min), paramBound.max);
}
