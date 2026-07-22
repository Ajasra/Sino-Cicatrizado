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
  }

  init(initialCenter) {
    if (!window.L) {
      console.warn('[Map] Leaflet.js library not loaded yet.');
      return;
    }

    const center = initialCenter || CLIENT_CONFIG.OURO_PRETO_CENTER;
    this.map = window.L.map(this.elementId, {
      zoomControl: true,
      tap: true,
      touchZoom: true,
      dragging: true,
      bounceAtZoomLimits: false
    }).setView([center.lat, center.lng], center.zoom || 14);

    // Multi-source resilient tile layer (Amap / CartoDB fallback for CN and global networks)
    const primaryTileUrl = 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}';
    const fallbackTileUrl = 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}{r}.png';

    this._isGcj02Provider = true;

    const tiles = window.L.tileLayer(primaryTileUrl, {
      subdomains: ['1', '2', '3', '4'],
      maxZoom: 19,
      attribution: '&copy; AutoNavi &copy; OpenStreetMap'
    });

    // Fallback handler if primary fails
    tiles.on('tileerror', () => {
      if (!this._hasSwitchedFallback) {
        this._hasSwitchedFallback = true;
        this._isGcj02Provider = false;
        console.warn('[Map] Primary tiles unreachable. Switching to global fallback tiles...');
        this.map.removeLayer(tiles);
        window.L.tileLayer(fallbackTileUrl, {
          subdomains: 'abcd',
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
        }).addTo(this.map);
        if (this.lastNodesList.length > 0) {
          this.updateNodes(this.lastNodesList);
        }
      }
    });

    tiles.addTo(this.map);
  }

  _getDisplayCoords(lat, lng) {
    if (this._isGcj02Provider) {
      return wgs84ToGcj02(lat, lng);
    }
    return { lat, lng };
  }

  setCityView(centerCoords) {
    if (!this.map || !centerCoords) return;
    const pt = this._getDisplayCoords(centerCoords.lat, centerCoords.lng);
    this.map.setView([pt.lat, pt.lng], centerCoords.zoom || 14);
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

      if (node.nodeType === 'TOWER') {
        const popupText = `<b>${node.name}</b>${distStr}<br><b>Sound Type:</b> <i>${soundType}</i><br>Freq: ${node.stateVector.baseFrequency.toFixed(1)}Hz | Scar: ${node.scarIndex.toFixed(2)}`;

        if (!this.towerMarkers.has(node.nodeId)) {
          const marker = window.L.circleMarker([lat, lng], {
            radius: 5,
            color: '#d4af37',
            fillColor: '#d4af37',
            fillOpacity: 0.85
          }).addTo(this.map);

          marker._baseRadius = 5;
          marker._baseColor = '#d4af37';
          marker.bindPopup(popupText);
          this.towerMarkers.set(node.nodeId, marker);
        } else {
          const marker = this.towerMarkers.get(node.nodeId);
          marker.setLatLng([lat, lng]);
          marker.setPopupContent(popupText);
        }
      } else if (node.nodeType === 'REFLECTOR') {
        const popupText = `<b>${node.name}</b>${distStr}<br><b>Sound Type:</b> <i>${soundType}</i><br>Freq: ${node.stateVector.baseFrequency.toFixed(1)}Hz`;

        if (!this.reflectorMarkers.has(node.nodeId)) {
          const marker = window.L.circleMarker([lat, lng], {
            radius: 3,
            color: '#00e5ff',
            fillColor: '#00e5ff',
            fillOpacity: 0.7
          }).addTo(this.map);

          marker._baseRadius = 3;
          marker._baseColor = '#00e5ff';
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
      this.somaticMarker = window.L.circleMarker([pt.lat, pt.lng], {
        radius: 4,
        color: '#00e676',
        fillColor: '#00e676',
        fillOpacity: 1.0
      }).addTo(this.map);

      this.somaticMarker._baseRadius = 4;
      this.somaticMarker._baseColor = '#00e676';
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

      const color = isVirtual ? '#ff4081' : '#ab47bc';

      if (!this.otherUserMarkers.has(id)) {
        const marker = window.L.circleMarker([lat, lng], {
          radius: 3.5,
          color: color,
          fillColor: color,
          fillOpacity: 0.85
        }).addTo(this.map);

        marker._baseRadius = 3.5;
        marker._baseColor = color;
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
