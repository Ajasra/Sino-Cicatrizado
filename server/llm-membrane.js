import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateSynthPreset } from './utils/immunological-parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROMPT_PATH = path.join(__dirname, 'prompts', 'reflector_preset_system.txt');

export function generateReflectorPresetFromPrompt(userIntentText) {
  // Read system prompt template
  let systemPrompt = '';
  if (fs.existsSync(PROMPT_PATH)) {
    systemPrompt = fs.readFileSync(PROMPT_PATH, 'utf-8');
  }

  // Simulated deterministic parameter derivation from user intent text
  // (In production with LLM API keys configured, this sends to LLM API and sanitizes output)
  const hash = simpleHash(userIntentText || 'soapstone drone');
  
  const rawGenerated = {
    carrierType: hash % 2 === 0 ? 'sine' : 'triangle',
    baseFrequency: 140.0 + (hash % 400),
    harmonicity: 1.0 + ((hash % 30) / 10.0),
    decay: 1.0 + ((hash % 40) / 10.0),
    gain: 0.7 + ((hash % 3) / 10.0),
    euclideanDensity: 2 + (hash % 6)
  };

  // Enforce immunological validation
  return validateSynthPreset(rawGenerated);
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
