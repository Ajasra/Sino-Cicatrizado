import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config.js';

let dbInstance = null;

export function getDatabaseConnection() {
  if (dbInstance) return dbInstance;

  // Ensure data directory exists
  const dbDir = path.dirname(CONFIG.DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Connect to SQLite local database file
  dbInstance = new Database(CONFIG.DB_PATH);

  // Enable WAL mode for high performance parallel concurrency
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('synchronous = NORMAL');

  // Initialize Database Schema
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS nodes (
      node_id TEXT PRIMARY KEY,
      node_type TEXT CHECK(node_type IN ('TOWER', 'REFLECTOR')) NOT NULL,
      city TEXT NOT NULL,
      name TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      alt REAL DEFAULT 0.0,
      base_frequency REAL NOT NULL,
      harmonicity REAL DEFAULT 1.414,
      decay REAL DEFAULT 1.5,
      gain REAL DEFAULT 1.0,
      euclidean_density INTEGER DEFAULT 3,
      euclidean_steps INTEGER DEFAULT 8,
      echo_probability REAL DEFAULT 0.7,
      sound_type TEXT DEFAULT 'bell_deep',
      fm_index REAL DEFAULT 0.0,
      filter_cutoff REAL DEFAULT 1200.0,
      bit_depth INTEGER DEFAULT 16,
      carrier_type TEXT DEFAULT 'sine',
      scar_index REAL DEFAULT 0.0,
      interaction_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Safe migrations for tables created before new columns were added
  const migrations = [
    `ALTER TABLE nodes ADD COLUMN echo_probability REAL DEFAULT 0.7;`,
    `ALTER TABLE nodes ADD COLUMN sound_type TEXT DEFAULT 'bell_deep';`,
    `ALTER TABLE nodes ADD COLUMN fm_index REAL DEFAULT 0.0;`,
    `ALTER TABLE nodes ADD COLUMN filter_cutoff REAL DEFAULT 1200.0;`,
    `ALTER TABLE nodes ADD COLUMN bit_depth INTEGER DEFAULT 16;`,
    `ALTER TABLE nodes ADD COLUMN carrier_type TEXT DEFAULT 'sine';`
  ];
  for (const sql of migrations) {
    try { dbInstance.exec(sql); } catch (e) { /* column already exists */ }
  }

  // Seed default Ouro Preto historical towers if table is empty
  seedInitialTowers(dbInstance);

  return dbInstance;
}

function seedInitialTowers(db) {
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM nodes WHERE city = ?');
  const ouroResult = countStmt.get('ouro_preto');

  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO nodes (
      node_id, node_type, city, name, lat, lng, alt,
      base_frequency, harmonicity, decay, gain, euclidean_density, euclidean_steps,
      echo_probability, sound_type, fm_index, filter_cutoff, bit_depth, carrier_type,
      scar_index, interaction_count
    ) VALUES (
      @nodeId, @nodeType, @city, @name, @lat, @lng, @alt,
      @baseFrequency, @harmonicity, @decay, @gain, @euclideanDensity, @euclideanSteps,
      @echoProbability, @soundType, @fmIndex, @filterCutoff, @bitDepth, @carrierType,
      @scarIndex, @interactionCount
    )
  `);

  const insertMany = db.transaction((nodes) => {
    for (const node of nodes) {
      const sv = node.stateVector;
      insertStmt.run({
        nodeId: node.nodeId,
        nodeType: node.nodeType,
        city: node.city || 'ouro_preto',
        name: node.name,
        lat: node.coordinates.lat,
        lng: node.coordinates.lng,
        alt: node.coordinates.alt || 0.0,
        baseFrequency: sv.baseFrequency,
        harmonicity: sv.harmonicity,
        decay: sv.decay,
        gain: sv.gain,
        euclideanDensity: sv.euclideanDensity,
        euclideanSteps: sv.euclideanSteps || 8,
        echoProbability: sv.echoProbability || 0.7,
        soundType: sv.soundType || 'bell_deep',
        fmIndex: sv.fmIndex || 0.0,
        filterCutoff: sv.filterCutoff || 1200.0,
        bitDepth: sv.bitDepth || 16,
        carrierType: sv.carrierType || 'sine',
        scarIndex: node.scarIndex || 0.0,
        interactionCount: node.interactionCount || 0
      });
    }
  });

  if (ouroResult.count === 0 && fs.existsSync(CONFIG.TWIN_SNAPSHOT_PATH)) {
    console.log('[DB] Seeding database with initial Ouro Preto towers from snapshot...');
    const snapshotRaw = fs.readFileSync(CONFIG.TWIN_SNAPSHOT_PATH, 'utf-8');
    const snapshotNodes = JSON.parse(snapshotRaw);
    insertMany(snapshotNodes);
    console.log(`[DB] Successfully seeded ${snapshotNodes.length} Ouro Preto towers.`);
  }

  const chicagoResult = countStmt.get('chicago');
  const CHICAGO_INITIAL_NODES = [
    {
      nodeId: 'tower_chicago_1',
      nodeType: 'TOWER',
      city: 'chicago',
      name: 'DuSable Bridge / Chicago Riverwalk',
      coordinates: { lat: 41.8887, lng: -87.6244, alt: 177.0 },
      stateVector: { soundType: 'chicago_bridge', carrierType: 'triangle', baseFrequency: 110.0, harmonicity: 2.41, decay: 3.5, gain: 0.9, fmIndex: 4.5, filterCutoff: 2200.0, euclideanDensity: 3, echoProbability: 0.75, bitDepth: 12 }
    },
    {
      nodeId: 'tower_chicago_2',
      nodeType: 'TOWER',
      city: 'chicago',
      name: 'Willis Tower Skydeck',
      coordinates: { lat: 41.8789, lng: -87.6359, alt: 442.0 },
      stateVector: { soundType: 'chicago_wind', carrierType: 'sine', baseFrequency: 220.0, harmonicity: 1.5, decay: 6.0, gain: 0.8, filterCutoff: 1200.0, euclideanDensity: 2, echoProbability: 0.8, bitDepth: 16 }
    },
    {
      nodeId: 'tower_chicago_3',
      nodeType: 'TOWER',
      city: 'chicago',
      name: 'The Loop: Adams & Wabash L-Station',
      coordinates: { lat: 41.8793, lng: -87.6260, alt: 185.0 },
      stateVector: { soundType: 'chicago_rail', carrierType: 'sawtooth', baseFrequency: 140.0, harmonicity: 2.1, decay: 2.2, gain: 0.95, fmIndex: 5.5, filterCutoff: 2800.0, euclideanDensity: 3, echoProbability: 0.7, bitDepth: 10 }
    },
    {
      nodeId: 'tower_chicago_4',
      nodeType: 'TOWER',
      city: 'chicago',
      name: 'Navy Pier Harbor Foghorn',
      coordinates: { lat: 41.8917, lng: -87.6043, alt: 178.0 },
      stateVector: { soundType: 'chicago_foghorn', carrierType: 'sawtooth', baseFrequency: 65.0, harmonicity: 1.0, decay: 6.5, gain: 1.0, filterCutoff: 450.0, euclideanDensity: 1, echoProbability: 0.9, bitDepth: 16 }
    },
    {
      nodeId: 'tower_chicago_5',
      nodeType: 'TOWER',
      city: 'chicago',
      name: 'Millennium Park (Cloud Gate)',
      coordinates: { lat: 41.8827, lng: -87.6233, alt: 180.0 },
      stateVector: { soundType: 'glitch', carrierType: 'triangle', baseFrequency: 330.0, harmonicity: 3.14, decay: 0.8, gain: 0.85, fmIndex: 2.5, filterCutoff: 4200.0, euclideanDensity: 2, echoProbability: 0.75, bitDepth: 6 }
    },
    {
      nodeId: 'tower_chicago_6',
      nodeType: 'TOWER',
      city: 'chicago',
      name: 'Fulton Market Industrial Yard',
      coordinates: { lat: 41.8865, lng: -87.6485, alt: 182.0 },
      stateVector: { soundType: 'chicago_rail', carrierType: 'square', baseFrequency: 125.0, harmonicity: 1.85, decay: 2.0, gain: 0.9, fmIndex: 6.2, filterCutoff: 3200.0, euclideanDensity: 3, echoProbability: 0.7, bitDepth: 8 }
    }
  ];

  const shanghaiResult = countStmt.get('shanghai');
  const SHANGHAI_INITIAL_NODES = [
    {
      nodeId: 'tower_shanghai_1',
      nodeType: 'TOWER',
      city: 'shanghai',
      name: 'The Bund / Custom House Clock Tower',
      coordinates: { lat: 31.2389, lng: 121.4858, alt: 79.0 },
      stateVector: { soundType: 'shanghai_gong', carrierType: 'sine', baseFrequency: 220.0, harmonicity: 1.414, decay: 4.5, gain: 0.95, filterCutoff: 1500.0, euclideanDensity: 3, echoProbability: 0.85, bitDepth: 16 }
    },
    {
      nodeId: 'tower_shanghai_2',
      nodeType: 'TOWER',
      city: 'shanghai',
      name: 'Oriental Pearl TV Tower',
      coordinates: { lat: 31.2397, lng: 121.4998, alt: 468.0 },
      stateVector: { soundType: 'glitch', carrierType: 'triangle', baseFrequency: 440.0, harmonicity: 3.14, decay: 0.7, gain: 0.85, fmIndex: 3.0, filterCutoff: 4500.0, euclideanDensity: 2, echoProbability: 0.75, bitDepth: 6 }
    },
    {
      nodeId: 'tower_shanghai_3',
      nodeType: 'TOWER',
      city: 'shanghai',
      name: 'Shanghai Tower (Lujiazui Financial Center)',
      coordinates: { lat: 31.2335, lng: 121.5056, alt: 632.0 },
      stateVector: { soundType: 'drone', carrierType: 'sine', baseFrequency: 95.0, harmonicity: 1.0, decay: 7.5, gain: 0.8, filterCutoff: 550.0, euclideanDensity: 2, echoProbability: 0.8, bitDepth: 16 }
    },
    {
      nodeId: 'tower_shanghai_4',
      nodeType: 'TOWER',
      city: 'shanghai',
      name: 'Huangpu River Ferry Terminal',
      coordinates: { lat: 31.2351, lng: 121.4920, alt: 5.0 },
      stateVector: { soundType: 'shanghai_river', carrierType: 'sawtooth', baseFrequency: 85.0, harmonicity: 1.2, decay: 5.5, gain: 1.0, filterCutoff: 480.0, euclideanDensity: 1, echoProbability: 0.9, bitDepth: 16 }
    },
    {
      nodeId: 'tower_shanghai_5',
      nodeType: 'TOWER',
      city: 'shanghai',
      name: "Jing'an Temple Sacred Bronze Gong",
      coordinates: { lat: 31.2241, lng: 121.4468, alt: 20.0 },
      stateVector: { soundType: 'shanghai_gong', carrierType: 'sine', baseFrequency: 180.0, harmonicity: 1.5, decay: 5.0, gain: 0.9, filterCutoff: 1200.0, euclideanDensity: 3, echoProbability: 0.8, bitDepth: 16 }
    },
    {
      nodeId: 'tower_shanghai_6',
      nodeType: 'TOWER',
      city: 'shanghai',
      name: 'Longyang Road Maglev Terminal',
      coordinates: { lat: 31.2038, lng: 121.5583, alt: 15.0 },
      stateVector: { soundType: 'shanghai_maglev', carrierType: 'sawtooth', baseFrequency: 350.0, harmonicity: 2.5, decay: 3.0, gain: 0.9, fmIndex: 4.0, filterCutoff: 3800.0, euclideanDensity: 3, echoProbability: 0.7, bitDepth: 12 }
    }
  ];

  if (shanghaiResult.count === 0) {
    console.log('[DB] Seeding database with initial Shanghai landmark towers...');
    insertMany(SHANGHAI_INITIAL_NODES);
    console.log(`[DB] Successfully seeded ${SHANGHAI_INITIAL_NODES.length} Shanghai landmark towers.`);
  }
}




export function getAllNodes(city = null) {
  const db = getDatabaseConnection();
  const stmt = city
    ? db.prepare('SELECT * FROM nodes WHERE city = ?')
    : db.prepare('SELECT * FROM nodes');
  const rows = city ? stmt.all(city) : stmt.all();

  return rows.map((row) => ({
    nodeId: row.node_id,
    nodeType: row.node_type,
    city: row.city,
    name: row.name,
    coordinates: {
      lat: row.lat,
      lng: row.lng,
      alt: row.alt
    },
    stateVector: {
      soundType: row.sound_type || 'bell_deep',
      carrierType: row.carrier_type || 'sine',
      baseFrequency: row.base_frequency,
      initialBaseFrequency: row.base_frequency,
      harmonicity: row.harmonicity,
      decay: row.decay,
      gain: row.gain,
      euclideanDensity: row.euclidean_density,
      euclideanSteps: row.euclidean_steps,
      echoProbability: row.echo_probability !== undefined ? row.echo_probability : 0.7,
      fmIndex: row.fm_index !== undefined ? row.fm_index : 0.0,
      filterCutoff: row.filter_cutoff !== undefined ? row.filter_cutoff : 1200.0,
      bitDepth: row.bit_depth !== undefined ? row.bit_depth : 16
    },
    scarIndex: row.scar_index,
    interactionCount: row.interaction_count,
    createdAt: row.created_at
  }));
}

export function getNodeById(nodeId) {
  const db = getDatabaseConnection();
  const stmt = db.prepare('SELECT * FROM nodes WHERE node_id = ?');
  const row = stmt.get(nodeId);
  if (!row) return null;

  return {
    nodeId: row.node_id,
    nodeType: row.node_type,
    city: row.city,
    name: row.name,
    coordinates: { lat: row.lat, lng: row.lng, alt: row.alt },
    stateVector: {
      soundType: row.sound_type || 'bell_deep',
      carrierType: row.carrier_type || 'sine',
      baseFrequency: row.base_frequency,
      harmonicity: row.harmonicity,
      decay: row.decay,
      gain: row.gain,
      euclideanDensity: row.euclidean_density,
      euclideanSteps: row.euclidean_steps,
      echoProbability: row.echo_probability !== undefined ? row.echo_probability : 0.7,
      fmIndex: row.fm_index !== undefined ? row.fm_index : 0.0,
      filterCutoff: row.filter_cutoff !== undefined ? row.filter_cutoff : 1200.0,
      bitDepth: row.bit_depth !== undefined ? row.bit_depth : 16
    },
    scarIndex: row.scar_index,
    interactionCount: row.interaction_count,
    createdAt: row.created_at
  };
}

export function saveReflectorNode(node) {
  const db = getDatabaseConnection();
  const sv = node.stateVector || {};
  const stmt = db.prepare(`
    INSERT INTO nodes (
      node_id, node_type, city, name, lat, lng, alt,
      base_frequency, harmonicity, decay, gain, euclidean_density, euclidean_steps,
      echo_probability, sound_type, fm_index, filter_cutoff, bit_depth, carrier_type,
      scar_index, interaction_count
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?
    )
  `);

  stmt.run(
    node.nodeId,
    node.nodeType || 'REFLECTOR',
    node.city || CONFIG.DEFAULT_CITY,
    node.name || 'Static Reflector Deposit',
    node.coordinates.lat,
    node.coordinates.lng,
    node.coordinates.alt || 0.0,
    sv.baseFrequency,
    sv.harmonicity,
    sv.decay,
    sv.gain,
    sv.euclideanDensity,
    sv.euclideanSteps || 8,
    sv.echoProbability || 0.7,
    sv.soundType || 'bell_deep',
    sv.fmIndex || 0.0,
    sv.filterCutoff || 1200.0,
    sv.bitDepth || 16,
    sv.carrierType || 'sine',
    node.scarIndex || 0.0,
    node.interactionCount || 0
  );
}

export function updateNodeStateVector(nodeId, newStateVector, scarIndexIncrement = 0.01) {
  const db = getDatabaseConnection();
  const stmt = db.prepare(`
    UPDATE nodes SET
      base_frequency = ?,
      harmonicity = ?,
      decay = ?,
      gain = ?,
      euclidean_density = ?,
      scar_index = scar_index + ?,
      interaction_count = interaction_count + 1
    WHERE node_id = ?
  `);

  stmt.run(
    newStateVector.baseFrequency,
    newStateVector.harmonicity,
    newStateVector.decay,
    newStateVector.gain,
    newStateVector.euclideanDensity,
    scarIndexIncrement,
    nodeId
  );
}
