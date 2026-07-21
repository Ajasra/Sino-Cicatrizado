import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { CONFIG } from './config.js';
import { getAllNodes, saveReflectorNode, getDatabaseConnection } from './db/database.js';
import { evaluateSomaticProximity } from './services/hysteresis.js';
import { generateReflectorPresetFromPrompt } from './llm-membrane.js';
import { validateSynthPreset } from './utils/immunological-parser.js';
import { initVirtualUsers } from './services/virtual-users.js';
import { createNewCity } from './services/city-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const app = express();
app.use(express.json());

// Disable JS caching so browser always fetches fresh modules
app.use((req, res, next) => {
  if (req.path.endsWith('.js')) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});

app.use(express.static(PUBLIC_DIR));

// Dual-Twin Database mode: 'LIVING' or 'TWIN'
let activeTwinMode = 'LIVING';

// Active connected somatic nodes state map: somaticId => { id, ws, coordinates, batteryLevel, lastUpdated }
const somaticNodesMap = new Map();

// API Routes
app.get('/api/nodes', (req, res) => {
  if (activeTwinMode === 'TWIN' && fs.existsSync(CONFIG.TWIN_SNAPSHOT_PATH)) {
    const raw = fs.readFileSync(CONFIG.TWIN_SNAPSHOT_PATH, 'utf-8');
    return res.json({ mode: 'TWIN', debugMode: CONFIG.DEBUG, showUsers: CONFIG.SHOW_USERS, nodes: JSON.parse(raw) });
  }

  const nodes = getAllNodes(CONFIG.DEFAULT_CITY);
  return res.json({ mode: activeTwinMode, debugMode: CONFIG.DEBUG, showUsers: CONFIG.SHOW_USERS, nodes });
});

app.post('/api/reflectors', async (req, res) => {
  try {
    const { coordinates, intentText, name, city } = req.body;
    if (!coordinates || coordinates.lat === undefined || coordinates.lng === undefined) {
      return res.status(400).json({ error: 'Coordinates lat and lng are required.' });
    }

    const targetCity = city || CONFIG.DEFAULT_CITY;
    const preset = await generateReflectorPresetFromPrompt(intentText || '', targetCity);
    const newNode = {
      nodeId: `reflector_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      nodeType: 'REFLECTOR',
      city: targetCity,
      name: name || `Reflector: "${intentText || 'Somatic Trace'}"`,
      coordinates: {
        lat: Number(coordinates.lat),
        lng: Number(coordinates.lng),
        alt: Number(coordinates.alt || 0.0)
      },
      stateVector: preset,
      scarIndex: 0.0,
      interactionCount: 0
    };

    if (activeTwinMode === 'LIVING') {
      saveReflectorNode(newNode);
    }

    // Broadcast new reflector creation to all clients over WebSocket
    broadcastMessage({
      type: 'REFLECTOR_CREATED',
      payload: newNode,
      timestamp: Date.now()
    });

    return res.status(201).json({ success: true, node: newNode });
  } catch (err) {
    console.error('[API] Error creating reflector:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/cities/create', async (req, res) => {
  try {
    const { key, name, contextText, landmarks } = req.body;
    const result = await createNewCity({ key, name, contextText, landmarks });
    return res.status(201).json({ success: true, city: result });
  } catch (err) {
    console.error('[API] Error creating new city:', err);
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/twin/toggle', (req, res) => {
  const { mode } = req.body;
  if (mode === 'LIVING' || mode === 'TWIN') {
    activeTwinMode = mode;
    console.log(`[SYSTEM] Dual-Twin mode switched to: ${activeTwinMode}`);

    broadcastMessage({
      type: 'TWIN_MODE_CHANGED',
      payload: { mode: activeTwinMode },
      timestamp: Date.now()
    });

    return res.json({ success: true, mode: activeTwinMode });
  }
  return res.status(400).json({ error: 'Mode must be LIVING or TWIN' });
});

// Initialize HTTP & WebSocket Server
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  const clientSomaticId = `soma_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  console.log(`[WS] Somatic Node connected: ${clientSomaticId}`);

  somaticNodesMap.set(clientSomaticId, {
    somaticId: clientSomaticId,
    ws,
    coordinates: null,
    batteryLevel: 1.0,
    lastUpdated: Date.now()
  });

  // Send initial session handshake
  ws.send(JSON.stringify({
    type: 'SESSION_INIT',
    payload: {
      somaticId: clientSomaticId,
      twinMode: activeTwinMode,
      debugMode: CONFIG.DEBUG,
      showUsers: CONFIG.SHOW_USERS,
      config: {
        broadcastRateHz: CONFIG.BROADCAST_RATE_HZ,
        proximityThresholdM: CONFIG.PROXIMITY_MUTATION_THRESHOLD_M
      }
    },
    timestamp: Date.now()
  }));

  ws.on('message', (messageRaw) => {
    try {
      const msg = JSON.parse(messageRaw.toString());
      handleClientMessage(clientSomaticId, msg);
    } catch (err) {
      console.warn(`[WS] Malformed frame from ${clientSomaticId}:`, err.message);
    }
  });

  ws.on('close', () => {
    console.log(`[WS] Somatic Node disconnected: ${clientSomaticId}`);
    somaticNodesMap.delete(clientSomaticId);
    broadcastMessage({
      type: 'SOMATIC_DISCONNECTED',
      payload: { somaticId: clientSomaticId },
      timestamp: Date.now()
    });
  });
});

function handleClientMessage(somaticId, msg) {
  const node = somaticNodesMap.get(somaticId);
  if (!node) return;

  switch (msg.type) {
    case 'SOMATIC_POSITION_UPDATE': {
      const { coordinates, batteryLevel } = msg.payload || {};
      if (coordinates && coordinates.lat !== undefined && coordinates.lng !== undefined) {
        node.coordinates = {
          lat: Number(coordinates.lat),
          lng: Number(coordinates.lng),
          alt: Number(coordinates.alt || 0.0)
        };
        if (batteryLevel !== undefined) {
          node.batteryLevel = Number(batteryLevel);
        }
        node.lastUpdated = Date.now();
      }
      break;
    }

    case 'SOMATIC_CHIRP': {
      // Broadcast active echolocation strike pulse to all connected clients
      broadcastMessage({
        type: 'SOMATIC_CHIRP_BROADCAST',
        payload: {
          somaticId,
          coordinates: msg.payload?.coordinates || node.coordinates,
          frequency: msg.payload?.chirpFrequency || 440.0
        },
        timestamp: Date.now()
      });
      break;
    }

    default:
      break;
  }
}

function broadcastMessage(dataObj) {
  const jsonStr = JSON.stringify(dataObj);
  for (const [, client] of somaticNodesMap) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(jsonStr);
    }
  }
}

// 4 Hz Broadcast & Proximity Hysteresis Evaluation Loop (250 ms interval)
const loopIntervalMs = Math.round(1000 / CONFIG.BROADCAST_RATE_HZ);
setInterval(() => {
  if (activeTwinMode !== 'LIVING') return; // Do not mutate in read-only Scarred Twin mode

  const allDbNodes = getAllNodes(CONFIG.DEFAULT_CITY);

  // Collect somatic positions for frame broadcast
  const somaticList = [];
  for (const [id, soma] of somaticNodesMap) {
    if (soma.coordinates) {
      somaticList.push({
        somaticId: id,
        coordinates: soma.coordinates,
        batteryLevel: soma.batteryLevel
      });

      // Evaluate hysteretic mutations against active towers & reflectors
      for (const dbNode of allDbNodes) {
        const mutationResult = evaluateSomaticProximity(soma.coordinates, dbNode);
        if (mutationResult) {
          // Broadcast scar mutation to all clients
          broadcastMessage({
            type: 'NODE_MUTATED',
            payload: {
              nodeId: mutationResult.nodeId,
              scarIncrement: mutationResult.scarIncrement,
              updatedState: mutationResult.mutatedStateVector,
              distanceMeters: mutationResult.distanceMeters,
              triggeredBySomaticId: id
            },
            timestamp: Date.now()
          });
        }
      }
    }
  }

  // Broadcast current somatic positions snapshot frame
  if (somaticList.length > 0) {
    broadcastMessage({
      type: 'SOMATIC_FRAME_UPDATE',
      payload: { somaticNodes: somaticList },
      timestamp: Date.now()
    });
  }
}, loopIntervalMs);

// Start Server
getDatabaseConnection(); // Initialize database schema & seed data
if (CONFIG.DEBUG) {
  initVirtualUsers(somaticNodesMap, broadcastMessage);
}
server.listen(CONFIG.PORT, CONFIG.HOST, () => {
  console.log(`=======================================================`);
  console.log(` Sino Cicatrizado (The Scarred Bell) Server Running `);
  console.log(` URL: http://localhost:${CONFIG.PORT}`);
  console.log(` Environment: Node.js / SQLite WAL / WSS Port ${CONFIG.PORT}`);
  console.log(` Broadcast Loop: ${CONFIG.BROADCAST_RATE_HZ} Hz (${loopIntervalMs} ms)`);
  console.log(` Debug Mode: ${CONFIG.DEBUG} | Show Users: ${CONFIG.SHOW_USERS} | Virtual Users: ${CONFIG.VIRTUAL_USERS_COUNT}`);
  console.log(`=======================================================`);
});
