const EARTH_RADIUS_M = 6371e3;

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

  return EARTH_RADIUS_M * c;
}

export function calculateWaveDelaySeconds(distanceMeters) {
  const SPEED_OF_SOUND_MPS = 343.0;
  return distanceMeters / SPEED_OF_SOUND_MPS;
}

export function calculateInverseSquareGain(distanceMeters) {
  return Math.min(1.0, 100.0 / (distanceMeters + 1.0));
}
