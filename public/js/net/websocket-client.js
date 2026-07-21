import { CLIENT_CONFIG } from '../config.js';
import { calculateHaversineMeters } from '../spatial.js';

export class ScarredWebSocketClient {
  constructor(onMessageCallback) {
    this.onMessage = onMessageCallback;
    this.ws = null;
    this.lastSentPosition = null;
    this.lastSentTime = 0;
    this.retryDelayMs = 1000;
    this.currentCity = CLIENT_CONFIG.DEFAULT_CITY;
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('[WS] Connected to Sino Cicatrizado Central Server');
      this.retryDelayMs = 1000;
      if (this.currentCity) {
        this.subscribeCity(this.currentCity);
      }
    };

    this.ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (this.onMessage) this.onMessage(msg);
      } catch (e) {
        console.error('[WS] Corrupt frame received:', e);
      }
    };

    this.ws.onclose = () => {
      console.warn('[WS] Connection closed. Reconnecting...');
      this.scheduleReconnect();
    };

    this.ws.onerror = (err) => {
      console.error('[WS] Error:', err);
    };
  }

  subscribeCity(cityKey) {
    this.currentCity = cityKey;
    this.send('SUBSCRIBE_CITY', { city: cityKey });
  }

  scheduleReconnect() {
    setTimeout(() => {
      this.retryDelayMs = Math.min(this.retryDelayMs * 2, 30000);
      this.connect();
    }, this.retryDelayMs);
  }

  sendPositionUpdate(coords, batteryLevel) {
    const now = Date.now();
    if (now - this.lastSentTime < CLIENT_CONFIG.TRANSMIT_INTERVAL_MS) return; // Rate-limit to max 4 Hz

    if (this.lastSentPosition && coords) {
      const dist = calculateHaversineMeters(this.lastSentPosition, coords);
      if (dist < CLIENT_CONFIG.POSITION_DELTA_THRESHOLD_M) return; // Minimum 5m movement threshold
    }

    this.lastSentTime = now;
    this.lastSentPosition = { lat: coords.lat, lng: coords.lng };

    this.send('SOMATIC_POSITION_UPDATE', {
      city: this.currentCity,
      coordinates: coords,
      batteryLevel
    });
  }

  sendChirp(frequency = 440.0, coordinates = null) {
    this.send('SOMATIC_CHIRP', { chirpFrequency: frequency, coordinates });
  }

  send(type, payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload, timestamp: Date.now() }));
    }
  }
}
