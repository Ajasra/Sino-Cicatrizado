import { CLIENT_CONFIG } from '../config.js';

export class LeafletMapView {
  constructor(elementId = 'map') {
    this.elementId = elementId;
    this.map = null;
    this.towerMarkers = new Map();
    this.reflectorMarkers = new Map();
    this.somaticMarker = null;
  }

  init() {
    if (!window.L) {
      console.warn('[Map] Leaflet.js library not loaded yet.');
      return;
    }

    const center = CLIENT_CONFIG.OURO_PRETO_CENTER;
    this.map = window.L.map(this.elementId).setView([center.lat, center.lng], center.zoom);

    // Dark Map Tiles (CartoDB Dark Matter / OpenStreetMap)
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(this.map);
  }

  updateNodes(nodesList = []) {
    if (!this.map) return;

    nodesList.forEach((node) => {
      const { lat, lng } = node.coordinates;

      if (node.nodeType === 'TOWER') {
        if (!this.towerMarkers.has(node.nodeId)) {
          const marker = window.L.circleMarker([lat, lng], {
            radius: 10,
            color: '#d4af37',
            fillColor: '#d4af37',
            fillOpacity: 0.8
          }).addTo(this.map);

          marker.bindPopup(`<b>${node.name}</b><br>Freq: ${node.stateVector.baseFrequency.toFixed(1)}Hz | Scars: ${node.scarIndex.toFixed(2)}`);
          this.towerMarkers.set(node.nodeId, marker);
        } else {
          const marker = this.towerMarkers.get(node.nodeId);
          marker.setLatLng([lat, lng]);
          marker.setPopupContent(`<b>${node.name}</b><br>Freq: ${node.stateVector.baseFrequency.toFixed(1)}Hz | Scars: ${node.scarIndex.toFixed(2)}`);
        }
      } else if (node.nodeType === 'REFLECTOR') {
        if (!this.reflectorMarkers.has(node.nodeId)) {
          const marker = window.L.circleMarker([lat, lng], {
            radius: 6,
            color: '#00e5ff',
            fillColor: '#00e5ff',
            fillOpacity: 0.6
          }).addTo(this.map);

          marker.bindPopup(`<b>${node.name}</b><br>Freq: ${node.stateVector.baseFrequency.toFixed(1)}Hz`);
          this.reflectorMarkers.set(node.nodeId, marker);
        }
      }
    });
  }

  updateSomaticNode(coords) {
    if (!this.map || !coords) return;

    if (!this.somaticMarker) {
      this.somaticMarker = window.L.circleMarker([coords.lat, coords.lng], {
        radius: 8,
        color: '#00e676',
        fillColor: '#00e676',
        fillOpacity: 1.0
      }).addTo(this.map);
      this.somaticMarker.bindPopup('<b>Your Somatic Node</b>');
    } else {
      this.somaticMarker.setLatLng([coords.lat, coords.lng]);
    }
  }

  getMap() {
    return this.map;
  }
}
