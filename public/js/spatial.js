import { CLIENT_CONFIG } from './config.js';

export function calculateHaversineMeters(coordsA, coordsB) {
  if (!coordsA || !coordsB) return Infinity;

  const phi1 = (coordsA.lat * Math.PI) / 180;
  const phi2 = (coordsB.lat * Math.PI) / 180;
  const deltaPhi = ((coordsB.lat - coordsA.lat) * Math.PI) / 180;
  const deltaLambda = ((coordsB.lng - coordsA.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return CLIENT_CONFIG.EARTH_RADIUS_M * c;
}

export function calculateWaveDelaySeconds(distanceMeters) {
  return distanceMeters / CLIENT_CONFIG.SPEED_OF_SOUND_MPS;
}

export function calculateInverseSquareGain(distanceMeters) {
  const ref = CLIENT_CONFIG.ATTENUATION_REFERENCE_DISTANCE_M;
  return Math.min(1.0, ref / (distanceMeters + 1.0));
}

export function calculateDensityImpedanceFactor(targetNode, allReflectors = []) {
  const radius = CLIENT_CONFIG.DENSITY_RADIUS_M;
  let impedance = 0.0;

  allReflectors.forEach((other) => {
    if (other.nodeId === targetNode.nodeId) return;

    const dist = calculateHaversineMeters(targetNode.coordinates, other.coordinates);
    if (dist <= radius) {
      impedance += 1.0 / (dist + 1.0);
    }
  });

  if (impedance === 0) return 1.0;
  return 1.0 / (1.0 + impedance);
}

export function getEffectiveSpatialAudio(listenerCoords, nodeCoords) {
  const defaultCenter = CLIENT_CONFIG.OURO_PRETO_CENTER;

  // No GPS fix yet — fall back to city-center distance for preview/desktop mode
  if (!listenerCoords || !Number.isFinite(listenerCoords.lat) || !Number.isFinite(listenerCoords.lng)) {
    const mapCenterDist = calculateHaversineMeters(defaultCenter, nodeCoords);
    const distanceMeters = Number.isFinite(mapCenterDist) ? Math.min(mapCenterDist, 600.0) : 150.0;
    const delaySeconds = Math.min(calculateWaveDelaySeconds(distanceMeters), 2.0);
    const gain = Math.max(0.15, calculateInverseSquareGain(distanceMeters));
    return { distanceMeters, delaySeconds, gain, hasGpsFix: false };
  }

  // Real GPS available — use actual distance, no fake substitution
  const distanceMeters = calculateHaversineMeters(listenerCoords, nodeCoords);

  // Speed of sound propagation delay (distance / 343 m/s). Further towers take longer to arrive
  const rawDelay = calculateWaveDelaySeconds(distanceMeters);
  const delaySeconds = Math.min(rawDelay, 2.0);

  // Inverse-square gain attenuation — allow near-silence at range (no enforced floor)
  const gain = Math.max(0.02, calculateInverseSquareGain(distanceMeters));

  return { distanceMeters, delaySeconds, gain, hasGpsFix: true };
}

