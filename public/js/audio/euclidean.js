/**
 * Euclidean Rhythm Generator & Scarred Rhythm Mutations
 * Computes E(k, n) patterns distributing k beats across n steps.
 */

export function generateEuclideanPattern(k, n) {
  const steps = Math.max(1, Math.round(n || 8));
  const beats = Math.max(0, Math.min(steps, Math.round(k || 0)));

  if (beats === 0) return new Array(steps).fill(false);
  if (beats === steps) return new Array(steps).fill(true);

  const pattern = new Array(steps).fill(false);
  for (let i = 0; i < beats; i++) {
    const idx = Math.floor((i * steps) / beats);
    pattern[idx] = true;
  }

  return pattern;
}

/**
 * Evaluates whether a given step should trigger a strike for a node,
 * accounting for Euclidean rhythm patterns and scarred (broken) rhythm perturbations.
 * 
 * @param {Array<boolean>} pattern - Base Euclidean boolean pattern
 * @param {number} stepIndex - Current clock step index
 * @param {number} scarIndex - Cumulative scar index of the node
 * @returns {boolean} Whether beat strikes on this step
 */
export function isBeatActiveForNode(pattern, stepIndex, scarIndex = 0.0) {
  if (!pattern || pattern.length === 0) return false;

  const currentPatternStep = stepIndex % pattern.length;
  const isNormalBeat = pattern[currentPatternStep];

  // If scar index is 0, strictly follow pristine regular rhythm
  if (!scarIndex || scarIndex <= 0) {
    return isNormalBeat;
  }

  // Scarred rhythm: higher scarIndex increases probability of broken rhythm
  // (occasional skipped beat or irregular ghost strike)
  const scarPerturbationProb = Math.min(scarIndex * 0.12, 0.35);
  if (Math.random() < scarPerturbationProb) {
    // Invert the beat for this step (broken/syncopated rhythm)
    return !isNormalBeat;
  }

  return isNormalBeat;
}
