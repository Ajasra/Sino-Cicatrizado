import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

export const CONFIG = {
  PORT: process.env.PORT || 3000,
  HOST: process.env.HOST || '0.0.0.0',
  DB_PATH: process.env.DB_PATH || path.join(ROOT_DIR, 'data', 'scarred_bell.db'),
  TWIN_SNAPSHOT_PATH: path.join(ROOT_DIR, 'data', 'scarred_twin.json'),
  BROADCAST_RATE_HZ: Number(process.env.BROADCAST_RATE_HZ) || 4,
  PROXIMITY_MUTATION_THRESHOLD_M: Number(process.env.PROXIMITY_MUTATION_THRESHOLD_M) || 15.0,
  DEFAULT_CITY: process.env.DEFAULT_CITY || 'ouro_preto',
  SCAR_COEFFICIENT_ALPHA: 0.05,
  SPATIAL_DECAY_LAMBDA: 0.15,
  PARAMETER_BOUNDS: {
    baseFrequency: { min: 80.0, max: 880.0, limit: 880.0 },
    harmonicity: { min: 0.5, max: 4.0, limit: 4.0 },
    decay: { min: 0.1, max: 6.0, limit: 6.0 },
    gain: { min: 0.0, max: 1.0, limit: 1.0 },
    euclideanDensity: { min: 1, max: 16, limit: 16 }
  }
};
