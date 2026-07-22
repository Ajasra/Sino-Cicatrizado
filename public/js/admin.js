import { WebAudioEngine } from './audio/web-audio-engine.js';
import { wgs84ToGcj02 } from './spatial.js';

let audioEngine = null;
let currentCityKey = 'ouro_preto';
let currentCityData = null;
let adminPassword = '';
let map = null;
let adminTileLayer = null;
let currentAdminStyle = 'voyager'; // 'voyager' (high-visibility with labels) or 'dark'
let markersMap = new Map();
let listenerMarker = null;
let isMoveListenerMode = false;
let isSoloActive = false;

let activeTower = null; // currently selected tower object
let cityLanguages = ['en'];
let activeLang = 'en';
let nameMap = {}; // { en: "...", pt: "..." }
let descriptionMap = {}; // { en: "...", pt: "..." }
let citiesList = [];

// Available sound types per city
const CITY_SOUND_TYPES = {
  ouro_preto: [
    { key: 'bell_sacred', label: 'Sacred Baroque Bell' },
    { key: 'bell_deep', label: 'Deep Cathedral Bell' },
    { key: 'bell_bright', label: 'Bright Chapel Bell' },
    { key: 'drone', label: 'Valley Low Drone' },
    { key: 'glitch', label: 'Glitch Hysteresis' }
  ],
  chicago: [
    { key: 'chicago_bridge', label: 'DuSable Steel Bridge' },
    { key: 'chicago_wind', label: 'Lakefront Wind Resonance' },
    { key: 'chicago_rail', label: 'L-Train Metallic Rail' },
    { key: 'chicago_foghorn', label: 'Harbor Foghorn' },
    { key: 'chicago_steam', label: 'Industrial Steam' },
    { key: 'glitch', label: 'Loop Distortion' }
  ],
  shanghai: [
    { key: 'shanghai_gong', label: 'Temple Bronze Gong' },
    { key: 'shanghai_river', label: 'Huangpu River Ferry' },
    { key: 'shanghai_maglev', label: 'Maglev Magnetic Resonance' },
    { key: 'shanghai_cicadas', label: 'Garden Cicadas' },
    { key: 'shanghai_construction', label: 'Bund Construction Drums' },
    { key: 'glitch', label: 'Cyber Glitch' },
    { key: 'drone', label: 'Lujiazui Drone' }
  ],
  shanghai_noise: [
    { key: 'shanghai_harsh_feedback', label: 'Underground Harsh Feedback' },
    { key: 'shanghai_circuit_bend', label: 'Circuit Bended Oscillator' },
    { key: 'shanghai_glitch', label: 'Basement Glitch Stutter' },
    { key: 'shanghai_sub_rumble', label: 'Sub-Bass Industrial Rumble' },
    { key: 'shanghai_industrial_burst', label: 'Distorted Industrial Impact' },
    { key: 'shanghai_radio_glitch', label: 'Radio Interference & Resonance Sweep' }
  ],
  montreal: [
    { key: 'bell_deep', label: 'Steeple Echo' },
    { key: 'drone', label: 'Underground Reverberation' },
    { key: 'glitch', label: 'Glitch Echo' }
  ]
};

document.addEventListener('DOMContentLoaded', async () => {
  detectCityFromURL();
  await loadCities();
  initUI();
  checkSessionAuth();
});

function detectCityFromURL() {
  const path = window.location.pathname;
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'edit' && parts[1]) {
    currentCityKey = parts[1];
  } else {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('city')) {
      currentCityKey = urlParams.get('city');
    }
  }
}

async function loadCities() {
  try {
    const res = await fetch('/api/cities');
    const data = await res.json();
    citiesList = data.cities || [];
    
    const citySelect = document.getElementById('city-select');
    citySelect.innerHTML = '';
    citiesList.forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.key;
      opt.textContent = `${c.name} (${c.country})`;
      if (c.key === currentCityKey) opt.selected = true;
      citySelect.appendChild(opt);
    });

    currentCityData = citiesList.find((c) => c.key === currentCityKey) || citiesList[0];
    if (currentCityData) {
      currentCityKey = currentCityData.key;
      cityLanguages = currentCityData.languages || ['en'];
      activeLang = cityLanguages[0] || 'en';
    }
    updateCityBadge();
  } catch (err) {
    console.error('Failed to load cities:', err);
  }
}

function updateCityBadge() {
  const badge = document.getElementById('current-city-badge');
  if (badge && currentCityData) {
    badge.textContent = currentCityData.name.toUpperCase();
  }
  document.getElementById('auth-city-title').textContent = `${(currentCityData ? currentCityData.name : currentCityKey).toUpperCase()} ADMIN LOGIN`;
}

function checkSessionAuth() {
  const savedPass = sessionStorage.getItem(`admin_pass_${currentCityKey}`);
  if (savedPass) {
    adminPassword = savedPass;
    verifyPassword(savedPass);
  } else {
    document.getElementById('auth-modal').style.display = 'flex';
  }
}

async function verifyPassword(passwordKey) {
  try {
    const res = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': passwordKey,
        'x-city': currentCityKey
      },
      body: JSON.stringify({ city: currentCityKey, adminPassword: passwordKey })
    });

    if (res.ok) {
      adminPassword = passwordKey;
      sessionStorage.setItem(`admin_pass_${currentCityKey}`, passwordKey);
      document.getElementById('auth-modal').style.display = 'none';
      initMap();
      loadTowersList();
      populateSoundTypes();
      renderLangTabs();
    } else {
      document.getElementById('auth-error').style.display = 'block';
      sessionStorage.removeItem(`admin_pass_${currentCityKey}`);
    }
  } catch (err) {
    console.error('Auth verification error:', err);
    document.getElementById('auth-error').style.display = 'block';
  }
}

function initUI() {
  // Auth Form
  document.getElementById('auth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const pass = document.getElementById('auth-password').value;
    verifyPassword(pass);
  });

  // City Dropdown Change
  document.getElementById('city-select').addEventListener('change', (e) => {
    currentCityKey = e.target.value;
    window.location.href = `/edit/${currentCityKey}`;
  });

  // Tab Switching
  document.getElementById('tab-btn-towers').addEventListener('click', () => switchTab('towers'));
  document.getElementById('tab-btn-manual').addEventListener('click', () => switchTab('edit'));
  document.getElementById('tab-btn-llm').addEventListener('click', () => switchTab('llm'));

  // Action Buttons
  document.getElementById('btn-add-new-tower').addEventListener('click', () => prepareNewTower());
  document.getElementById('btn-save-tower').addEventListener('click', () => saveTower());
  document.getElementById('btn-delete-tower').addEventListener('click', () => deleteTower());
  document.getElementById('btn-play-preview').addEventListener('click', () => triggerPreviewAudio());
  document.getElementById('btn-solo-toggle').addEventListener('click', () => toggleSoloMode());
  document.getElementById('btn-move-listener').addEventListener('click', () => toggleMoveListenerMode());
  document.getElementById('btn-generate-llm').addEventListener('click', () => generateLLMPreset());

  // Slider Live Value Labels & Audio Preview
  const sliders = [
    { id: 'edit-freq', valId: 'val-freq', param: 'baseFrequency' },
    { id: 'edit-harmonicity', valId: 'val-harmonicity', param: 'harmonicity' },
    { id: 'edit-decay', valId: 'val-decay', param: 'decay' },
    { id: 'edit-gain', valId: 'val-gain', param: 'gain' },
    { id: 'edit-cutoff', valId: 'val-cutoff', param: 'filterCutoff' },
    { id: 'edit-fm', valId: 'val-fm', param: 'fmIndex' },
    { id: 'edit-density', valId: 'val-density', param: 'euclideanDensity' }
  ];

  sliders.forEach(({ id, valId, param }) => {
    const elem = document.getElementById(id);
    const valElem = document.getElementById(valId);
    elem.addEventListener('input', (e) => {
      valElem.textContent = e.target.value;
      if (activeTower && activeTower.stateVector) {
        activeTower.stateVector[param] = Number(e.target.value);
        triggerPreviewAudio();
      }
    });
  });

  document.getElementById('edit-sound-type').addEventListener('change', (e) => {
    if (activeTower && activeTower.stateVector) {
      activeTower.stateVector.soundType = e.target.value;
      triggerPreviewAudio();
    }
  });

  document.getElementById('edit-carrier-type').addEventListener('change', (e) => {
    if (activeTower && activeTower.stateVector) {
      activeTower.stateVector.carrierType = e.target.value;
      triggerPreviewAudio();
    }
  });
}

function initAudio() {
  if (!audioEngine) {
    audioEngine = new WebAudioEngine();
    audioEngine.init();
    audioEngine.setCityAcousticProfile(currentCityKey);
  }
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach((btn) => btn.classList.remove('active'));
  document.querySelectorAll('.section-view').forEach((sec) => sec.style.display = 'none');

  if (tabName === 'towers') {
    document.getElementById('tab-btn-towers').classList.add('active');
    document.getElementById('section-towers').style.display = 'flex';
  } else if (tabName === 'edit') {
    document.getElementById('tab-btn-manual').classList.add('active');
    document.getElementById('section-edit').style.display = 'flex';
  } else if (tabName === 'llm') {
    document.getElementById('tab-btn-llm').classList.add('active');
    document.getElementById('section-llm').style.display = 'flex';
  }
}

function updateAdminTileLayer(provider, useGcj02) {
  if (!map) return;
  if (adminTileLayer) {
    map.removeLayer(adminTileLayer);
  }

  const prov = provider || currentCityData?.tileProvider || 'carto';
  let url = '';
  let options = {};

  if (prov === 'autonavi' || prov === 'amap') {
    url = 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}';
    options = { subdomains: ['1', '2', '3', '4'], maxZoom: 19, attribution: '&copy; AutoNavi &copy; OpenStreetMap' };
  } else {
    // ponytail: voyager style provides high-visibility labels, street names, and building footprints for editing alignment
    const style = currentAdminStyle === 'dark' ? 'dark_all' : 'rastertiles/voyager';
    url = `https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png`;
    options = { subdomains: 'abcd', maxZoom: 19, attribution: '&copy; OpenStreetMap &copy; CARTO' };
  }

  adminTileLayer = L.tileLayer(url, options).addTo(map);
}

function initMap() {
  if (map) return;
  const center = currentCityData ? currentCityData.center : { lat: -20.3856, lng: -43.5035, zoom: 16 };
  const provider = currentCityData?.tileProvider || 'carto';
  const useGcj02 = !!currentCityData?.useGcj02;

  let centerLat = center.lat;
  let centerLng = center.lng;
  if (useGcj02 && centerLat >= 18 && centerLat <= 54 && centerLng >= 73 && centerLng <= 135) {
    const pt = wgs84ToGcj02(centerLat, centerLng);
    centerLat = pt.lat;
    centerLng = pt.lng;
  }

  map = L.map('admin-map', {
    center: [centerLat, centerLng],
    zoom: center.zoom || 15,
    zoomControl: true
  });

  updateAdminTileLayer(provider, useGcj02);

  // Setup Map Style toggle buttons
  const btnVoyager = document.getElementById('btn-map-style-voyager');
  const btnDark = document.getElementById('btn-map-style-dark');
  if (btnVoyager && btnDark) {
    btnVoyager.addEventListener('click', () => {
      currentAdminStyle = 'voyager';
      btnVoyager.classList.add('active');
      btnDark.classList.remove('active');
      updateAdminTileLayer(provider, useGcj02);
    });
    btnDark.addEventListener('click', () => {
      currentAdminStyle = 'dark';
      btnDark.classList.add('active');
      btnVoyager.classList.remove('active');
      updateAdminTileLayer(provider, useGcj02);
    });
  }

  map.on('click', (e) => {
    const { lat, lng } = e.latlng;
    if (isMoveListenerMode) {
      moveTestListener(lat, lng);
    } else {
      // Set coordinates for tower in edit form & update marker on map
      document.getElementById('edit-lat').value = lat.toFixed(6);
      document.getElementById('edit-lng').value = lng.toFixed(6);
      if (activeTower) {
        activeTower.coordinates = activeTower.coordinates || {};
        activeTower.coordinates.lat = lat;
        activeTower.coordinates.lng = lng;

        const activeMarker = markersMap.get(activeTower.nodeId);
        if (activeMarker) {
          activeMarker.setLatLng([lat, lng]);
          showToast(`📍 Relocated "${activeTower.name}" to [${lat.toFixed(5)}, ${lng.toFixed(5)}]`);
        }
      }
      switchTab('edit');
    }
  });
}

function moveTestListener(lat, lng) {
  initAudio();
  if (listenerMarker) {
    listenerMarker.setLatLng([lat, lng]);
  } else {
    const customIcon = L.divIcon({
      className: 'listener-marker',
      html: '<div style="background: #38bdf8; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px #38bdf8;"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
    listenerMarker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
  }
  audioEngine.updateSomaticPosition({ lat, lng });
  triggerPreviewAudio();
}

function toggleMoveListenerMode() {
  isMoveListenerMode = !isMoveListenerMode;
  const btn = document.getElementById('btn-move-listener');
  if (isMoveListenerMode) {
    btn.classList.add('btn-primary');
    btn.classList.remove('btn-secondary');
    btn.textContent = '📍 CLICK MAP (POSITIONING LISTENER...)';
  } else {
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-secondary');
    btn.textContent = '📍 CLICK MAP TO MOVE LISTENER';
  }
}

function toggleSoloMode() {
  initAudio();
  isSoloActive = !isSoloActive;
  const btn = document.getElementById('btn-solo-toggle');
  if (isSoloActive) {
    btn.classList.add('active');
    btn.textContent = '🎵 SOLO SOUND: ON';
    if (activeTower) {
      audioEngine.setSoloNode(activeTower.nodeId);
    }
  } else {
    btn.classList.remove('active');
    btn.textContent = '🎵 SOLO SOUND: OFF';
    audioEngine.clearSoloNode();
  }
}

function populateSoundTypes() {
  const select = document.getElementById('edit-sound-type');
  select.innerHTML = '';
  const types = CITY_SOUND_TYPES[currentCityKey] || CITY_SOUND_TYPES.ouro_preto;
  types.forEach((t) => {
    const opt = document.createElement('option');
    opt.value = t.key;
    opt.textContent = t.label;
    select.appendChild(opt);
  });
}

function renderLangTabs() {
  const container = document.getElementById('lang-chips-container');
  container.innerHTML = '';
  cityLanguages.forEach((lang) => {
    const chip = document.createElement('div');
    chip.className = `lang-chip ${lang === activeLang ? 'active' : ''}`;
    chip.textContent = lang.toUpperCase();
    chip.addEventListener('click', () => {
      // Save text for current active lang before switching
      nameMap[activeLang] = document.getElementById('edit-name').value;
      descriptionMap[activeLang] = document.getElementById('edit-desc').value;
      activeLang = lang;
      renderLangTabs();
      document.getElementById('edit-name').value = nameMap[activeLang] || '';
      document.getElementById('edit-desc').value = descriptionMap[activeLang] || '';
    });
    container.appendChild(chip);
  });
}

async function loadTowersList() {
  try {
    const res = await fetch(`/api/nodes?city=${currentCityKey}`);
    const data = await res.json();
    const nodes = data.nodes || [];

    const container = document.getElementById('towers-list-container');
    container.innerHTML = '';

    // Clear previous markers
    markersMap.forEach((m) => map.removeLayer(m));
    markersMap.clear();

    nodes.forEach((node) => {
      // ponytail: extract localized name for display
      let displayName = node.name;
      if (typeof node.name === 'object' && node.name !== null) {
        displayName = node.name[activeLang] || node.name.en || Object.values(node.name)[0] || '';
      } else if (typeof node.name === 'string' && node.name.includes(' / ')) {
        const parts = node.name.split(' / ');
        displayName = (activeLang === 'en') ? parts[0].trim() : (parts[1] ? parts[1].trim() : parts[0].trim());
      }

      // Add list item
      const item = document.createElement('div');
      item.dataset.nodeId = node.nodeId;
      item.className = `tower-item ${activeTower && activeTower.nodeId === node.nodeId ? 'active' : ''}`;
      item.innerHTML = `
        <div>
          <div style="font-weight: 600; font-size: 0.9rem; color: #f8fafc;">${displayName}</div>
          <div style="font-size: 0.75rem; color: #94a3b8;">${node.nodeType} • ${node.stateVector.soundType}</div>
        </div>
        <span style="font-size: 0.75rem; color: #38bdf8; font-family: monospace;">${node.stateVector.baseFrequency}Hz</span>
      `;
      item.addEventListener('click', () => selectTower(node));
      container.appendChild(item);

      // Add map marker with interactive drag-and-drop
      if (node.coordinates && node.coordinates.lat != null) {
        const isSelected = activeTower && activeTower.nodeId === node.nodeId;
        const markerColor = node.nodeType === 'TOWER' ? (isSelected ? '#0284c7' : '#f59e0b') : '#38bdf8';
        
        const customIcon = L.divIcon({
          className: 'tower-marker-icon',
          html: `<div style="background: ${markerColor}; width: 18px; height: 18px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 0 12px ${markerColor}; cursor: grab; transition: transform 0.15s ease;"></div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });

        const marker = L.marker([node.coordinates.lat, node.coordinates.lng], {
          icon: customIcon,
          title: `${displayName} (Drag to move)`,
          draggable: true
        }).addTo(map);

        marker.on('click', () => selectTower(node));

        marker.on('dragstart', (e) => {
          selectTower(node, { isDragging: true });
          const iconDiv = e.target.getElement()?.querySelector('div');
          if (iconDiv) {
            iconDiv.style.cursor = 'grabbing';
          }
        });

        marker.on('drag', (e) => {
          const { lat, lng } = e.target.getLatLng();
          document.getElementById('edit-lat').value = lat.toFixed(6);
          document.getElementById('edit-lng').value = lng.toFixed(6);
          if (activeTower && activeTower.nodeId === node.nodeId) {
            activeTower.coordinates.lat = lat;
            activeTower.coordinates.lng = lng;
          }
        });

        marker.on('dragend', async (e) => {
          const { lat, lng } = e.target.getLatLng();
          document.getElementById('edit-lat').value = lat.toFixed(6);
          document.getElementById('edit-lng').value = lng.toFixed(6);

          const iconDiv = e.target.getElement()?.querySelector('div');
          if (iconDiv) {
            iconDiv.style.cursor = 'grab';
          }

          node.coordinates.lat = lat;
          node.coordinates.lng = lng;

          if (activeTower && activeTower.nodeId === node.nodeId) {
            activeTower.coordinates.lat = lat;
            activeTower.coordinates.lng = lng;
          }

          // Auto-save new drag-and-drop location to backend API
          await saveTowerCoordinatesSilent(node.nodeId, lat, lng);
        });

        markersMap.set(node.nodeId, marker);
      }
    });

    if (nodes.length > 0 && !activeTower) {
      selectTower(nodes[0]);
    }
  } catch (err) {
    console.error('Failed to load towers:', err);
  }
}

function selectTower(node, options = {}) {
  activeTower = JSON.parse(JSON.stringify(node));
  document.getElementById('editor-form-title').textContent = `Edit Tower (${node.nodeId})`;
  
  // ponytail: parse multilingual name object or dual-language slash string into nameMap
  if (typeof node.name === 'object' && node.name !== null) {
    nameMap = { ...node.name };
  } else if (typeof node.name === 'string' && node.name.includes(' / ')) {
    const parts = node.name.split(' / ');
    nameMap = { en: parts[0].trim() };
    const secondLang = cityLanguages[1] || 'pt';
    nameMap[secondLang] = parts[1].trim();
  } else {
    nameMap = typeof node.name === 'string' ? { [activeLang]: node.name } : { en: '' };
  }
  document.getElementById('edit-name').value = nameMap[activeLang] || nameMap.en || Object.values(nameMap)[0] || '';

  descriptionMap = typeof node.description === 'object' ? { ...node.description } : { en: node.description || '' };
  document.getElementById('edit-desc').value = descriptionMap[activeLang] || '';

  const sv = node.stateVector || {};
  document.getElementById('edit-sound-type').value = sv.soundType || 'bell_deep';
  document.getElementById('edit-carrier-type').value = sv.carrierType || 'sine';
  document.getElementById('edit-freq').value = sv.baseFrequency || 220;
  document.getElementById('val-freq').textContent = sv.baseFrequency || 220;

  document.getElementById('edit-harmonicity').value = sv.harmonicity || 1.41;
  document.getElementById('val-harmonicity').textContent = sv.harmonicity || 1.41;

  document.getElementById('edit-decay').value = sv.decay || 1.5;
  document.getElementById('val-decay').textContent = sv.decay || 1.5;

  document.getElementById('edit-gain').value = sv.gain || 0.9;
  document.getElementById('val-gain').textContent = sv.gain || 0.9;

  document.getElementById('edit-cutoff').value = sv.filterCutoff || 1200;
  document.getElementById('val-cutoff').textContent = sv.filterCutoff || 1200;

  document.getElementById('edit-fm').value = sv.fmIndex || 0;
  document.getElementById('val-fm').textContent = sv.fmIndex || 0;

  document.getElementById('edit-density').value = sv.euclideanDensity || 3;
  document.getElementById('val-density').textContent = sv.euclideanDensity || 3;

  if (node.coordinates) {
    document.getElementById('edit-lat').value = node.coordinates.lat || '';
    document.getElementById('edit-lng').value = node.coordinates.lng || '';
  }

  // 1. Highlight and scroll into view the corresponding list item in the towers list
  const container = document.getElementById('towers-list-container');
  if (container) {
    const items = container.querySelectorAll('.tower-item');
    items.forEach((item) => {
      if (item.dataset.nodeId === node.nodeId) {
        item.classList.add('active');
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        item.classList.remove('active');
      }
    });
  }

  // 2. Highlight selected map marker (skip setIcon on active dragged marker to avoid detaching drag listeners)
  markersMap.forEach((marker, id) => {
    const isSelected = id === node.nodeId;
    if (isSelected && (options.isDragging || (marker.dragging && marker.dragging._dragging))) {
      return;
    }
    const baseColor = node.nodeType === 'TOWER' ? '#f59e0b' : '#38bdf8';
    const markerColor = isSelected ? '#0284c7' : baseColor;
    const glowColor = isSelected ? '#38bdf8' : markerColor;
    const border = isSelected ? '3px solid #ffffff' : '2px solid #ffffff';
    const size = isSelected ? 22 : 18;
    const anchor = isSelected ? 11 : 9;

    const customIcon = L.divIcon({
      className: 'tower-marker-icon',
      html: `<div style="background: ${markerColor}; width: ${size}px; height: ${size}px; border-radius: 50%; border: ${border}; box-shadow: 0 0 16px ${glowColor}; cursor: grab; transition: transform 0.15s ease;"></div>`,
      iconSize: [size + 4, size + 4],
      iconAnchor: [anchor + 2, anchor + 2]
    });
    marker.setIcon(customIcon);
  });

  if (isSoloActive && audioEngine) {
    audioEngine.setSoloNode(node.nodeId);
  }
  triggerPreviewAudio();
}

function prepareNewTower() {
  const center = map.getCenter();
  nameMap = {};
  descriptionMap = {};
  activeTower = {
    nodeId: null, // new tower
    nodeType: 'TOWER',
    city: currentCityKey,
    name: 'New Acoustic Tower',
    description: {},
    coordinates: { lat: center.lat, lng: center.lng, alt: 0 },
    stateVector: {
      soundType: CITY_SOUND_TYPES[currentCityKey]?.[0]?.key || 'bell_deep',
      carrierType: 'sine',
      baseFrequency: 220,
      harmonicity: 1.414,
      decay: 2.0,
      gain: 0.9,
      euclideanDensity: 3,
      filterCutoff: 1200,
      fmIndex: 0.0
    }
  };

  selectTower(activeTower);
  document.getElementById('editor-form-title').textContent = 'Create New Tower';
  switchTab('edit');
}

async function saveTower() {
  if (!activeTower) return;

  // Save active name and description field values
  nameMap[activeLang] = document.getElementById('edit-name').value;
  descriptionMap[activeLang] = document.getElementById('edit-desc').value;

  const lat = Number(document.getElementById('edit-lat').value);
  const lng = Number(document.getElementById('edit-lng').value);

  const payload = {
    nodeId: activeTower.nodeId,
    name: nameMap,
    city: currentCityKey,
    description: descriptionMap,
    coordinates: { lat, lng, alt: 0 },
    stateVector: {
      soundType: document.getElementById('edit-sound-type').value,
      carrierType: document.getElementById('edit-carrier-type').value,
      baseFrequency: Number(document.getElementById('edit-freq').value),
      harmonicity: Number(document.getElementById('edit-harmonicity').value),
      decay: Number(document.getElementById('edit-decay').value),
      gain: Number(document.getElementById('edit-gain').value),
      filterCutoff: Number(document.getElementById('edit-cutoff').value),
      fmIndex: Number(document.getElementById('edit-fm').value),
      euclideanDensity: Number(document.getElementById('edit-density').value)
    }
  };

  try {
    const isUpdate = Boolean(activeTower.nodeId);
    const url = isUpdate ? `/api/admin/nodes/${activeTower.nodeId}` : '/api/admin/nodes';
    const method = isUpdate ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': adminPassword,
        'x-city': currentCityKey
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      activeTower = data.node;
      alert(`Tower "${payload.name}" saved successfully!`);
      loadTowersList();
    } else {
      const err = await res.json();
      alert(`Save failed: ${err.error}`);
    }
  } catch (err) {
    console.error('Error saving tower:', err);
    alert(`Save error: ${err.message}`);
  }
}

async function deleteTower() {
  if (!activeTower || !activeTower.nodeId) {
    alert('Select an existing tower to delete.');
    return;
  }

  if (!confirm(`Are you sure you want to delete tower "${activeTower.name}"?`)) return;

  try {
    const res = await fetch(`/api/admin/nodes/${activeTower.nodeId}`, {
      method: 'DELETE',
      headers: {
        'x-admin-password': adminPassword,
        'x-city': currentCityKey
      }
    });

    if (res.ok) {
      alert('Tower deleted.');
      activeTower = null;
      loadTowersList();
      switchTab('towers');
    } else {
      const err = await res.json();
      alert(`Delete failed: ${err.error}`);
    }
  } catch (err) {
    console.error('Error deleting tower:', err);
  }
}

async function generateLLMPreset() {
  const prompt = document.getElementById('llm-prompt').value;
  if (!prompt) {
    alert('Please enter an acoustic description prompt.');
    return;
  }

  const status = document.getElementById('llm-status');
  status.style.display = 'block';
  status.textContent = 'Generating acoustic preset with LLM...';

  try {
    const center = map.getCenter();
    const res = await fetch('/api/reflectors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coordinates: { lat: center.lat, lng: center.lng },
        intentText: prompt,
        city: currentCityKey
      })
    });

    if (res.ok) {
      const data = await res.json();
      const node = data.node;
      status.style.display = 'none';

      // Populate form with generated parameters
      prepareNewTower();
      document.getElementById('edit-name').value = node.name;
      const sv = node.stateVector;
      if (sv.soundType) document.getElementById('edit-sound-type').value = sv.soundType;
      if (sv.carrierType) document.getElementById('edit-carrier-type').value = sv.carrierType;
      if (sv.baseFrequency) {
        document.getElementById('edit-freq').value = sv.baseFrequency;
        document.getElementById('val-freq').textContent = sv.baseFrequency;
      }
      if (sv.decay) {
        document.getElementById('edit-decay').value = sv.decay;
        document.getElementById('val-decay').textContent = sv.decay;
      }
      switchTab('edit');
      triggerPreviewAudio();
    } else {
      status.textContent = 'LLM generation failed.';
    }
  } catch (err) {
    console.error('LLM generation error:', err);
    status.textContent = 'Error calling LLM generator.';
  }
}

function triggerPreviewAudio() {
  initAudio();
  if (!audioEngine || !activeTower || !activeTower.stateVector) return;

  const sv = {
    ...activeTower.stateVector,
    nodeId: activeTower.nodeId || 'preview_node'
  };

  audioEngine.triggerBell(sv, 0);
}

async function saveTowerCoordinatesSilent(nodeId, lat, lng) {
  if (!nodeId || !adminPassword) return;
  try {
    const res = await fetch(`/api/admin/nodes/${nodeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': adminPassword,
        'x-city': currentCityKey
      },
      body: JSON.stringify({
        coordinates: { lat: Number(lat), lng: Number(lng), alt: 0 }
      })
    });
    if (res.ok) {
      showToast(`📍 Relocated: [${lat.toFixed(5)}, ${lng.toFixed(5)}]`);
    }
  } catch (err) {
    console.error('Failed to auto-save dragged coordinates:', err);
  }
}

function showToast(message) {
  let toast = document.getElementById('admin-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'admin-toast';
    toast.style.cssText = 'position: absolute; top: 16px; right: 16px; background: rgba(15, 23, 42, 0.95); border: 1px solid #38bdf8; color: #f8fafc; padding: 10px 16px; border-radius: 8px; font-size: 0.85rem; font-family: monospace; z-index: 1000; box-shadow: 0 10px 25px rgba(0,0,0,0.5); pointer-events: none; transition: opacity 0.3s; opacity: 0;';
    const mapContainer = document.getElementById('admin-map-container');
    if (mapContainer) mapContainer.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = '1';
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.style.opacity = '0';
  }, 2500);
}
