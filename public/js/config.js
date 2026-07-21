export const CLIENT_CONFIG = {
  SPEED_OF_SOUND_MPS: 343.0,
  EARTH_RADIUS_M: 6371e3,
  ATTENUATION_REFERENCE_DISTANCE_M: 100.0,
  DENSITY_RADIUS_M: 50.0,
  POSITION_DELTA_THRESHOLD_M: 5.0,
  TRANSMIT_INTERVAL_MS: 250, // 4 Hz maximum update frequency
  AUDIO: {
    EXPONENTIAL_RAMP_DURATION_S: 2.5,
    ATTACK_TIME_S: 0.05,
    INHARMONIC_PARTIALS: [1.0, 1.21, 1.47, 1.94, 2.52],
    DEFAULT_FREQUENCY_HZ: 220.0
  },
  DEFAULT_SOAPSTONE_PRESET: {
    carrierType: 'sine',
    baseFrequency: 220.0,
    harmonicity: 1.414,
    decay: 1.5,
    gain: 1.0,
    euclideanDensity: 3
  },
  OURO_PRETO_CENTER: {
    lat: -20.3856,
    lng: -43.5035,
    zoom: 16
  }
};
