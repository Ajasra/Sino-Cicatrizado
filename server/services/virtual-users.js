import { CONFIG } from '../config.js';
import { calculateHaversineMeters } from './spatial.js';

// Center of Ouro Preto historical district
const CENTER_LAT = -20.3855;
const CENTER_LNG = -43.5035;

// Approximately 111,000 meters per degree of latitude
const METERS_PER_DEGREE_LAT = 111000;
const METERS_PER_DEGREE_LNG = 111000 * Math.cos((CENTER_LAT * Math.PI) / 180);

export function initVirtualUsers(somaticNodesMap, broadcastMessage) {
  if (!CONFIG.DEBUG) return;

  const count = CONFIG.VIRTUAL_USERS_COUNT || 5;
  console.log(`[VIRTUAL USERS] Initializing ${count} virtual users in debug mode...`);

  const virtualUsers = [];

  // Spawn virtual users in a radius around Ouro Preto
  for (let i = 1; i <= count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distanceMeters = 20 + Math.random() * 120; // 20m to 140m from center

    const lat = CENTER_LAT + (Math.sin(angle) * distanceMeters) / METERS_PER_DEGREE_LAT;
    const lng = CENTER_LNG + (Math.cos(angle) * distanceMeters) / METERS_PER_DEGREE_LNG;

    const somaticId = `vuser_${i}`;
    const userState = {
      somaticId,
      isVirtual: true,
      coordinates: { lat, lng, alt: 0.0 },
      batteryLevel: 0.85 + Math.random() * 0.15,
      lastUpdated: Date.now(),
      heading: Math.random() * Math.PI * 2, // angle in radians
      speedMps: 1.0 + Math.random() * 0.6, // walking speed 1.0 - 1.6 m/s
      lastChirpTime: 0,
      nextChirpIntervalMs: 8000 + Math.random() * 15000,
      ws: { readyState: -1 } // Dummy socket object so WS broadcast skips direct socket send
    };

    virtualUsers.push(userState);
    somaticNodesMap.set(somaticId, userState);
  }

  // Simulation movement & interaction loop (every 500 ms)
  const UPDATE_INTERVAL_MS = 500;
  setInterval(() => {
    const now = Date.now();

    for (let i = 0; i < virtualUsers.length; i++) {
      const user = virtualUsers[i];

      // 1. Check proximity to other virtual users to steer towards/near each other
      let nearestDist = Infinity;
      let nearestUser = null;

      for (let j = 0; j < virtualUsers.length; j++) {
        if (i === j) continue;
        const other = virtualUsers[j];
        const dist = calculateHaversineMeters(user.coordinates, other.coordinates);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestUser = other;
        }
      }

      // 2. Adjust heading: slight random wander + subtle attraction to pass close to another user
      const randomJitter = (Math.random() - 0.5) * 0.4;
      user.heading += randomJitter;

      if (nearestUser && nearestDist < 60 && Math.random() < 0.3) {
        // Steer slightly towards nearest user to cross paths
        const targetAngle = Math.atan2(
          (nearestUser.coordinates.lat - user.coordinates.lat) * METERS_PER_DEGREE_LAT,
          (nearestUser.coordinates.lng - user.coordinates.lng) * METERS_PER_DEGREE_LNG
        );
        user.heading = user.heading * 0.7 + targetAngle * 0.3;
      }

      // 3. Boundary check: steer back if too far from Ouro Preto center (> 300m)
      const distFromCenter = calculateHaversineMeters(user.coordinates, { lat: CENTER_LAT, lng: CENTER_LNG });
      if (distFromCenter > 300) {
        const centerAngle = Math.atan2(
          (CENTER_LAT - user.coordinates.lat) * METERS_PER_DEGREE_LAT,
          (CENTER_LNG - user.coordinates.lng) * METERS_PER_DEGREE_LNG
        );
        user.heading = centerAngle;
      }

      // 4. Update position based on speed and heading
      const stepMeters = user.speedMps * (UPDATE_INTERVAL_MS / 1000);
      const deltaLat = (Math.sin(user.heading) * stepMeters) / METERS_PER_DEGREE_LAT;
      const deltaLng = (Math.cos(user.heading) * stepMeters) / METERS_PER_DEGREE_LNG;

      user.coordinates.lat += deltaLat;
      user.coordinates.lng += deltaLng;
      user.lastUpdated = now;

      // 5. Sometimes emit sound / signal (SOMATIC_CHIRP)
      // Trigger either periodically OR when passing close (< 12m) to another user
      const timeSinceChirp = now - user.lastChirpTime;
      const passCloseTrigger = nearestUser && nearestDist < 12 && timeSinceChirp > 6000;
      const periodicTrigger = timeSinceChirp > user.nextChirpIntervalMs;

      if (passCloseTrigger || periodicTrigger) {
        user.lastChirpTime = now;
        user.nextChirpIntervalMs = 10000 + Math.random() * 20000;

        const baseFreq = 220 + (i * 110) + (Math.random() * 80);
        broadcastMessage({
          type: 'SOMATIC_CHIRP_BROADCAST',
          payload: {
            somaticId: user.somaticId,
            coordinates: { ...user.coordinates },
            chirpFrequency: Number(baseFreq.toFixed(1)),
            isVirtual: true
          },
          timestamp: now
        });
      }
    }
  }, UPDATE_INTERVAL_MS);
}
