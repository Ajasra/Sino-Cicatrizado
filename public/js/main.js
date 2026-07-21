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

    this.currentCity = CLIENT_CONFIG.DEFAULT_CITY;
    this.availableCities = CLIENT_CONFIG.CITIES || {};

    this.currentSomaticCoords = null;
    this.batteryLevel = 1.0;
    this.nodesList = [];
    this.twinMode = 'LIVING';
    this.isAudioUnlocked = false;
    this.isDebugEnabled = false;
    this.mySomaticId = null;
    this.showUsers = true;
  }

  detectCityFromURL() {
    // Check path (e.g. /chicago or /ouro_preto)
    const pathSlug = window.location.pathname.replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase();
    if (pathSlug && this.availableCities[pathSlug]) {
      return pathSlug;
    }

    // Check query param (e.g. ?city=chicago)
    const urlParams = new URLSearchParams(window.location.search);
    const queryCity = urlParams.get('city')?.toLowerCase();
    if (queryCity && this.availableCities[queryCity]) {
      return queryCity;
    }

    return null;
  }

  async init() {
    // 1. Fetch available cities configuration from backend
    await this.fetchCities();

    // 2. Detect initial city from URL (e.g. /chicago) or use default
    const urlCity = this.detectCityFromURL();
    if (urlCity) {
      this.currentCity = urlCity;
    } else {
      this.currentCity = CLIENT_CONFIG.DEFAULT_CITY;
    }

    const cityObj = this.availableCities[this.currentCity] || CLIENT_CONFIG.CITIES.ouro_preto;

    // Initialize default fallback somatic coordinates for active city
    this.currentSomaticCoords = {
      lat: Number(cityObj.center.lat),
      lng: Number(cityObj.center.lng),
      alt: Number(cityObj.center.alt || 100.0)
    };

    // Set Audio Engine City Acoustic Profile
    if (this.audioEngine && typeof this.audioEngine.setCityAcousticProfile === 'function') {
      this.audioEngine.setCityAcousticProfile(this.currentCity);
    }

    // 3. Initialize Map View centered on active city
    this.mapView.init(cityObj.center);
    this.updateCityPill();

    // 4. Fetch Initial Nodes for active city
    await this.fetchNodes();

    // 5. Initialize WebSocket Client
    this.wsClient = new ScarredWebSocketClient((msg) => this.handleServerMessage(msg));
    this.wsClient.connect();

    // 6. Initialize Sensors & Sequencer coords
    this.nodeSequencer.setSomaticCoords(this.currentSomaticCoords);
    this.setupSensors();
    if (this.gpsSensor) {
      this.gpsSensor.setCityCenter(cityObj.center);
    }

    // Enable touch/click tap-to-move location on map for mobile devices
    this.mapView.enableTapToMove((coords) => {
      if (this.gpsSensor) {
        this.gpsSensor.setCustomMockLocation(coords);
      } else {
        this.handlePositionUpdate(coords);
      }
    });

    // 7. Setup UI Event Listeners & City Selectors
    this.setupUIListeners();
    this.renderMembraneCitySelector();
    this.renderCitySelector();
  }

  async fetchCities() {
    try {
      const res = await fetch('/api/cities');
      const data = await res.json();
      if (data.cities && Array.isArray(data.cities)) {
        data.cities.forEach((c) => {
          this.availableCities[c.key] = c;
        });
      }
    } catch (err) {
      console.warn('[API] Error fetching cities, using default config:', err);
    }
  }

  updateCityPill() {
    const pillCity = document.getElementById('pill-city');
    const cityObj = this.availableCities[this.currentCity];
    if (pillCity && cityObj) {
      pillCity.textContent = `${cityObj.name.toUpperCase()}`;
      pillCity.title = `Active Soundscape: ${cityObj.name} (${cityObj.country}) — Click to change city`;
    }
  }

  async selectCity(cityKey, updateUrl = true) {
    if (!this.availableCities[cityKey]) return;

    this.currentCity = cityKey;
    const cityObj = this.availableCities[cityKey];

    // Update fallback somatic position for active city
    this.currentSomaticCoords = {
      lat: Number(cityObj.center.lat),
      lng: Number(cityObj.center.lng),
      alt: Number(cityObj.center.alt || 100.0)
    };
    if (this.nodeSequencer) {
      this.nodeSequencer.setSomaticCoords(this.currentSomaticCoords);
    }

    if (updateUrl && window.history && window.history.pushState) {
      window.history.pushState({ city: cityKey }, '', `/${cityKey}`);
    }

    if (this.audioEngine && typeof this.audioEngine.setCityAcousticProfile === 'function') {
      this.audioEngine.setCityAcousticProfile(cityKey);
    }

    if (this.wsClient) {
      this.wsClient.subscribeCity(cityKey);
    }

    this.updateCityPill();
    this.mapView.setCityView(cityObj.center);
    this.mapView.clearAllNodeMarkers();

    if (this.gpsSensor) {
      this.gpsSensor.setCityCenter(cityObj.center);
    }

    await this.fetchNodes();
    this.renderMembraneCitySelector();
    this.renderCitySelector();
    this.closeCityModal();
  }

  renderMembraneCitySelector() {
    const container = document.getElementById('membrane-city-cards');
    if (!container) return;

    container.innerHTML = '';
    Object.values(this.availableCities).forEach((c) => {
      const card = document.createElement('div');
      card.className = `membrane-city-card ${c.key === this.currentCity ? 'active' : ''}`;
      card.innerHTML = `
        <div class="membrane-city-name">${c.name}</div>
        <div class="membrane-city-country">${c.country || ''}</div>
      `;
      card.addEventListener('click', () => {
        this.selectCity(c.key);
      });
      container.appendChild(card);
    });
  }

  renderCitySelector() {
    const container = document.getElementById('city-list-container');
    if (!container) return;

    container.innerHTML = '';
    Object.values(this.availableCities).forEach((c) => {
      const card = document.createElement('div');
      card.className = `city-card ${c.key === this.currentCity ? 'active' : ''}`;
      card.innerHTML = `
        <div class="city-card-header">
          <span class="city-card-title">${c.name}</span>
          <span class="city-card-country">${c.country || ''}</span>
        </div>
        <div class="city-card-desc">${c.description || ''}</div>
      `;
      card.addEventListener('click', () => {
        this.selectCity(c.key);
      });
      container.appendChild(card);
    });
  }

  openCityModal() {
    this.renderCitySelector();
    const modal = document.getElementById('modal-city-select');
    if (modal) modal.style.display = 'flex';
  }

  closeCityModal() {
    const modal = document.getElementById('modal-city-select');
    if (modal) modal.style.display = 'none';
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

    const cityObj = this.availableCities[this.currentCity] || CLIENT_CONFIG.CITIES.ouro_preto;
    if (!this.currentSomaticCoords && cityObj) {
      this.currentSomaticCoords = {
        lat: Number(cityObj.center.lat),
        lng: Number(cityObj.center.lng),
        alt: Number(cityObj.center.alt || 100.0)
      };
    }
    if (this.nodeSequencer) {
      this.nodeSequencer.setSomaticCoords(this.currentSomaticCoords);
    }

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
      const res = await fetch(`/api/nodes?city=${encodeURIComponent(this.currentCity)}`);
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
      case 'WS_STATUS_CHANGE': {
        const isConnected = msg.payload?.connected;
        if (this.audioEngine) {
          // ponytail: toggle lowpass audio degradation in Sovereign Isolation mode
          this.audioEngine.setSovereignIsolation(!isConnected);
        }
        const brandDot = document.getElementById('brand-dot');
        if (brandDot) {
          brandDot.classList.toggle('offline', !isConnected);
          brandDot.title = isConnected ? 'Connection: Online' : 'Connection: Sovereign Isolation (Offline)';
        }
        break;
      }


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

    // City Selector listeners
    const pillCity = document.getElementById('pill-city');
    if (pillCity) {
      pillCity.addEventListener('click', () => this.openCityModal());
    }

    const switchCityBtn = document.getElementById('btn-switch-city');
    if (switchCityBtn) {
      switchCityBtn.addEventListener('click', () => {
        closeSettingsModal();
        this.openCityModal();
      });
    }

    const closeCityBtn = document.getElementById('modal-city-close-btn');
    if (closeCityBtn) {
      closeCityBtn.addEventListener('click', () => this.closeCityModal());
    }

    const cityModal = document.getElementById('modal-city-select');
    if (cityModal) {
      cityModal.addEventListener('click', (e) => {
        if (e.target === cityModal) this.closeCityModal();
      });
    }

    // Handle browser navigation (back/forward buttons)
    window.addEventListener('popstate', () => {
      const urlCity = this.detectCityFromURL();
      if (urlCity && urlCity !== this.currentCity) {
        this.selectCity(urlCity, false);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (cityModal && cityModal.style.display !== 'none') this.closeCityModal();
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
              intentText,
              city: this.currentCity
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
