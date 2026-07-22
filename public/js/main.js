import { WebAudioEngine } from './audio/web-audio-engine.js';
import { NodeSequencer } from './audio/node-sequencer.js';
import { GeolocationSensor } from './sensors/geolocation.js';
import { WakeLockAdapter } from './sensors/wakelock.js';
import { ScarredWebSocketClient } from './net/websocket-client.js';
import { LeafletMapView } from './ui/map-view.js';
import { SpatialWaveRadar } from './ui/visualizer.js';
import { ModalManager } from './ui/modal-manager.js';
import { calculateHaversineMeters, calculateWaveDelaySeconds, calculateInverseSquareGain } from './spatial.js';
import { CLIENT_CONFIG } from './config.js';
import { setLanguage, getCurrentLanguage } from './i18n.js';

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
    this.currentTheme = localStorage.getItem('sino_theme') || 'dark';
    this.modalManager = null;
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

    // Apply city default language
    const initialLang = cityObj.defaultLang || cityObj.languages?.[0] || 'en';
    setLanguage(initialLang);

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
    this.applyTheme(this.currentTheme);
    this.updateCityPill();
    this.updateLanguagePill();

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

    // 7. Setup UI Event Listeners & City Selectors
    this.setupUIListeners();
    this.renderMembraneCitySelector();
    this.renderCitySelector();
    this.modalManager = new ModalManager(this);
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

  updateLanguagePill() {
    const pillLang = document.getElementById('pill-lang');
    const cityObj = this.availableCities[this.currentCity] || CLIENT_CONFIG.CITIES.ouro_preto;
    const langs = cityObj.languages || ['en'];
    const activeLang = getCurrentLanguage();
    
    if (pillLang) {
      pillLang.textContent = activeLang.toUpperCase();
      pillLang.title = `Current Language: ${activeLang.toUpperCase()} (${langs.map(l => l.toUpperCase()).join('/')}) — Click to toggle language`;
    }
  }

  toggleLanguage() {
    const cityObj = this.availableCities[this.currentCity] || CLIENT_CONFIG.CITIES.ouro_preto;
    const langs = cityObj.languages || ['en'];
    const activeLang = getCurrentLanguage();
    const currentIndex = langs.indexOf(activeLang);
    const nextIndex = (currentIndex + 1) % langs.length;
    const nextLang = langs[nextIndex];

    setLanguage(nextLang);
    this.updateLanguagePill();
  }

  async selectCity(cityKey, updateUrl = true) {
    if (!this.availableCities[cityKey]) return;

    this.currentCity = cityKey;
    const cityObj = this.availableCities[cityKey];

    // Automatically switch to city's default language if active language is not supported
    const langs = cityObj.languages || ['en'];
    const activeLang = getCurrentLanguage();
    if (!langs.includes(activeLang)) {
      setLanguage(cityObj.defaultLang || langs[0] || 'en');
    }

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
    this.updateLanguagePill();
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
      const isActive = c.key === this.currentCity;
      card.className = `membrane-city-card ${isActive ? 'active' : ''}`;
      const prefix = isActive ? '>> ' : '';
      card.innerHTML = `
        <div class="membrane-city-name">${prefix}${c.name}</div>
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
      const isActive = c.key === this.currentCity;
      card.className = `city-card-item ${isActive ? 'active' : ''}`;
      const prefix = isActive ? '>> ' : '';
      card.innerHTML = `
        <div class="city-card-header">
          <span class="city-name">${prefix}${c.name}</span>
          <span class="city-country">${c.country || ''}</span>
        </div>
        <div class="city-desc">${c.description || ''}</div>
      `;
      card.addEventListener('click', () => {
        this.selectCity(c.key);
      });
      container.appendChild(card);
    });
  }

  openCityModal() {
    if (this.modalManager) {
      this.modalManager.openCityModal();
    } else {
      this.renderCitySelector();
      const modal = document.getElementById('modal-city-select');
      if (modal) modal.style.display = 'flex';
    }
  }

  closeCityModal() {
    if (this.modalManager) {
      this.modalManager.closeCityModal();
    } else {
      const modal = document.getElementById('modal-city-select');
      if (modal) modal.style.display = 'none';
    }
  }

  enableDebugFeatures() {
    if (this.isDebugEnabled) return;
    this.isDebugEnabled = true;
    console.log('[DEBUG] Debug mode active. Map click/contextmenu position simulation enabled.');

    const onSetLocation = (coords) => {
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
    };

    this.mapView.enableTapToMove(onSetLocation);
    this.mapView.enableDebugContextMenu(onSetLocation);
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
    if (this.audioEngine && typeof this.audioEngine.updateSomaticPosition === 'function') {
      this.audioEngine.updateSomaticPosition(coords);
    }

    const pillGps = document.getElementById('pill-gps');
    if (pillGps) {
      if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
        const latStr = coords.lat.toFixed(2);
        const lngStr = coords.lng.toFixed(2);
        pillGps.innerHTML = `<span class="status-sq active"></span> GPS:${latStr}/${lngStr}`;
        const fullLat = coords.lat >= 0 ? `${coords.lat.toFixed(4)}°N` : `${Math.abs(coords.lat).toFixed(4)}°S`;
        const fullLng = coords.lng >= 0 ? `${coords.lng.toFixed(4)}°E` : `${Math.abs(coords.lng).toFixed(4)}°W`;
        pillGps.title = `Position: ${fullLat}, ${fullLng}`;
      } else {
        pillGps.innerHTML = `<span class="status-sq offline"></span> GPS:--/--`;
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
      if (this.audioEngine && typeof this.audioEngine.setProximityNodes === 'function') {
        this.audioEngine.setProximityNodes(this.nodesList);
      }

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

    const waveColor = this.currentTheme === 'light' ? 'rgba(180, 83, 9, 0.65)' : 'rgba(251, 191, 36, 0.6)';
    this.radar.emitWave(waveX, waveY, waveColor);
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

    // ponytail: Center on current location button
    const recenterBtn = document.getElementById('fab-recenter');
    if (recenterBtn) {
      recenterBtn.addEventListener('click', () => {
        this.mapView.centerOnSomaticLocation();
      });
    }

    // Language toggle button pill
    const pillLang = document.getElementById('pill-lang');
    if (pillLang) {
      pillLang.style.cursor = 'pointer';
      pillLang.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleLanguage();
      });
    }

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

    // Theme toggle button
    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    if (btnThemeToggle) {
      btnThemeToggle.addEventListener('click', () => {
        const nextTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(nextTheme);
      });
    }

    // Handle browser navigation (back/forward buttons)
    window.addEventListener('popstate', () => {
      const urlCity = this.detectCityFromURL();
      if (urlCity && urlCity !== this.currentCity) {
        this.selectCity(urlCity, false);
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
            if (this.modalManager) this.modalManager.closeReflectorModal();
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
        }
      });
    }
  }

  /* ponytail: simple minimal dark/light theme switcher without icons or heavy abstractions */
  applyTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('sino_theme', theme);
    } catch (e) {
      console.warn('[Theme] Could not persist theme preference:', e);
    }

    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
      themeBtn.textContent = `THEME: ${theme.toUpperCase()}`;
    }

    if (this.mapView && typeof this.mapView.setTheme === 'function') {
      this.mapView.setTheme(theme);
    }
  }
}

// App Entry Point
window.addEventListener('DOMContentLoaded', () => {
  const app = new SinoCicatrizadoApp();
  app.init();
});
