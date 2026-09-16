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
  const { key, name, contextText, landmarks = [] } = cityConfig || {};

  if (!key || !name) {
    throw new Error('City key and name are required.');
  }

  // Strict slug validation: lowercase alphanumeric and underscore only, 2-32 chars
  const rawKey = String(key).trim().toLowerCase();

  if (!/^[a-z0-9_]{2,32}$/.test(rawKey)) {
    throw new Error('Invalid city key format. Must be 2-32 lowercase alphanumeric or underscore characters (no spaces or slashes).');
  }

  const normalizedKey = rawKey;

  // Prevent path traversal, null bytes, and Windows reserved device names
  const reservedWindowsNames = ['con', 'prn', 'aux', 'nul', 'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9', 'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'];
  if (reservedWindowsNames.includes(normalizedKey)) {
    throw new Error('City key cannot be a reserved device name.');
  }

  if (normalizedKey.includes('..') || normalizedKey.includes('/') || normalizedKey.includes('\\') || normalizedKey.includes('\0')) {
    throw new Error('Path traversal sequence detected in city key.');
  }

  // Prevent dangerous or executable extensions
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js', '.mjs', '.html', '.htm', '.wasm', '.dll', '.so', '.jar'];
  if (dangerousExtensions.some(ext => normalizedKey.endsWith(ext))) {
    throw new Error('Executable or dangerous file extension detected in city key.');
  }

  // Limit landmarks array to prevent denial of service and LLM exhaustion
  if (!Array.isArray(landmarks) || landmarks.length > 25) {
    throw new Error('Landmarks must be an array with at most 25 items.');
  }

  // Clamp context text length to 5000 characters
  const safeContext = typeof contextText === 'string' ? contextText.trim().slice(0, 5000) : '';

  // 1. Write city prompt file safely inside PROMPTS_DIR
  if (!fs.existsSync(PROMPTS_DIR)) {
    fs.mkdirSync(PROMPTS_DIR, { recursive: true });
  }

  const promptFilePath = path.join(PROMPTS_DIR, `${normalizedKey}.txt`);
  const resolvedTarget = path.resolve(promptFilePath);
  const resolvedBase = path.resolve(PROMPTS_DIR);

  if (!resolvedTarget.startsWith(resolvedBase + path.sep)) {
    throw new Error('Security Violation: Target prompt path escapes prompts directory.');
  }

  if (safeContext) {
    fs.writeFileSync(promptFilePath, safeContext, 'utf-8');
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
