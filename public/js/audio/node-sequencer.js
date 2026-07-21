import { generateEuclideanPattern, isBeatActiveForNode } from './euclidean.js';
import { getEffectiveSpatialAudio } from '../spatial.js';

export class NodeSequencer {
  constructor(audioEngine, mapView, radar) {
    this.audioEngine = audioEngine;
    this.mapView = mapView;
    this.radar = radar;

    this.nodes = [];
    this.somaticCoords = null;
    this.isRunning = false;
    this.timerId = null;

    this.stepIndex = 0;
    this.nodePatterns = new Map(); // nodeId => Array<boolean>
  }

  setNodes(nodesList = []) {
    this.nodes = nodesList;
    this.nodePatterns.clear();
    nodesList.forEach((node) => {
      // Keep density sparse (1-2 beats) across larger 16-32 step cycles for rare, solemn bell tolls
      const rawK = node.stateVector?.euclideanDensity || 1;
      const k = Math.max(1, Math.min(rawK, 2));
      const n = Math.max(node.stateVector?.euclideanSteps || 16, 16);
      this.nodePatterns.set(node.nodeId, generateEuclideanPattern(k, n));
    });
  }

  setSomaticCoords(coords) {
    this.somaticCoords = coords;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.stepIndex = 0;

    // Rhythm step interval (1250 ms slow clock for spacious, rare bell tolls)
    const stepIntervalMs = 1250;
    this.timerId = setInterval(() => this.tick(), stepIntervalMs);
    console.log('[NodeSequencer] Spatial rhythm sequencer started (Rare Solemn Rhythm Mode).');
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    console.log('[NodeSequencer] Spatial rhythm sequencer stopped.');
  }

  tick() {
    if (!this.isRunning || !this.nodes || this.nodes.length === 0) return;

    const currentStep = this.stepIndex;
    this.stepIndex++;

    this.nodes.forEach((node) => {
      let pattern = this.nodePatterns.get(node.nodeId);
      if (!pattern) {
        const k = node.stateVector?.euclideanDensity || 3;
        const n = node.stateVector?.euclideanSteps || 8;
        pattern = generateEuclideanPattern(k, n);
        this.nodePatterns.set(node.nodeId, pattern);
      }

      const shouldStrike = isBeatActiveForNode(pattern, currentStep, node.scarIndex || 0);

      if (shouldStrike) {
        this.strikeNodeBell(node);
      }
    });
  }

  strikeNodeBell(node) {
    // 1. Animate visual ringing ripple on map marker
    if (this.mapView && typeof this.mapView.pulseNodeMarker === 'function') {
      this.mapView.pulseNodeMarker(node.nodeId);
    }

    // 2. Trigger audio synthesis if AudioContext is unlocked
    if (!this.audioEngine || !this.audioEngine.ctx) return;

    // Compute effective spatial audio gain & delay for listener position
    const spatialAudio = getEffectiveSpatialAudio(this.somaticCoords, node.coordinates);

    const state = node.stateVector || {};

    const params = {
      soundType: state.soundType || 'bell_sacred',
      carrierType: state.carrierType || 'sine',
      baseFrequency: state.baseFrequency || 220,
      harmonicity: state.harmonicity || 1.414,
      decay: state.decay || 1.5,
      gain: (state.gain !== undefined ? state.gain : 1.0) * spatialAudio.gain,
      fmIndex: state.fmIndex || 0.0,
      filterCutoff: state.filterCutoff || 1200.0,
      bitDepth: state.bitDepth || 16
    };

    this.audioEngine.triggerBell(params, spatialAudio.delaySeconds);
  }
}
