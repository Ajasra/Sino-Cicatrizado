import { CLIENT_CONFIG } from '../config.js';
import { calculateHaversineMeters, wgs84ToGcj02 } from '../spatial.js';

export class LeafletMapView {
  constructor(elementId = 'map') {
    this.elementId = elementId;
    this.map = null;
    this.towerMarkers = new Map();
    this.reflectorMarkers = new Map();
    this.somaticMarker = null;
    this.somaticCoords = null;
    this.otherUserMarkers = new Map();
    this.lastNodesList = [];
    this.currentTheme = 'dark';
    this._fallbackTileLayer = null;
  }

  init(initialCenter) {
    if (!window.L) {
      console.warn('[Map] Leaflet.js library not loaded yet.');
      return;
    }

    const cityConfig = initialCenter || CLIENT_CONFIG.CITIES.ouro_preto;
    const center = cityConfig.center || cityConfig;
    this.map = window.L.map(this.elementId, {
      zoomControl: true,
      tap: true,
      touchZoom: true,
      dragging: true,
      bounceAtZoomLimits: false
    }).setView([center.lat, center.lng], center.zoom || 14);

    // ponytail: set tile provider & GCJ-02 offset dynamically based on city configuration
    const provider = cityConfig.tileProvider || 'carto';
    const useGcj02 = cityConfig.useGcj02 !== undefined ? cityConfig.useGcj02 : false;
    this.setTileProvider(provider, useGcj02);
  }

  setTileProvider(providerName = 'carto', useGcj02 = false) {
    this._isGcj02Provider = !!useGcj02;
    this._tileProviderName = providerName;
    this._hasSwitchedFallback = false;

    if (this._tileLayer && this.map) {
      this.map.removeLayer(this._tileLayer);
    }

    let url = '';
    let options = {};

    if (providerName === 'autonavi' || providerName === 'amap') {
      url = 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}';
      options = { subdomains: ['1', '2', '3', '4'], maxZoom: 19, attribution: '&copy; AutoNavi &copy; OpenStreetMap' };
    } else {
      const tileStyle = this.currentTheme === 'light' ? 'light_all' : 'dark_all';
      url = `https://{s}.basemaps.cartocdn.com/${tileStyle}/{z}/{x}/{y}{r}.png`;
      options = { subdomains: 'abcd', maxZoom: 19, attribution: '&copy; OpenStreetMap &copy; CARTO' };
    }

    this._tileLayer = window.L.tileLayer(url, options);

    this._tileLayer.on('tileerror', () => {
      if (!this._hasSwitchedFallback) {
        this._hasSwitchedFallback = true;
        console.warn(`[Map] Tile provider ${providerName} unreachable. Switching to OpenStreetMap fallback...`);
        this.map.removeLayer(this._tileLayer);
        this._loadFallbackTiles();
        if (this.lastNodesList && this.lastNodesList.length > 0) {
          this.updateNodes(this.lastNodesList);
        }
      }
    });

    this._tileLayer.addTo(this.map);
  }

  /* ponytail: dynamic map theme switching (dark/light tiles & markers) */
  setTheme(theme) {
    this.currentTheme = theme;
    if (this._tileProviderName === 'carto' && this._tileLayer && this.map && !this._hasSwitchedFallback) {
      const tileStyle = theme === 'light' ? 'light_all' : 'dark_all';
      this._tileLayer.setUrl(`https://{s}.basemaps.cartocdn.com/${tileStyle}/{z}/{x}/{y}{r}.png`);
    } else if (this._hasSwitchedFallback && this.map) {
      this._loadFallbackTiles();
    }
    this._refreshAllMarkerStyles();
  }

  _getMarkerStyle(type) {
    const isLight = this.currentTheme === 'light';
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 768);
    // ponytail: scale marker radius for mobile/high-DPI touch devices to improve hit targets
    const scale = isTouch ? 1.6 : 1.0;

    switch (type) {
      case 'TOWER':
        return {
          radius: Math.round(7 * scale),
          color: isLight ? '#000000' : '#ffffff',
          fillColor: isLight ? '#d97706' : '#f59e0b',
          weight: 1.5,
          fillOpacity: 0.95
        };
      case 'REFLECTOR':
        return {
          radius: Math.round(6 * scale),
          color: isLight ? '#000000' : '#ffffff',
          fillColor: isLight ? '#0284c7' : '#38bdf8',
          weight: 1.5,
          fillOpacity: 0.9
        };
      case 'SOMATIC':
        return {
          radius: Math.round(7 * scale),
          color: isLight ? '#000000' : '#ffffff',
          fillColor: isLight ? '#059669' : '#34d399',
          weight: 2.0,
          fillOpacity: 1.0
        };
      case 'VIRTUAL':
        return {
          radius: Math.round(6 * scale),
          color: isLight ? '#000000' : '#ffffff',
          fillColor: isLight ? '#db2777' : '#f472b6',
          weight: 1.5,
          fillOpacity: 0.9
        };
      case 'OTHER_USER':
        return {
          radius: Math.round(6 * scale),
          color: isLight ? '#000000' : '#ffffff',
          fillColor: isLight ? '#9333ea' : '#c084fc',
          weight: 1.5,
          fillOpacity: 0.9
        };
      default:
        return {
          radius: Math.round(7 * scale),
          color: isLight ? '#000000' : '#ffffff',
          fillColor: isLight ? '#d97706' : '#f59e0b',
          weight: 1.5,
          fillOpacity: 0.95
        };
    }
  }

  _refreshAllMarkerStyles() {
    this.towerMarkers.forEach((marker) => {
      const style = this._getMarkerStyle('TOWER');
      marker.setStyle(style);
      marker._baseColor = style.fillColor;
    });
    this.reflectorMarkers.forEach((marker) => {
      const style = this._getMarkerStyle('REFLECTOR');
      marker.setStyle(style);
      marker._baseColor = style.fillColor;
    });
    if (this.somaticMarker) {
      const style = this._getMarkerStyle('SOMATIC');
      this.somaticMarker.setStyle(style);
      this.somaticMarker._baseColor = style.fillColor;
    }
    this.otherUserMarkers.forEach((marker, id) => {
      const isVirtual = id.startsWith('vuser_');
      const style = this._getMarkerStyle(isVirtual ? 'VIRTUAL' : 'OTHER_USER');
      marker.setStyle(style);
      marker._baseColor = style.fillColor;
    });
  }

  _loadFallbackTiles() {
    if (this._fallbackTileLayer && this.map) {
      this.map.removeLayer(this._fallbackTileLayer);
    }
    const fallbackTileUrl = `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`;
    this._fallbackTileLayer = window.L.tileLayer(fallbackTileUrl, {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);
  }

  _getDisplayCoords(lat, lng) {
    // Only apply GCJ-02 offset if provider demands it AND coordinates are within China bounds
    if (this._isGcj02Provider && lat >= 18 && lat <= 54 && lng >= 73 && lng <= 135) {
      return wgs84ToGcj02(lat, lng);
    }
    return { lat, lng };
  }

  setCityView(cityConfig) {
    if (!this.map || !cityConfig) return;
    const centerCoords = cityConfig.center || cityConfig;

    // ponytail: dynamic tile provider switching when switching cities
    if (cityConfig.tileProvider !== undefined) {
      this.setTileProvider(cityConfig.tileProvider, cityConfig.useGcj02);
    }

    const pt = this._getDisplayCoords(centerCoords.lat, centerCoords.lng);
    this.map.setView([pt.lat, pt.lng], centerCoords.zoom || 14);
  }

  /* ponytail: center map on current user location */
  centerOnSomaticLocation(zoom = 15) {
    if (!this.map || !this.somaticCoords) return;
    const pt = this._getDisplayCoords(this.somaticCoords.lat, this.somaticCoords.lng);
    this.map.setView([pt.lat, pt.lng], zoom);
  }

  clearAllNodeMarkers() {
    if (!this.map) return;
    for (const [id, marker] of this.towerMarkers) {
      this.map.removeLayer(marker);
    }
    this.towerMarkers.clear();

    for (const [id, marker] of this.reflectorMarkers) {
      this.map.removeLayer(marker);
    }
    this.reflectorMarkers.clear();
  }

  updateNodes(nodesList = []) {
    if (!this.map) return;
    this.lastNodesList = nodesList;

    const currentIds = new Set(nodesList.map((n) => n.nodeId));

    // Remove markers that are no longer in the active city node list
    for (const [id, marker] of this.towerMarkers) {
      if (!currentIds.has(id)) {
        this.map.removeLayer(marker);
        this.towerMarkers.delete(id);
      }
    }
    for (const [id, marker] of this.reflectorMarkers) {
      if (!currentIds.has(id)) {
        this.map.removeLayer(marker);
        this.reflectorMarkers.delete(id);
      }
    }

    nodesList.forEach((node) => {
      const pt = this._getDisplayCoords(node.coordinates.lat, node.coordinates.lng);
      const lat = pt.lat;
      const lng = pt.lng;
      const dist = this.somaticCoords ? calculateHaversineMeters(this.somaticCoords, node.coordinates) : null;
      const distStr = dist !== null && Number.isFinite(dist) ? `<br><b>Distance:</b> ${dist.toFixed(1)}m` : '';
      const soundType = node.stateVector?.soundType || 'bell_deep';

      // ponytail: resolve localized title if node.name is an object or slash-separated dual name
      let nodeTitle = node.name;
      const currentLang = (window.i18n && window.i18n.currentLang) || 'en';
      if (typeof node.name === 'object' && node.name !== null) {
        nodeTitle = node.name[currentLang] || (currentLang === 'zh' ? node.name.cn : null) || (currentLang === 'cn' ? node.name.zh : null) || node.name.en || Object.values(node.name)[0] || '';
      } else if (typeof node.name === 'string' && node.name.includes(' / ')) {
        const parts = node.name.split(' / ');
        nodeTitle = (currentLang === 'en') ? parts[0].trim() : (parts[1] ? parts[1].trim() : parts[0].trim());
      }

      let descHtml = '';
      if (node.description) {
        let text = '';
        if (typeof node.description === 'object' && node.description !== null) {
          text = node.description[currentLang] || (currentLang === 'zh' ? node.description.cn : null) || (currentLang === 'cn' ? node.description.zh : null) || node.description.en || Object.values(node.description)[0] || '';
        } else {
          text = node.description;
        }
        if (text) {
          descHtml = `<br><div style="font-size:0.8rem; color:#94a3b8; margin-top:4px;"><i>${text}</i></div>`;
        }
      }

      if (node.nodeType === 'TOWER') {
        const popupText = `<b>${nodeTitle}</b>${descHtml}${distStr}<br><b>Sound Type:</b> <i>${soundType}</i><br>Freq: ${node.stateVector.baseFrequency.toFixed(1)}Hz | Scar: ${node.scarIndex.toFixed(2)}`;

        if (!this.towerMarkers.has(node.nodeId)) {
          const style = this._getMarkerStyle('TOWER');
          const marker = window.L.circleMarker([lat, lng], style).addTo(this.map);

          marker._baseRadius = style.radius;
          marker._baseColor = style.fillColor;
          marker.bindPopup(popupText);
          this.towerMarkers.set(node.nodeId, marker);
        } else {
          const marker = this.towerMarkers.get(node.nodeId);
          marker.setLatLng([lat, lng]);
          marker.setPopupContent(popupText);
        }
      } else if (node.nodeType === 'REFLECTOR') {
        const popupText = `<b>${nodeTitle}</b>${descHtml}${distStr}<br><b>Sound Type:</b> <i>${soundType}</i><br>Freq: ${node.stateVector.baseFrequency.toFixed(1)}Hz`;

        if (!this.reflectorMarkers.has(node.nodeId)) {
          const style = this._getMarkerStyle('REFLECTOR');
          const marker = window.L.circleMarker([lat, lng], style).addTo(this.map);

          marker._baseRadius = style.radius;
          marker._baseColor = style.fillColor;
          marker.bindPopup(popupText);
          this.reflectorMarkers.set(node.nodeId, marker);
        } else {
          const marker = this.reflectorMarkers.get(node.nodeId);
          marker.setPopupContent(popupText);
        }
      }
    });
  }


  updateSomaticNode(coords) {
    if (!this.map || !coords) return;
    this.somaticCoords = coords;
    const pt = this._getDisplayCoords(coords.lat, coords.lng);

    if (!this.somaticMarker) {
      const style = this._getMarkerStyle('SOMATIC');
      this.somaticMarker = window.L.circleMarker([pt.lat, pt.lng], style).addTo(this.map);

      this.somaticMarker._baseRadius = style.radius;
      this.somaticMarker._baseColor = style.fillColor;
      this.somaticMarker.bindPopup('<b>Your Somatic Node</b>');

      // Center map on user's initial real-time location fix
      this.map.setView([pt.lat, pt.lng], this.map.getZoom() || 15);
    } else {
      this.somaticMarker.setLatLng([pt.lat, pt.lng]);
    }

    // Refresh node distance popups if loaded
    if (this.lastNodesList.length > 0) {
      this.updateNodes(this.lastNodesList);
    }
  }

  updateOtherSomaticNodes(somaticNodes = [], mySomaticId = null) {
    if (!this.map) return;

    const currentIds = new Set();

    somaticNodes.forEach((soma) => {
      if (!soma.coordinates || soma.somaticId === mySomaticId) return;

      const id = soma.somaticId;
      currentIds.add(id);
      const pt = this._getDisplayCoords(soma.coordinates.lat, soma.coordinates.lng);
      const lat = pt.lat;
      const lng = pt.lng;
      const isVirtual = soma.somaticId.startsWith('vuser_');
      const label = isVirtual ? `Virtual User (${id})` : `Somatic Node (${id})`;
      const popupText = `<b>${label}</b><br>Lat: ${soma.coordinates.lat.toFixed(5)}<br>Lng: ${soma.coordinates.lng.toFixed(5)}`;

      const type = isVirtual ? 'VIRTUAL' : 'OTHER_USER';
      const style = this._getMarkerStyle(type);

      if (!this.otherUserMarkers.has(id)) {
        const marker = window.L.circleMarker([lat, lng], style).addTo(this.map);

        marker._baseRadius = style.radius;
        marker._baseColor = style.fillColor;
        marker.bindPopup(popupText);
        this.otherUserMarkers.set(id, marker);
      } else {
        const marker = this.otherUserMarkers.get(id);
        marker.setLatLng([lat, lng]);
        marker.setPopupContent(popupText);
      }
    });

    // Remove disconnected users
    for (const [id, marker] of this.otherUserMarkers) {
      if (!currentIds.has(id)) {
        if (marker._pulseTimeout) clearTimeout(marker._pulseTimeout);
        this.map.removeLayer(marker);
        this.otherUserMarkers.delete(id);
      }
    }
  }

  pulseOtherUserMarker(somaticId) {
    if (!this.map) return;

    const marker = this.otherUserMarkers.get(somaticId);
    if (!marker) return;

    const baseRadius = marker._baseRadius || 7;
    const baseColor = marker._baseColor || '#ff4081';

    if (marker._pulseTimeout) clearTimeout(marker._pulseTimeout);

    marker.setRadius(baseRadius + 6);
    marker.setStyle({ fillColor: '#ffffff', color: '#ffffff' });

    marker._pulseTimeout = setTimeout(() => {
      marker.setRadius(baseRadius);
      marker.setStyle({ fillColor: baseColor, color: baseColor });
      marker._pulseTimeout = null;
    }, 250);
  }

  pulseSomaticNode() {
    if (!this.map || !this.somaticMarker) return;

    const baseRadius = 4;
    const baseColor = '#00e676';

    if (this.somaticMarker._pulseTimeout) clearTimeout(this.somaticMarker._pulseTimeout);

    this.somaticMarker.setRadius(baseRadius + 5);
    this.somaticMarker.setStyle({ fillColor: '#ffffff', color: '#00e676' });

    this.somaticMarker._pulseTimeout = setTimeout(() => {
      this.somaticMarker.setRadius(baseRadius);
      this.somaticMarker.setStyle({ fillColor: baseColor, color: baseColor });
      this.somaticMarker._pulseTimeout = null;
    }, 250);
  }

  getContainerPoint(coords) {
    if (!this.map || !coords || coords.lat === undefined || coords.lng === undefined) return null;
    const pt = this._getDisplayCoords(coords.lat, coords.lng);
    return this.map.latLngToContainerPoint([pt.lat, pt.lng]);
  }

  pulseNodeMarker(nodeId) {
    if (!this.map) return;

    const marker = this.towerMarkers.get(nodeId) || this.reflectorMarkers.get(nodeId);
    if (!marker) return;

    const isTower = this.towerMarkers.has(nodeId);
    const baseRadius = marker._baseRadius || (isTower ? 5 : 3);
    const baseColor = marker._baseColor || (isTower ? '#d4af37' : '#00e5ff');

    if (marker._pulseTimeout) clearTimeout(marker._pulseTimeout);

    // Flash radius expansion
    marker.setRadius(baseRadius + 6);
    marker.setStyle({ fillColor: '#ffffff', color: '#ffffff' });

    marker._pulseTimeout = setTimeout(() => {
      marker.setRadius(baseRadius);
      marker.setStyle({ fillColor: baseColor, color: baseColor });
      marker._pulseTimeout = null;
    }, 200);
  }

  enableDebugContextMenu(onSetLocation) {
    if (!this.map || !window.L) return;

    this.map.on('contextmenu', (e) => {
      const clickedCoords = { lat: e.latlng.lat, lng: e.latlng.lng };

      const popupContent = document.createElement('div');
      popupContent.style.padding = '4px';

      const title = document.createElement('div');
      title.style.fontWeight = 'bold';
      title.style.marginBottom = '4px';
      title.style.color = '#00e5ff';
      title.textContent = 'DEBUG GPS SIMULATOR';

      const coordsDiv = document.createElement('div');
      coordsDiv.style.fontSize = '0.8em';
      coordsDiv.style.color = '#aaa';
      coordsDiv.style.marginBottom = '4px';
      coordsDiv.textContent = `Lat: ${clickedCoords.lat.toFixed(5)} | Lng: ${clickedCoords.lng.toFixed(5)}`;

      let distDivHtml = '';
      if (this.somaticCoords) {
        const distFromCurrent = calculateHaversineMeters(this.somaticCoords, clickedCoords);
        distDivHtml += `<div style="font-size: 0.8em; color: #00e676; margin-bottom: 6px;">Distance from current: <b>${distFromCurrent.toFixed(1)}m</b></div>`;
      }

      // Find distance to nearest tower
      let minDist = Infinity;
      let nearestName = '';
      this.lastNodesList.forEach((n) => {
        const d = calculateHaversineMeters(clickedCoords, n.coordinates);
        if (d < minDist) {
          minDist = d;
          nearestName = n.name;
        }
      });

      if (Number.isFinite(minDist)) {
        distDivHtml += `<div style="font-size: 0.8em; color: #d4af37; margin-bottom: 8px;">Nearest Tower (${nearestName}): <b>${minDist.toFixed(1)}m</b></div>`;
      }

      const infoContainer = document.createElement('div');
      infoContainer.innerHTML = distDivHtml;

      const btn = document.createElement('button');
      btn.className = 'btn btn-primary';
      btn.style.width = '100%';
      btn.style.padding = '4px 8px';
      btn.style.fontSize = '0.85em';
      btn.textContent = 'Set Current Location';

      popupContent.appendChild(title);
      popupContent.appendChild(coordsDiv);
      popupContent.appendChild(infoContainer);
      popupContent.appendChild(btn);

      const popup = window.L.popup()
        .setLatLng(e.latlng)
        .setContent(popupContent)
        .openOn(this.map);

      btn.addEventListener('click', () => {
        if (typeof onSetLocation === 'function') {
          onSetLocation(clickedCoords);
        }
        this.map.closePopup(popup);
      });
    });
  }

  enableTapToMove(onSetLocation) {
    if (!this.map || !window.L) return;

    this.map.on('click', (e) => {
      // Ignore clicks on existing popups or control elements
      const target = e.originalEvent?.target;
      if (target && (target.closest('.leaflet-popup') || target.closest('.leaflet-control'))) {
        return;
      }

      const clickedCoords = { lat: e.latlng.lat, lng: e.latlng.lng };
      if (typeof onSetLocation === 'function') {
        onSetLocation(clickedCoords);
      }
    });
  }

  getMap() {
    return this.map;
  }
}
