import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

export const CITIES = {
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
  },
  shanghai: {
    key: 'shanghai',
    name: 'Shanghai',
    country: 'China',
    center: { lat: 31.2304, lng: 121.4737, zoom: 14 },
    description: 'Huangpu River ferries, Bund custom clock, temple gongs & Maglev resonance'
  },
  shanghai_noise: {
    key: 'shanghai_noise',
    name: 'SH Noise',
    country: 'China',
    center: { lat: 31.2290, lng: 121.4420, zoom: 14 },
    description: 'Underground noise clubs, circuit bends, digital glitches & harsh industrial feedback'
  }
};


export const CONFIG = {
  DEBUG: process.env.DEBUG === 'true' || process.env.DEBUG === '1',
  PORT: process.env.PORT || 3000,
  HOST: process.env.HOST || '0.0.0.0',
  DB_PATH: process.env.DB_PATH || path.join(ROOT_DIR, 'data', 'scarred_bell.db'),
  TWIN_SNAPSHOT_PATH: path.join(ROOT_DIR, 'data', 'scarred_twin.json'),
  BROADCAST_RATE_HZ: Number(process.env.BROADCAST_RATE_HZ) || 4,
  PROXIMITY_MUTATION_THRESHOLD_M: Number(process.env.PROXIMITY_MUTATION_THRESHOLD_M) || 15.0,
  DEFAULT_CITY: process.env.DEFAULT_CITY || 'ouro_preto',
  CITIES,
  VIRTUAL_USERS_COUNT: process.env.VIRTUAL_USERS_COUNT != null ? Number(process.env.VIRTUAL_USERS_COUNT) : 5,
  SHOW_USERS: process.env.SHOW_USERS !== 'false' && process.env.SHOW_USERS !== '0',
  SCAR_COEFFICIENT_ALPHA: Number(process.env.SCAR_COEFFICIENT_ALPHA) || 0.00002,
  SPATIAL_DECAY_LAMBDA: 0.15,
  CROWD_DAMPING_FACTOR: 0.3,
  PARAMETER_BOUNDS: {
    baseFrequency: { min: 55.0, max: 880.0, limit: 880.0 },
    harmonicity: { min: 0.5, max: 4.0, limit: 4.0 },
    decay: { min: 0.1, max: 15.0, limit: 15.0 },
    gain: { min: 0.0, max: 1.0, limit: 1.0 },
    euclideanDensity: { min: 1, max: 3, limit: 3 },
    echoProbability: { min: 0.1, max: 0.9, limit: 0.9 },
    fmIndex: { min: 0.0, max: 10.0, limit: 10.0 },
    filterCutoff: { min: 100.0, max: 5000.0, limit: 5000.0 },
    bitDepth: { min: 2, max: 16, limit: 16 }
  },
  LLM: {
    PROVIDER: (process.env.LLM_PROVIDER || 'deepseek').toLowerCase(),
    MODEL: process.env.LLM_MODEL || 'deepseek-chat',
    FALLBACK_MODEL: process.env.LLM_FALLBACK_MODEL || 'deepseek-coder',
    THINKING_LEVEL: (process.env.LLM_THINKING_LEVEL || 'none').toLowerCase(),
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '',
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || ''
  }
};

