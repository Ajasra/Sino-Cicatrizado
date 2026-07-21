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
      scar_index REAL DEFAULT 0.0,
      interaction_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default Ouro Preto historical towers if table is empty
  seedInitialTowers(dbInstance);

  return dbInstance;
}

function seedInitialTowers(db) {
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM nodes');
  const result = countStmt.get();

  if (result.count === 0 && fs.existsSync(CONFIG.TWIN_SNAPSHOT_PATH)) {
    console.log('[DB] Seeding database with initial Ouro Preto towers from snapshot...');
    const snapshotRaw = fs.readFileSync(CONFIG.TWIN_SNAPSHOT_PATH, 'utf-8');
    const snapshotNodes = JSON.parse(snapshotRaw);

    const insertStmt = db.prepare(`
      INSERT INTO nodes (
        node_id, node_type, city, name, lat, lng, alt,
        base_frequency, harmonicity, decay, gain, euclidean_density, euclidean_steps, scar_index, interaction_count
      ) VALUES (
        @nodeId, @nodeType, @city, @name, @lat, @lng, @alt,
        @baseFrequency, @harmonicity, @decay, @gain, @euclideanDensity, @euclideanSteps, @scarIndex, @interactionCount
      )
    `);

    const insertMany = db.transaction((nodes) => {
      for (const node of nodes) {
        insertStmt.run({
          nodeId: node.nodeId,
          nodeType: node.nodeType,
          city: node.city,
          name: node.name,
          lat: node.coordinates.lat,
          lng: node.coordinates.lng,
          alt: node.coordinates.alt || 0.0,
          baseFrequency: node.stateVector.baseFrequency,
          harmonicity: node.stateVector.harmonicity,
          decay: node.stateVector.decay,
          gain: node.stateVector.gain,
          euclideanDensity: node.stateVector.euclideanDensity,
          euclideanSteps: node.stateVector.euclideanSteps,
          scarIndex: node.scarIndex || 0.0,
          interactionCount: node.interactionCount || 0
        });
      }
    });

    insertMany(snapshotNodes);
    console.log(`[DB] Successfully seeded ${snapshotNodes.length} historical towers.`);
  }
}

export function getAllNodes(city = CONFIG.DEFAULT_CITY) {
  const db = getDatabaseConnection();
  const stmt = db.prepare('SELECT * FROM nodes WHERE city = ?');
  const rows = stmt.all(city);

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
      baseFrequency: row.base_frequency,
      harmonicity: row.harmonicity,
      decay: row.decay,
      gain: row.gain,
      euclideanDensity: row.euclidean_density,
      euclideanSteps: row.euclidean_steps
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
      baseFrequency: row.base_frequency,
      harmonicity: row.harmonicity,
      decay: row.decay,
      gain: row.gain,
      euclideanDensity: row.euclidean_density,
      euclideanSteps: row.euclidean_steps
    },
    scarIndex: row.scar_index,
    interactionCount: row.interaction_count,
    createdAt: row.created_at
  };
}

export function saveReflectorNode(node) {
  const db = getDatabaseConnection();
  const stmt = db.prepare(`
    INSERT INTO nodes (
      node_id, node_type, city, name, lat, lng, alt,
      base_frequency, harmonicity, decay, gain, euclidean_density, euclidean_steps, scar_index, interaction_count
    ) VALUES (
      ?, 'REFLECTOR', ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  stmt.run(
    node.nodeId,
    node.city || CONFIG.DEFAULT_CITY,
    node.name || 'Static Reflector Deposit',
    node.coordinates.lat,
    node.coordinates.lng,
    node.coordinates.alt || 0.0,
    node.stateVector.baseFrequency,
    node.stateVector.harmonicity,
    node.stateVector.decay,
    node.stateVector.gain,
    node.stateVector.euclideanDensity,
    node.stateVector.euclideanSteps || 8,
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
