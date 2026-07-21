import express from 'express';
import http from 'http';
import https from 'https';
import path from 'path';
import fs from 'fs';
import os from 'os';
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

// Active connected somatic nodes state map: somaticId => { id, ws, coordinates, batteryLevel, lastUpdated }
const somaticNodesMap = new Map();

// API Routes
app.get('/api/cities', (req, res) => {
  return res.json({ cities: Object.values(CONFIG.CITIES) });
});

app.get('/api/nodes', (req, res) => {
  const city = req.query.city || CONFIG.DEFAULT_CITY;
  const nodes = getAllNodes(city);
  return res.json({ mode: 'LIVING', debugMode: CONFIG.DEBUG, showUsers: CONFIG.SHOW_USERS, city, nodes });
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

    saveReflectorNode(newNode);

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

// SPA fallback for city routes (e.g. /chicago, /ouro_preto)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.includes('.')) {
    return next();
  }
  return res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
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
      twinMode: 'LIVING',
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
function getNetworkIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses;
}

const HTTPS_PORT = Number(process.env.HTTPS_PORT) || 3443;
const PFX_PATH = path.join(__dirname, '..', 'certs', 'server.pfx');
let httpsServer = null;

if (fs.existsSync(PFX_PATH)) {
  try {
    const pfxBuffer = fs.readFileSync(PFX_PATH);
    httpsServer = https.createServer({ pfx: pfxBuffer, passphrase: 'scarred' }, app);
    const wssHttps = new WebSocketServer({ server: httpsServer });
    wssHttps.on('connection', (ws) => {
      // Reuse same websocket connection handler logic
      wss.emit('connection', ws);
    });
    httpsServer.listen(HTTPS_PORT, CONFIG.HOST, () => {
      // Started HTTPS listener
    });
  } catch (err) {
    console.warn('[HTTPS] Could not start HTTPS server:', err.message);
  }
}

server.listen(CONFIG.PORT, CONFIG.HOST, () => {
  const lanIps = getNetworkIPs();
  console.log(`=======================================================`);
  console.log(` Sino Cicatrizado (The Scarred Bell) Server Running`);
  console.log(` Local HTTP:    http://localhost:${CONFIG.PORT}`);
  lanIps.forEach(ip => {
    console.log(` Network HTTP:  http://${ip}:${CONFIG.PORT} (Interactive Tap Mode)`);
  });
  if (httpsServer) {
    console.log(` -----------------------------------------------------`);
    console.log(` Local HTTPS:   https://localhost:${HTTPS_PORT}`);
    lanIps.forEach(ip => {
      console.log(` Network HTTPS: https://${ip}:${HTTPS_PORT} (Real Hardware GPS Mode)`);
    });
  }
  console.log(` Environment: Node.js / SQLite WAL / WSS Port ${CONFIG.PORT}`);
  console.log(` Broadcast Loop: ${CONFIG.BROADCAST_RATE_HZ} Hz (${loopIntervalMs} ms)`);
  console.log(` Debug Mode: ${CONFIG.DEBUG} | Show Users: ${CONFIG.SHOW_USERS} | Virtual Users: ${CONFIG.VIRTUAL_USERS_COUNT}`);
  console.log(`=======================================================`);
});
