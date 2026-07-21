import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateSynthPreset } from './utils/immunological-parser.js';
import { callLLMCompletion } from './services/llm-provider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROMPT_PATH = path.join(__dirname, 'prompts', 'reflector_preset_system.txt');
const CITIES_DIR = path.join(__dirname, 'prompts', 'cities');

export function getCityAcousticContext(cityName = 'ouro_preto') {
  const key = String(cityName).toLowerCase().trim().replace(/[\s-]/g, '_');
  const cityPath = path.join(CITIES_DIR, `${key}.txt`);
  const defaultPath = path.join(CITIES_DIR, 'default.txt');

  if (fs.existsSync(cityPath)) {
    return fs.readFileSync(cityPath, 'utf-8').trim();
  }
  if (fs.existsSync(defaultPath)) {
    return fs.readFileSync(defaultPath, 'utf-8').trim();
  }
  return `${cityName}: Unique urban acoustic landscape with mixed industrial, atmospheric, and architectural reverberations.`;
}

export async function generateReflectorPresetFromPrompt(userIntentText = '', cityName = 'ouro_preto') {
  // Read system prompt template
  let systemPrompt = '';
  if (fs.existsSync(PROMPT_PATH)) {
    systemPrompt = fs.readFileSync(PROMPT_PATH, 'utf-8');
  }

  const contextText = getCityAcousticContext(cityName);
  systemPrompt = systemPrompt
    .replace('{{CITY_NAME}}', cityName || 'Ouro Preto')
    .replace('{{CITY_CONTEXT}}', contextText);

  // Attempt live LLM completion (DeepSeek or OpenRouter API)
  const llmPreset = await callLLMCompletion(systemPrompt, userIntentText || 'Somatic memory deposit');

  if (llmPreset) {
    console.log('[LLM-Membrane] LLM generated preset:', llmPreset);
    // Enforce immunological validation guardrails
    return validateSynthPreset(llmPreset);
  }

  // Fallback: Deterministic parameter derivation if LLM is offline or no API key is provided
  const hash = simpleHash(userIntentText || 'soapstone drone');
  const lowerIntent = String(userIntentText).toLowerCase();

  let soundType = 'bell_sacred';
  let fmIndex = 0.0;
  let bitDepth = 16;
  let filterCutoff = 1200.0;

  if (lowerIntent.includes('mine') || lowerIntent.includes('metal') || lowerIntent.includes('iron') || lowerIntent.includes('pickaxe')) {
    soundType = 'industrial';
    fmIndex = 3.5 + (hash % 4);
    filterCutoff = 2200.0;
  } else if (lowerIntent.includes('mist') || lowerIntent.includes('fog') || lowerIntent.includes('drone') || lowerIntent.includes('deep')) {
    soundType = 'drone';
    filterCutoff = 600.0;
  } else if (lowerIntent.includes('glitch') || lowerIntent.includes('error') || lowerIntent.includes('broken') || lowerIntent.includes('signal')) {
    soundType = 'glitch';
    bitDepth = 4 + (hash % 5);
  }

  const rawGenerated = {
    soundType,
    carrierType: hash % 2 === 0 ? 'sine' : 'triangle',
    baseFrequency: soundType === 'drone' ? 65.0 + (hash % 55) : 110.0 + (hash % 330),
    harmonicity: 1.0 + ((hash % 30) / 10.0),
    decay: soundType === 'drone' ? 6.0 + ((hash % 80) / 10.0) : 1.0 + ((hash % 40) / 10.0),
    gain: 0.7 + ((hash % 3) / 10.0),
    euclideanDensity: 1 + (hash % 3),
    echoProbability: 0.7,
    fmIndex,
    filterCutoff,
    bitDepth
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
