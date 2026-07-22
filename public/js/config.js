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
      languages: ['en', 'pt'],
      defaultLang: 'en',
      tileProvider: 'carto',
      useGcj02: false,
      maxDistanceMeters: 500,     // 500m max trigger radius for dense mountain town
      scarRadiusMeters: 50,       // 10% of max distance (50m scar mutation radius)
      center: { lat: -20.3856, lng: -43.5035, zoom: 16 },
      description: 'Colonial soapstone bells & baroque valley echoes'
    },
    chicago: {
      key: 'chicago',
      name: 'Chicago',
      country: 'USA',
      languages: ['en', 'es'],
      defaultLang: 'en',
      tileProvider: 'carto',
      useGcj02: false,
      maxDistanceMeters: 2000,    // 2 km max trigger radius for metropolitan grid
      scarRadiusMeters: 150,      // ~7.5% of max distance (150m scar mutation radius)
      center: { lat: 41.8818, lng: -87.6231, zoom: 14 },
      description: 'Windy lakefront, steel bridges & industrial L-train resonance'
    },
    shanghai: {
      key: 'shanghai',
      name: 'Shanghai',
      country: 'China',
      languages: ['en', 'cn'],
      defaultLang: 'en',
      tileProvider: 'autonavi',
      useGcj02: true,
      maxDistanceMeters: 2000,    // 2 km max trigger radius
      scarRadiusMeters: 150,      // ~7.5% of max distance (150m scar mutation radius)
      center: { lat: 31.2304, lng: 121.4737, zoom: 14 },
      description: 'Huangpu River ferries, Bund custom clock, temple gongs & Maglev resonance'
    },
    shanghai_noise: {
      key: 'shanghai_noise',
      name: 'SH Noise',
      country: 'China',
      languages: ['en', 'cn'],
      defaultLang: 'en',
      tileProvider: 'autonavi',
      useGcj02: true,
      maxDistanceMeters: 1500,    // 1.5 km max trigger radius
      scarRadiusMeters: 100,      // ~6.7% of max distance (100m scar mutation radius)
      center: { lat: 31.2290, lng: 121.4420, zoom: 14 },
      description: 'Underground noise clubs, circuit bends, digital glitches & harsh industrial feedback'
    },
    montreal: {
      key: 'montreal',
      name: 'Montreal',
      country: 'Canada',
      languages: ['en', 'fr'],
      defaultLang: 'en',
      tileProvider: 'carto',
      useGcj02: false,
      maxDistanceMeters: 1800,    // 1.8 km max trigger radius
      scarRadiusMeters: 120,      // ~6.7% of max distance (120m scar mutation radius)
      center: { lat: 45.5017, lng: -73.5673, zoom: 14 },
      description: 'Mount Royal steeples, Saint Lawrence port reverberations & underground city acoustic reflections'
    }
  },

  OURO_PRETO_CENTER: {
    lat: -20.3856,
    lng: -43.5035,
    zoom: 16
  }
};

