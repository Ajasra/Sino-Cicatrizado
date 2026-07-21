import { WebAudioEngine } from './audio/web-audio-engine.js';
import { NodeSequencer } from './audio/node-sequencer.js';
import { BatterySensor } from './sensors/battery.js';
import { GeolocationSensor } from './sensors/geolocation.js';
import { WakeLockAdapter } from './sensors/wakelock.js';
import { ScarredWebSocketClient } from './net/websocket-client.js';
import { LeafletMapView } from './ui/map-view.js';
import { SpatialWaveRadar } from './ui/visualizer.js';
import { calculateHaversineMeters, calculateWaveDelaySeconds, calculateInverseSquareGain } from './spatial.js';
import { CLIENT_CONFIG } from './config.js';

class SinoCicatrizadoApp {
  constructor() {
    this.audioEngine = new WebAudioEngine();
    this.mapView = new LeafletMapView('map');
    this.radar = new SpatialWaveRadar('radar-canvas');
    this.nodeSequencer = new NodeSequencer(this.audioEngine, this.mapView, this.radar);
    this.wsClient = null;
    this.gpsSensor = null;

    this.currentSomaticCoords = null;
    this.batteryLevel = 1.0;
    this.nodesList = [];
    this.twinMode = 'LIVING';
    this.isAudioUnlocked = false;
    this.isDebugEnabled = false;
    this.mySomaticId = null;
    this.showUsers = true;
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

  enableDebugFeatures() {
    if (this.isDebugEnabled) return;
    this.isDebugEnabled = true;
    console.log('[DEBUG] Debug mode active. Map right-click position simulation enabled.');

    this.mapView.enableDebugContextMenu((coords) => {
      console.log('[DEBUG] Teleporting simulated location to:', coords);
      if (this.gpsSensor) {
        this.gpsSensor.setCustomMockLocation(coords);
      } else {
        this.handlePositionUpdate(coords);
      }

      const pill = document.getElementById('pill-gps');
      if (pill) {
        pill.textContent = 'GPS 🟢';
        pill.title = `Simulated Coords: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
      }
    });
  }

  async unlockAudio() {
    if (this.isAudioUnlocked) return;

    await this.audioEngine.init();
    await this.audioEngine.resume();
    await WakeLockAdapter.request();

    this.isAudioUnlocked = true;
    document.getElementById('unlock-membrane').style.display = 'none';
    console.log('[SYSTEM] AudioContext unlocked successfully.');

    // Start autonomous spatial rhythm sequencer
    this.nodeSequencer.start();
  }

  setupSensors() {
    // Battery level monitoring
    BatterySensor.watchLevel((level) => {
      this.batteryLevel = level;
      this.audioEngine.updateBatteryLevel(level);
      const pill = document.getElementById('pill-battery');
      if (pill) pill.textContent = `⚡ ${Math.round(level * 100)}%`;
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
    this.nodeSequencer.setSomaticCoords(coords);

    const pillGps = document.getElementById('pill-gps');
    if (pillGps) {
      pillGps.textContent = coords ? 'GPS 🟢' : 'GPS --';
      if (coords) {
        const latStr = coords.lat >= 0 ? `${coords.lat.toFixed(4)}°N` : `${Math.abs(coords.lat).toFixed(4)}°S`;
        const lngStr = coords.lng >= 0 ? `${coords.lng.toFixed(4)}°E` : `${Math.abs(coords.lng).toFixed(4)}°W`;
        pillGps.title = `Position: ${latStr}, ${lngStr}`;
      }
    }

    if (this.wsClient) {
      this.wsClient.sendPositionUpdate(coords, this.batteryLevel);
    }
  }

  async fetchNodes() {
    try {
      const res = await fetch('/api/nodes');
      const data = await res.json();
      this.nodesList = data.nodes || [];
      if (data.showUsers !== undefined) {
        this.showUsers = data.showUsers;
      }

      if (data.debugMode) {
        this.enableDebugFeatures();
      }

      this.mapView.updateNodes(this.nodesList);
      this.nodeSequencer.setNodes(this.nodesList);

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
        if (msg.payload?.somaticId) {
          this.mySomaticId = msg.payload.somaticId;
        }
        if (msg.payload?.showUsers !== undefined) {
          this.showUsers = msg.payload.showUsers;
        }
        if (msg.payload?.debugMode) {
          this.enableDebugFeatures();
        }
        break;

      case 'SOMATIC_FRAME_UPDATE': {
        if (this.showUsers && msg.payload?.somaticNodes) {
          this.mapView.updateOtherSomaticNodes(msg.payload.somaticNodes, this.mySomaticId);
        }
        break;
      }

      case 'SOMATIC_CHIRP_BROADCAST': {
        const { somaticId, coordinates, frequency, chirpFrequency, isVirtual } = msg.payload;
        if (somaticId && somaticId !== this.mySomaticId) {
          this.mapView.pulseOtherUserMarker(somaticId);
        }

        // Only trigger audio if the chirping user is within earshot of the real listener
        if (this.currentSomaticCoords && coordinates) {
          const sourceDistance = calculateHaversineMeters(this.currentSomaticCoords, coordinates);
          if (sourceDistance > CLIENT_CONFIG.SOUND_TRIGGER_RADIUS_M) break; // too far — stay silent
        }

        this.triggerSpatialEcholocationResponse(coordinates, chirpFrequency || frequency || 440.0);
        break;
      }

      case 'NODE_MUTATED': {
        const { nodeId, updatedState } = msg.payload;
        const target = this.nodesList.find((n) => n.nodeId === nodeId);
        if (target) {
          target.stateVector = updatedState;
          target.scarIndex = (target.scarIndex || 0) + (msg.payload.scarIncrement || 0.01);
          this.mapView.updateNodes(this.nodesList);
          this.nodeSequencer.setNodes(this.nodesList);
        }
        break;
      }

      case 'REFLECTOR_CREATED':
        this.nodesList.push(msg.payload);
        this.mapView.updateNodes(this.nodesList);
        this.nodeSequencer.setNodes(this.nodesList);
        break;

      default:
        break;
    }
  }

  triggerSpatialEcholocationResponse(sourceCoords, chirpFreq = 440.0) {
    if (!this.isAudioUnlocked) return;

    const originCoords = sourceCoords || this.currentSomaticCoords;

    // 1. Trigger primary visual canvas wave pulse & somatic marker pulse
    const screenPoint = this.mapView.getContainerPoint(originCoords);
    const waveX = screenPoint ? screenPoint.x : window.innerWidth / 2;
    const waveY = screenPoint ? screenPoint.y : window.innerHeight / 2;

    this.radar.emitWave(waveX, waveY);
    this.mapView.pulseSomaticNode();

    // 2. Synthesize primary chirp sound at listener location
    let distanceMeters = 0;
    if (this.currentSomaticCoords && sourceCoords) {
      distanceMeters = calculateHaversineMeters(this.currentSomaticCoords, sourceCoords);
    }

    const rawDelay = calculateWaveDelaySeconds(distanceMeters);
    const primaryDelay = Number.isFinite(rawDelay) ? Math.min(rawDelay, 0.3) : 0;
    const rawGain = calculateInverseSquareGain(distanceMeters);
    // No minimum floor — sound genuinely fades at distance
    const primaryGain = Number.isFinite(rawGain) ? rawGain : 1.0;

    this.audioEngine.triggerBell(
      {
        baseFrequency: chirpFreq,
        decay: 2.0,
        gain: primaryGain,
        carrierType: 'sine'
      },
      primaryDelay
    );

    // 3. Echolocation: Calculate wave propagation outward to map nodes & trigger reflective echoes
    if (!this.nodesList || this.nodesList.length === 0 || !originCoords) return;

    this.nodesList.forEach((node) => {
      if (!node.coordinates) return;

      const distToNode = calculateHaversineMeters(originCoords, node.coordinates);
      // Echolocation range limit: nodes within 600m
      if (!Number.isFinite(distToNode) || distToNode > 600.0) return;

      // Evaluate node's LLM reflection probability (default 0.7)
      const echoProb = node.stateVector?.echoProbability !== undefined ? node.stateVector.echoProbability : 0.7;
      if (Math.random() > echoProb) return; // Node did not reflect this strike

      // Calculate one-way wave arrival delay to node (d / 343 m/s)
      const arrivalDelay = calculateWaveDelaySeconds(distToNode);

      // Schedule visual marker pulse when the sound wave strikes the node
      const pulseDelayMs = Math.min(arrivalDelay, 2.0) * 1000;
      setTimeout(() => {
        if (this.mapView && typeof this.mapView.pulseNodeMarker === 'function') {
          this.mapView.pulseNodeMarker(node.nodeId);
        }
      }, pulseDelayMs);

      // Calculate round-trip echo return delay back to the listener
      let distListenerToNode = distToNode;
      if (this.currentSomaticCoords) {
        distListenerToNode = calculateHaversineMeters(this.currentSomaticCoords, node.coordinates);
      }

      const returnDelaySeconds = Math.min(arrivalDelay + calculateWaveDelaySeconds(distListenerToNode), 2.5);
      const rawNodeGain = calculateInverseSquareGain(distListenerToNode);
      // No minimum floor — let real inverse-square attenuation apply
      const nodeGain = (node.stateVector?.gain || 0.8) * (Number.isFinite(rawNodeGain) ? rawNodeGain : 0.0);

      const nodeParams = {
        baseFrequency: node.stateVector?.baseFrequency || 220.0,
        harmonicity: node.stateVector?.harmonicity || 1.414,
        decay: node.stateVector?.decay || 2.0,
        gain: nodeGain,
        carrierType: node.stateVector?.carrierType || 'sine'
      };

      // Trigger node echo bell response
      this.audioEngine.triggerBell(nodeParams, returnDelaySeconds);
    });
  }

  setupUIListeners() {
    // Unlock Audio Membrane button
    document.getElementById('unlock-btn').addEventListener('click', () => {
      this.unlockAudio();
    });

    // Somatic Chirp buttons (floating icon & settings modal button)
    document.querySelectorAll('#btn-chirp, .btn-chirp-trigger').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.wsClient) {
          this.wsClient.sendChirp(440.0, this.currentSomaticCoords);
        }
      });
    });

    // Rhythm Loop toggle button
    const rhythmBtn = document.getElementById('btn-rhythm-toggle');
    if (rhythmBtn) {
      rhythmBtn.addEventListener('click', () => {
        const isRunning = !this.nodeSequencer.isRunning;
        if (isRunning) {
          this.nodeSequencer.start();
          rhythmBtn.textContent = 'RHYTHM LOOP: ON';
          rhythmBtn.className = 'btn btn-primary';
          const pill = document.getElementById('pill-rhythm');
          if (pill) pill.textContent = 'RHYTHM: ACTIVE';
        } else {
          this.nodeSequencer.stop();
          rhythmBtn.textContent = 'RHYTHM LOOP: OFF';
          rhythmBtn.className = 'btn';
          const pill = document.getElementById('pill-rhythm');
          if (pill) pill.textContent = 'RHYTHM: PAUSED';
        }
      });
    }

    // Mock GPS Toggle button (if element exists)
    const mockGpsBtn = document.getElementById('btn-mock-gps');
    if (mockGpsBtn) {
      mockGpsBtn.addEventListener('click', () => {
        if (this.gpsSensor) {
          const nextState = !this.gpsSensor.mockMode;
          this.gpsSensor.setMockMode(nextState);

          const pill = document.getElementById('pill-gps');
          if (pill) pill.textContent = `GPS: ${nextState ? 'MOCK/DESKTOP' : 'REAL/NATIVE'}`;
        }
      });
    }

    // Settings & Acoustic Probes Modal handling
    const fabSettingsBtn = document.getElementById('fab-settings');
    const settingsModal = document.getElementById('modal-settings');
    const closeSettingsBtn = document.getElementById('modal-settings-close-btn');

    const openSettingsModal = () => {
      if (settingsModal) settingsModal.style.display = 'flex';
    };
    const closeSettingsModal = () => {
      if (settingsModal) settingsModal.style.display = 'none';
    };

    if (fabSettingsBtn) fabSettingsBtn.addEventListener('click', openSettingsModal);
    if (closeSettingsBtn) closeSettingsBtn.addEventListener('click', closeSettingsModal);

    if (settingsModal) {
      settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeSettingsModal();
      });
    }

    // Reflection Deposit FAB & Modal handling
    const fabBtn = document.getElementById('fab-reflector');
    const modal = document.getElementById('modal-reflector');
    const closeBtn = document.getElementById('modal-close-btn');
    const cancelBtn = document.getElementById('btn-cancel-reflector');
    const intentInput = document.getElementById('input-reflector-intent');

    const openModal = () => {
      if (modal) {
        modal.style.display = 'flex';
        if (intentInput) intentInput.focus();
      }
    };

    const closeModal = () => {
      if (modal) modal.style.display = 'none';
    };

    if (fabBtn) fabBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (settingsModal && settingsModal.style.display !== 'none') closeSettingsModal();
        if (modal && modal.style.display !== 'none') closeModal();
      }
    });

    // Drop Static Reflector button inside Modal
    const dropBtn = document.getElementById('btn-drop-reflector');
    if (dropBtn) {
      dropBtn.addEventListener('click', async () => {
        if (!this.currentSomaticCoords) {
          alert('Position unknown. Please enable GPS or Mock simulation mode.');
          return;
        }

        if (dropBtn.disabled) return;

        const intentText = intentInput ? intentInput.value.trim() || 'Somatic Memory Deposit' : 'Somatic Memory Deposit';

        try {
          // Disable button and indicate LLM synthesis loading state
          dropBtn.disabled = true;
          dropBtn.textContent = 'GENERATING REFLECTION...';
          dropBtn.style.opacity = '0.6';
          dropBtn.style.cursor = 'not-allowed';

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
            if (intentInput) intentInput.value = '';
            closeModal();
            console.log('[API] Reflector dropped successfully:', data.node);
          } else {
            alert(data.error || 'Failed to create reflection deposit.');
          }
        } catch (err) {
          console.error('[API] Error dropping reflector:', err);
          alert('Network error while depositing reflection.');
        } finally {
          // Restore button state
          dropBtn.disabled = false;
          dropBtn.textContent = 'DROP REFLECTOR';
          dropBtn.style.opacity = '1';
          dropBtn.style.cursor = 'pointer';
        }
      });
    }
  }
}

// App Entry Point
window.addEventListener('DOMContentLoaded', () => {
  const app = new SinoCicatrizadoApp();
  app.init();
});
