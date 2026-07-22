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

export function calculateInverseSquareGain(distanceMeters, maxDistance = 1500.0) {
  const ref = CLIENT_CONFIG.ATTENUATION_REFERENCE_DISTANCE_M || 50.0;
  if (distanceMeters >= maxDistance) return 0.0;
  const normalized = Math.min(1.0, ref / (distanceMeters + 1.0));
  const falloff = Math.max(0.0, 1.0 - (distanceMeters / maxDistance));
  return normalized * falloff;
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

export function getEffectiveSpatialAudio(listenerCoords, nodeCoords, activeCityCenter = null, maxDistance = 1500.0) {
  const effectiveCoords = listenerCoords || activeCityCenter;

  if (!effectiveCoords || !Number.isFinite(effectiveCoords.lat) || !Number.isFinite(effectiveCoords.lng)) {
    return { distanceMeters: Infinity, delaySeconds: 0, gain: 0, hasGpsFix: false };
  }

  const distanceMeters = calculateHaversineMeters(effectiveCoords, nodeCoords);
  const rawDelay = calculateWaveDelaySeconds(distanceMeters);
  const delaySeconds = Math.min(rawDelay, 2.0);
  const gain = Math.max(0.02, calculateInverseSquareGain(distanceMeters, maxDistance));
  const hasGpsFix = !!(listenerCoords && Number.isFinite(listenerCoords.lat) && Number.isFinite(listenerCoords.lng));

  return { distanceMeters, delaySeconds, gain, hasGpsFix };
}

/**
 * Returns the maxN closest nodes relative to listener coordinates.
 * Prevents Web Audio engine polyphony overload when hundreds of nodes exist.
 */
export function getNearestNodes(listenerCoords, nodesList = [], maxN = 100) {
  if (!nodesList || nodesList.length === 0) return [];
  if (!listenerCoords) return nodesList.slice(0, maxN);

  const mapped = nodesList.map((node) => {
    const dist = calculateHaversineMeters(listenerCoords, node.coordinates);
    return { node, dist };
  });

  mapped.sort((a, b) => a.dist - b.dist);
  return mapped.slice(0, maxN).map((item) => item.node);
}

/**
 * WGS-84 to GCJ-02 (Mars Coordinates) conversion algorithm.
 * Fixes 300-500 meter offset when rendering standard GPS markers on Chinese domestic tile maps (AutoNavi / Gaode).
 */
export function wgs84ToGcj02(lat, lng) {
  if (outOfChina(lat, lng)) {
    return { lat, lng };
  }

  const a = 6378245.0;
  const ee = 0.00669342162296594323;

  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI);
  dLng = (dLng * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI);

  return {
    lat: lat + dLat,
    lng: lng + dLng
  };
}

function outOfChina(lat, lng) {
  if (lng < 72.004 || lng > 137.8347) return true;
  if (lat < 0.8293 || lat > 55.8271) return true;
  return false;
}

function transformLat(x, y) {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin((y / 3.0) * Math.PI)) * 2.0) / 3.0;
  ret += ((160.0 * Math.sin((y / 12.0) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30.0)) * 2.0) / 3.0;
  return ret;
}

function transformLng(x, y) {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0;
  ret += ((20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin((x / 3.0) * Math.PI)) * 2.0) / 3.0;
  ret += ((150.0 * Math.sin((x / 12.0) * Math.PI) + 300.0 * Math.sin((x / 30.0) * Math.PI)) * 2.0) / 3.0;
  return ret;
}

