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
  // Read complete standalone city system prompt directly from prompts/cities/<cityName>.txt
  const systemPrompt = getCityAcousticContext(cityName);

  // Attempt live LLM completion (DeepSeek or OpenRouter API)
  const llmPreset = await callLLMCompletion(systemPrompt, userIntentText || 'Somatic memory deposit');

  if (llmPreset) {
    console.log('[LLM-Membrane] LLM generated preset:', llmPreset);
    // Enforce immunological validation guardrails
    return validateSynthPreset(llmPreset);
  }

  // Fallback: City-adapted deterministic parameter derivation if LLM is offline or no API key is provided
  const cityKey = String(cityName).toLowerCase().trim();
  const hash = simpleHash(`${cityKey}_${userIntentText || 'reflection'}`);
  const lowerIntent = String(userIntentText).toLowerCase();

  let soundType = 'bell_sacred';
  let carrierType = hash % 2 === 0 ? 'sine' : 'triangle';
  let baseFrequency = 220.0;
  let harmonicity = 1.414;
  let decay = 4.0;
  let fmIndex = 0.0;
  let bitDepth = 16;
  let filterCutoff = 1800.0;

  if (cityKey === 'shanghai') {
    // Shanghai Acoustic Archetypes: River Ferries, Temple Gongs, Maglev Glides, Megatowers
    if (lowerIntent.includes('maglev') || lowerIntent.includes('train') || lowerIntent.includes('speed') || lowerIntent.includes('fast') || lowerIntent.includes('metro')) {
      soundType = 'industrial';
      carrierType = 'sawtooth';
      baseFrequency = 350.0 + (hash % 300); // High-frequency electromagnetic FM sweep
      fmIndex = 5.0 + (hash % 4);
      filterCutoff = 3200.0;
    } else if (lowerIntent.includes('river') || lowerIntent.includes('ferry') || lowerIntent.includes('boat') || lowerIntent.includes('water') || lowerIntent.includes('horn')) {
      soundType = 'drone';
      carrierType = 'sine';
      baseFrequency = 75.0 + (hash % 35); // 75-110 Hz deep river vessel sub-bass
      decay = 8.0 + ((hash % 40) / 10.0);
      filterCutoff = 450.0;
    } else if (lowerIntent.includes('cyber') || lowerIntent.includes('tower') || lowerIntent.includes('light') || lowerIntent.includes('glitch') || lowerIntent.includes('digital')) {
      soundType = 'glitch';
      baseFrequency = 440.0 + (hash % 440);
      bitDepth = 6 + (hash % 6);
      filterCutoff = 2800.0;
    } else {
      // Default Shanghai: Bund Clock & Temple Gong
      soundType = 'bell_sacred';
      baseFrequency = 180.0 + (hash % 160); // 180-340 Hz temple gong fundamental
      harmonicity = 1.618;
      decay = 5.0 + ((hash % 30) / 10.0);
      filterCutoff = 1600.0;
    }
  } else if (cityKey === 'chicago') {
    // Chicago Acoustic Archetypes: Steel Bridges, Elevated L-Train, Lake Wind Drone
    if (lowerIntent.includes('train') || lowerIntent.includes('bridge') || lowerIntent.includes('steel') || lowerIntent.includes('iron') || lowerIntent.includes('rail')) {
      soundType = 'industrial';
      baseFrequency = 220.0 + (hash % 220);
      fmIndex = 4.0 + (hash % 4);
      filterCutoff = 2600.0;
    } else if (lowerIntent.includes('wind') || lowerIntent.includes('lake') || lowerIntent.includes('cold') || lowerIntent.includes('mist')) {
      soundType = 'drone';
      baseFrequency = 85.0 + (hash % 40);
      decay = 6.5 + ((hash % 50) / 10.0);
      filterCutoff = 800.0;
    } else {
      soundType = 'bell_deep';
      baseFrequency = 146.8 + (hash % 100);
      filterCutoff = 1400.0;
    }
  } else {
    // Ouro Preto & Default Colonial Archetypes: Soapstone Drone, Mine Strikes, Baroque Church Bells
    if (lowerIntent.includes('mine') || lowerIntent.includes('metal') || lowerIntent.includes('iron') || lowerIntent.includes('pickaxe')) {
      soundType = 'industrial';
      fmIndex = 3.5 + (hash % 4);
      filterCutoff = 2200.0;
    } else if (lowerIntent.includes('mist') || lowerIntent.includes('fog') || lowerIntent.includes('drone') || lowerIntent.includes('deep')) {
      soundType = 'drone';
      baseFrequency = 65.0 + (hash % 55);
      decay = 6.0 + ((hash % 80) / 10.0);
      filterCutoff = 600.0;
    } else if (lowerIntent.includes('glitch') || lowerIntent.includes('error') || lowerIntent.includes('broken')) {
      soundType = 'glitch';
      bitDepth = 4 + (hash % 5);
    }
  }

  const rawGenerated = {
    soundType,
    carrierType,
    baseFrequency,
    harmonicity,
    decay,
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
