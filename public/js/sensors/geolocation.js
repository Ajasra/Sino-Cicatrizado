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
    const isSecure = window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (navigator.geolocation && isSecure) {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          this.mockMode = false;
          if (this.onPositionUpdate) {
            this.onPositionUpdate({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              alt: pos.coords.altitude || 0.0
            });
          }
        },
        (err) => {
          console.warn('[GPS] Real Geolocation warning/error:', err.message, '- falling back to simulation mode');
          if (this.onError) this.onError(err);
          this.setMockMode(true);
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 }
      );
    } else {
      console.warn('[GPS] Geolocation requires HTTPS or localhost on mobile. Enabling interactive simulation mode.');
      if (this.onError) {
        this.onError(new Error('HTTP IP access disables Geolocation on mobile devices. Interactive simulation mode active.'));
      }
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

    // Initial position emit immediately
    if (this.onPositionUpdate) this.onPositionUpdate(this.mockCoords);

    // Simulate minor organic somatic movement around current active location
    let angle = 0;
    this.mockInterval = setInterval(() => {
      angle += 0.05;
      const radius = 0.0003; // ~30m walking drift radius
      const simulatedCoords = {
        lat: this.mockCoords.lat + Math.sin(angle) * radius,
        lng: this.mockCoords.lng + Math.cos(angle) * radius,
        alt: (this.mockCoords.alt || 100.0) + Math.sin(angle * 2) * 5.0
      };
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
