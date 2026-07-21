import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateReflectorPresetFromPrompt } from '../llm-membrane.js';
import { saveReflectorNode } from '../db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROMPTS_DIR = path.join(__dirname, '..', 'prompts', 'cities');

/**
 * Creates a new city in the system:
 * 1. Writes the city acoustic context prompt to server/prompts/cities/<cityKey>.txt
 * 2. Generates initial towers/reflectors for landmarks using LLM acoustic synthesis
 * 3. Persists initial nodes to the database
 */
export async function createNewCity(cityConfig) {
  const { key, name, contextText, landmarks = [] } = cityConfig;

  if (!key || !name) {
    throw new Error('City key and name are required.');
  }

  const normalizedKey = String(key).toLowerCase().trim().replace(/[\s-]/g, '_');

  // 1. Write city prompt file
  if (!fs.existsSync(PROMPTS_DIR)) {
    fs.mkdirSync(PROMPTS_DIR, { recursive: true });
  }

  const promptFilePath = path.join(PROMPTS_DIR, `${normalizedKey}.txt`);
  if (contextText) {
    fs.writeFileSync(promptFilePath, contextText.trim(), 'utf-8');
    console.log(`[CityGenerator] Created city prompt file: ${promptFilePath}`);
  }

  // 2. Generate initial nodes for city landmarks
  const createdNodes = [];
  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i];
    const intentText = lm.intentText || `${lm.name} acoustic landmark`;
    
    // Synthesize city-aligned sound parameters via LLM membrane
    const stateVector = await generateReflectorPresetFromPrompt(intentText, normalizedKey);

    const node = {
      nodeId: `tower_${normalizedKey}_${i + 1}`,
      nodeType: lm.nodeType || 'TOWER',
      city: normalizedKey,
      name: lm.name,
      coordinates: {
        lat: Number(lm.lat),
        lng: Number(lm.lng),
        alt: Number(lm.alt || 0.0)
      },
      stateVector,
      scarIndex: 0.0,
      interactionCount: 0
    };

    saveReflectorNode(node);
    createdNodes.push(node);
    console.log(`[CityGenerator] Created node "${node.name}" (${node.stateVector.soundType}, ${node.stateVector.baseFrequency}Hz)`);
  }

  return {
    cityKey: normalizedKey,
    cityName: name,
    promptFile: promptFilePath,
    nodeCount: createdNodes.length,
    nodes: createdNodes
  };
}
