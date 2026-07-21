export const CLIENT_CONFIG = {
  SPEED_OF_SOUND_MPS: 343.0,
  EARTH_RADIUS_M: 6371e3,
  ATTENUATION_REFERENCE_DISTANCE_M: 100.0,
  DENSITY_RADIUS_M: 50.0,
  POSITION_DELTA_THRESHOLD_M: 5.0,
  TRANSMIT_INTERVAL_MS: 250, // 4 Hz maximum update frequency
  SOUND_TRIGGER_RADIUS_M: 1500.0, // Only trigger node sounds when within this distance (meters)
  AUDIO: {
    EXPONENTIAL_RAMP_DURATION_S: 2.5,
    ATTACK_TIME_S: 0.05,
    INHARMONIC_PARTIALS: [1.0, 1.21, 1.47, 1.94, 2.52],
    DEEP_BELL_PARTIALS: [0.5, 1.0, 1.004, 1.414, 2.76],
    DEFAULT_FREQUENCY_HZ: 220.0
  },
  PRESETS: {
    bell_deep: {
      soundType: 'bell_deep',
      carrierType: 'sine',
      baseFrequency: 110.0,
      harmonicity: 1.414,
      decay: 6.0,
      gain: 1.0,
      filterCutoff: 800.0
    },
    bell_sacred: {
      soundType: 'bell_sacred',
      carrierType: 'sine',
      baseFrequency: 220.0,
      harmonicity: 1.414,
      decay: 2.0,
      gain: 1.0,
      filterCutoff: 1200.0
    },
    drone: {
      soundType: 'drone',
      carrierType: 'sawtooth',
      baseFrequency: 65.0,
      harmonicity: 1.0,
      decay: 8.0,
      gain: 0.8,
      filterCutoff: 500.0
    },
    industrial: {
      soundType: 'industrial',
      carrierType: 'sawtooth',
      baseFrequency: 140.0,
      harmonicity: 2.71,
      decay: 1.2,
      gain: 0.9,
      fmIndex: 4.5,
      filterCutoff: 2500.0
    },
    glitch: {
      soundType: 'glitch',
      carrierType: 'triangle',
      baseFrequency: 330.0,
      harmonicity: 3.14,
      decay: 0.4,
      gain: 0.9,
      bitDepth: 4,
      filterCutoff: 4000.0
    }
  },
  DEFAULT_SOAPSTONE_PRESET: {
    soundType: 'bell_sacred',
    carrierType: 'sine',
    baseFrequency: 220.0,
    harmonicity: 1.414,
    decay: 1.5,
    gain: 1.0,
    euclideanDensity: 3,
    fmIndex: 0.0,
    filterCutoff: 1200.0,
    bitDepth: 16
  },
  DEFAULT_CITY: 'ouro_preto',
  CITIES: {
    ouro_preto: {
      key: 'ouro_preto',
      name: 'Ouro Preto',
      country: 'Brazil',
      center: { lat: -20.3856, lng: -43.5035, zoom: 16 },
      description: 'Colonial soapstone bells & baroque valley echoes'
    },
    chicago: {
      key: 'chicago',
      name: 'Chicago',
      country: 'USA',
      center: { lat: 41.8818, lng: -87.6231, zoom: 14 },
      description: 'Windy lakefront, steel bridges & industrial L-train resonance'
    }
  },
  OURO_PRETO_CENTER: {
    lat: -20.3856,
    lng: -43.5035,
    zoom: 16
  }
};

