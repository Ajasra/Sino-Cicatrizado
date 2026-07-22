import { generateEuclideanPattern, isBeatActiveForNode } from './euclidean.js';
import { getEffectiveSpatialAudio, getNearestNodes } from '../spatial.js';
import { CLIENT_CONFIG } from '../config.js';

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

    // Polyphony & CPU Protection: Cap active audio evaluation to N=100 closest nodes
    const activeEvaluatedNodes = getNearestNodes(this.somaticCoords, this.nodes, 100);

    activeEvaluatedNodes.forEach((node) => {
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

  setActiveCityConfig(cityConfig) {
    this.activeCityConfig = cityConfig;
  }

  strikeNodeBell(node) {
    if (!this.somaticCoords) return;

    const maxTriggerDist = this.activeCityConfig?.maxDistanceMeters || CLIENT_CONFIG.SOUND_TRIGGER_RADIUS_M || 1500.0;
    // Compute effective spatial audio gain & delay for listener position
    const spatialAudio = getEffectiveSpatialAudio(this.somaticCoords, node.coordinates, null, maxTriggerDist);

    // Proximity gate: only trigger nodes within city maxDistanceMeters
    if (spatialAudio.distanceMeters > maxTriggerDist) {
      return; // Listener is too far from this node — stay silent
    }

    // 1. Animate visual ringing ripple on map marker
    if (this.mapView && typeof this.mapView.pulseNodeMarker === 'function') {
      this.mapView.pulseNodeMarker(node.nodeId);
    }

    // 2. Trigger audio synthesis if AudioContext is unlocked
    if (!this.audioEngine || !this.audioEngine.ctx) return;

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
      filterType: state.filterType || 'lowpass',
      delayTimeMs: state.delayTimeMs !== undefined ? state.delayTimeMs : 250.0,
      feedbackRatio: state.feedbackRatio !== undefined ? state.feedbackRatio : 0.3,
      combResonance: state.combResonance !== undefined ? state.combResonance : 0.0,
      bitDepth: state.bitDepth || 16,
      scarIndex: node.scarIndex || 0.0
    };

    this.audioEngine.triggerBell(params, spatialAudio.delaySeconds);
  }
}
