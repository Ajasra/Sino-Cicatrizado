import { WebAudioEngine } from './audio/web-audio-engine.js';
import { BatterySensor } from './sensors/battery.js';
import { GeolocationSensor } from './sensors/geolocation.js';
import { WakeLockAdapter } from './sensors/wakelock.js';
import { ScarredWebSocketClient } from './net/websocket-client.js';
import { LeafletMapView } from './ui/map-view.js';
import { SpatialWaveRadar } from './ui/visualizer.js';
import { calculateHaversineMeters, calculateWaveDelaySeconds, calculateInverseSquareGain } from './spatial.js';

class SinoCicatrizadoApp {
  constructor() {
    this.audioEngine = new WebAudioEngine();
    this.mapView = new LeafletMapView('map');
    this.radar = new SpatialWaveRadar('radar-canvas');
    this.wsClient = null;
    this.gpsSensor = null;

    this.currentSomaticCoords = null;
    this.batteryLevel = 1.0;
    this.nodesList = [];
    this.twinMode = 'LIVING';
    this.isAudioUnlocked = false;
  }

  async init() {
    // 1. Initialize Map View
    this.mapView.init();

    // 2. Fetch Initial Nodes from Backend API
    await this.fetchNodes();

    // 3. Initialize WebSocket Client
    this.wsClient = new ScarredWebSocketClient((msg) => this.handleServerMessage(msg));
    this.wsClient.connect();

    // 4. Initialize Sensors
    this.setupSensors();

    // 5. Setup UI Event Listeners
    this.setupUIListeners();
  }

  async unlockAudio() {
    if (this.isAudioUnlocked) return;

    await this.audioEngine.init();
    await this.audioEngine.resume();
    await WakeLockAdapter.request();

    this.isAudioUnlocked = true;
    document.getElementById('unlock-membrane').style.display = 'none';
    console.log('[SYSTEM] AudioContext unlocked successfully.');
  }

  setupSensors() {
    // Battery level monitoring
    BatterySensor.watchLevel((level) => {
      this.batteryLevel = level;
      this.audioEngine.updateBatteryLevel(level);

      const bits = level >= 0.5 ? 16 : Math.round(4 + ((level - 0.15) / 0.35) * 12);
      const pill = document.getElementById('pill-battery');
      if (pill) pill.textContent = `BATTERY: ${Math.round(level * 100)}% (${bits}-BIT)`;
    });

    // Geolocation tracking
    this.gpsSensor = new GeolocationSensor(
      (coords) => this.handlePositionUpdate(coords),
      (err) => console.warn('[GPS] Position watch error:', err.message)
    );
    this.gpsSensor.start();
  }

  handlePositionUpdate(coords) {
    this.currentSomaticCoords = coords;
    this.mapView.updateSomaticNode(coords);

    if (this.wsClient) {
      this.wsClient.sendPositionUpdate(coords, this.batteryLevel);
    }
  }

  async fetchNodes() {
    try {
      const res = await fetch('/api/nodes');
      const data = await res.json();
      this.twinMode = data.mode;
      this.nodesList = data.nodes || [];

      this.mapView.updateNodes(this.nodesList);

      const pillMode = document.getElementById('pill-twin-mode');
      if (pillMode) pillMode.textContent = `MODE: ${this.twinMode === 'TWIN' ? 'SCARRED TWIN' : 'LIVING CITY'}`;

      const pillNodes = document.getElementById('pill-nodes');
      if (pillNodes) pillNodes.textContent = `NODES: ${this.nodesList.length}`;
    } catch (err) {
      console.error('[API] Error fetching nodes:', err);
    }
  }

  handleServerMessage(msg) {
    switch (msg.type) {
      case 'SESSION_INIT':
        console.log('[WS] Handshake established:', msg.payload);
        break;

      case 'SOMATIC_CHIRP_BROADCAST': {
        const { coordinates, frequency } = msg.payload;
        this.triggerSpatialEcholocationResponse(coordinates, frequency);
        break;
      }

      case 'NODE_MUTATED': {
        const { nodeId, updatedState } = msg.payload;
        const target = this.nodesList.find((n) => n.nodeId === nodeId);
        if (target) {
          target.stateVector = updatedState;
          target.scarIndex = (target.scarIndex || 0) + (msg.payload.scarIncrement || 0.01);
          this.mapView.updateNodes(this.nodesList);
        }
        break;
      }

      case 'REFLECTOR_CREATED':
        this.nodesList.push(msg.payload);
        this.mapView.updateNodes(this.nodesList);
        break;

      case 'TWIN_MODE_CHANGED':
        this.fetchNodes();
        break;

      default:
        break;
    }
  }

  triggerSpatialEcholocationResponse(sourceCoords, chirpFreq = 440.0) {
    if (!this.currentSomaticCoords || !this.isAudioUnlocked) return;

    // Trigger visual canvas wave pulse at map center
    this.radar.emitWave(window.innerWidth / 2, window.innerHeight / 2);

    // Calculate distance and decentered spatial propagation delay
    const distanceMeters = calculateHaversineMeters(this.currentSomaticCoords, sourceCoords);
    const delaySeconds = calculateWaveDelaySeconds(distanceMeters);
    const gainAttenuated = calculateInverseSquareGain(distanceMeters);

    // Synthesize spatial bell echo
    this.audioEngine.triggerBell(
      {
        baseFrequency: chirpFreq,
        decay: 2.0,
        gain: gainAttenuated,
        carrierType: 'sine'
      },
      delaySeconds
    );
  }

  setupUIListeners() {
    // Unlock Audio Membrane button
    document.getElementById('unlock-btn').addEventListener('click', () => {
      this.unlockAudio();
    });

    // Somatic Chirp button
    document.getElementById('btn-chirp').addEventListener('click', () => {
      if (this.wsClient) {
        this.wsClient.sendChirp(440.0);
      }
    });

    // Mock GPS Toggle button
    document.getElementById('btn-mock-gps').addEventListener('click', () => {
      if (this.gpsSensor) {
        const nextState = !this.gpsSensor.mockMode;
        this.gpsSensor.setMockMode(nextState);

        const pill = document.getElementById('pill-gps');
        if (pill) pill.textContent = `GPS: ${nextState ? 'MOCK/DESKTOP' : 'REAL/NATIVE'}`;
      }
    });

    // Drop Static Reflector button
    document.getElementById('btn-drop-reflector').addEventListener('click', async () => {
      if (!this.currentSomaticCoords) {
        alert('Position unknown. Please enable GPS or Mock simulation mode.');
        return;
      }

      const intentInput = document.getElementById('input-reflector-intent');
      const intentText = intentInput.value.trim() || 'Somatic Memory Deposit';

      try {
        const res = await fetch('/api/reflectors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coordinates: this.currentSomaticCoords,
            intentText
          })
        });

        const data = await res.json();
        if (data.success) {
          intentInput.value = '';
          console.log('[API] Reflector dropped successfully:', data.node);
        }
      } catch (err) {
        console.error('[API] Error dropping reflector:', err);
      }
    });

    // Dual-Twin Mode Toggle buttons
    document.getElementById('btn-mode-living').addEventListener('click', () => this.switchTwinMode('LIVING'));
    document.getElementById('btn-mode-twin').addEventListener('click', () => this.switchTwinMode('TWIN'));
  }

  async switchTwinMode(mode) {
    try {
      const res = await fetch('/api/twin/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });

      const data = await res.json();
      if (data.success) {
        document.getElementById('btn-mode-living').className = mode === 'LIVING' ? 'btn btn-primary' : 'btn';
        document.getElementById('btn-mode-twin').className = mode === 'TWIN' ? 'btn btn-primary' : 'btn';
        await this.fetchNodes();
      }
    } catch (err) {
      console.error('[API] Error toggling twin mode:', err);
    }
  }
}

// App Entry Point
window.addEventListener('DOMContentLoaded', () => {
  const app = new SinoCicatrizadoApp();
  app.init();
});
