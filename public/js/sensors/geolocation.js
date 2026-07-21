import { CLIENT_CONFIG } from '../config.js';

export class GeolocationSensor {
  constructor(onPositionUpdate, onError) {
    this.onPositionUpdate = onPositionUpdate;
    this.onError = onError;
    this.watchId = null;
    this.mockMode = false;
    this.mockCoords = {
      lat: CLIENT_CONFIG.OURO_PRETO_CENTER.lat,
      lng: CLIENT_CONFIG.OURO_PRETO_CENTER.lng,
      alt: 1150.0
    };
    this.mockInterval = null;
  }

  setCityCenter(centerCoords) {
    if (!centerCoords) return;
    this.mockCoords = {
      lat: Number(centerCoords.lat),
      lng: Number(centerCoords.lng),
      alt: Number(centerCoords.alt || 100.0)
    };
    if (this.mockMode && this.onPositionUpdate) {
      this.onPositionUpdate(this.mockCoords);
    }
  }

  setMockMode(enabled) {
    this.mockMode = enabled;
    if (enabled) {
      this.stopRealWatch();
      this.startMockSimulation();
    } else {
      this.stopMockSimulation();
      this.startRealWatch();
    }
  }

  setCustomMockLocation(coords) {
    this.mockMode = true;
    this.stopRealWatch();
    this.stopMockSimulation();

    this.mockCoords = {
      lat: Number(coords.lat),
      lng: Number(coords.lng),
      alt: Number(coords.alt || 100.0)
    };

    if (this.onPositionUpdate) {
      this.onPositionUpdate(this.mockCoords);
    }
  }

  startRealWatch() {
    if (navigator.geolocation) {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (this.onPositionUpdate) {
            this.onPositionUpdate({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              alt: pos.coords.altitude || 0.0
            });
          }
        },
        (err) => {
          console.warn('[GPS] Real Geolocation warning/error:', err.message);
          if (this.onError) this.onError(err);
        },
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
      );
    } else {
      console.warn('[GPS] Geolocation API unavailable. Enabling Mock Simulation mode.');
      this.setMockMode(true);
    }
  }

  stopRealWatch() {
    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  startMockSimulation() {
    if (this.mockInterval) clearInterval(this.mockInterval);

    // Initial position emit
    if (this.onPositionUpdate) this.onPositionUpdate(this.mockCoords);

    // Simulate minor somatic walking motion around Ouro Preto streets
    let angle = 0;
    this.mockInterval = setInterval(() => {
      angle += 0.05;
      const radius = 0.0008; // ~80 meters radius circle
      const simulatedCoords = {
        lat: CLIENT_CONFIG.OURO_PRETO_CENTER.lat + Math.sin(angle) * radius,
        lng: CLIENT_CONFIG.OURO_PRETO_CENTER.lng + Math.cos(angle) * radius,
        alt: 1150.0 + Math.sin(angle * 2) * 15.0
      };
      this.mockCoords = simulatedCoords;
      if (this.onPositionUpdate) this.onPositionUpdate(simulatedCoords);
    }, 2000);
  }

  stopMockSimulation() {
    if (this.mockInterval) {
      clearInterval(this.mockInterval);
      this.mockInterval = null;
    }
  }

  start() {
    this.startRealWatch();
  }

  stop() {
    this.stopRealWatch();
    this.stopMockSimulation();
  }
}
