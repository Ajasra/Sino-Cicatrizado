/**
 * scripts/reset-ouro-preto.js
 *
 * Clears all existing ouro_preto nodes from the database and re-seeds them
 * from the updated scarred_twin.json (which now includes soundType, fmIndex,
 * filterCutoff, bitDepth, and carrierType fields for the new synthesis engine).
 *
 * Usage:
 *   node scripts/reset-ouro-preto.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const DB_PATH = process.env.DB_PATH || path.join(ROOT_DIR, 'data', 'scarred_bell.db');
const SNAPSHOT_PATH = path.join(ROOT_DIR, 'data', 'scarred_twin.json');

if (!fs.existsSync(SNAPSHOT_PATH)) {
  console.error(`[reset-ouro-preto] Snapshot not found: ${SNAPSHOT_PATH}`);
  process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// --- Run any pending migrations first ---
const migrations = [
  `ALTER TABLE nodes ADD COLUMN echo_probability REAL DEFAULT 0.7;`,
  `ALTER TABLE nodes ADD COLUMN sound_type TEXT DEFAULT 'bell_deep';`,
  `ALTER TABLE nodes ADD COLUMN fm_index REAL DEFAULT 0.0;`,
  `ALTER TABLE nodes ADD COLUMN filter_cutoff REAL DEFAULT 1200.0;`,
  `ALTER TABLE nodes ADD COLUMN bit_depth INTEGER DEFAULT 16;`,
  `ALTER TABLE nodes ADD COLUMN carrier_type TEXT DEFAULT 'sine';`
];
for (const sql of migrations) {
  try { db.exec(sql); } catch (e) { /* column already exists */ }
}

// --- Clear all existing ouro_preto TOWER nodes ---
const deleted = db.prepare(`DELETE FROM nodes WHERE city = 'ouro_preto'`).run();
console.log(`[reset-ouro-preto] Cleared ${deleted.changes} existing ouro_preto nodes.`);

// --- Load the new twin snapshot ---
const snapshotNodes = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf-8'));
console.log(`[reset-ouro-preto] Loaded ${snapshotNodes.length} landmarks from scarred_twin.json`);

// --- Insert new nodes ---
const insert = db.prepare(`
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

const insertAll = db.transaction((nodes) => {
  for (const node of nodes) {
    const sv = node.stateVector;
    insert.run({
      nodeId: node.nodeId,
      nodeType: node.nodeType || 'TOWER',
      city: node.city,
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
    console.log(
      `  [+] ${node.name.padEnd(45)} | ${sv.soundType.padEnd(12)} | ${sv.baseFrequency} Hz | scar: ${node.scarIndex}`
    );
  }
});

insertAll(snapshotNodes);
db.close();

console.log(`\n[reset-ouro-preto] ✓ Done. ${snapshotNodes.length} Ouro Preto nodes seeded with new sound engine parameters.`);
