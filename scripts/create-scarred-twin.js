/**
 * scripts/create-scarred-twin.js
 *
 * Duplicates/snapshots the current database state of a selected city after an event/conference,
 * saving its accumulated scar index and mutated synthesis parameters as a Scarred Twin JSON.
 *
 * Usage:
 *   node scripts/create-scarred-twin.js [cityName]
 *
 * Example:
 *   node scripts/create-scarred-twin.js ouro_preto
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAllNodes } from '../server/db/database.js';
import { CONFIG } from '../server/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const cityArg = process.argv[2] || CONFIG.DEFAULT_CITY;
console.log(`[create-scarred-twin] Duplicate city state for: "${cityArg}"`);

const nodes = getAllNodes(cityArg);

if (!nodes || nodes.length === 0) {
  console.warn(`[create-scarred-twin] Warning: No nodes found in database for city "${cityArg}".`);
  process.exit(1);
}

const dataDir = path.join(ROOT_DIR, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Format snapshot content
const jsonContent = JSON.stringify(nodes, null, 2);

// Save to city-specific twin snapshot file and default twin snapshot file
const citySnapshotPath = path.join(dataDir, `scarred_twin_${cityArg}.json`);
const defaultSnapshotPath = path.join(dataDir, 'scarred_twin.json');

fs.writeFileSync(citySnapshotPath, jsonContent, 'utf-8');
fs.writeFileSync(defaultSnapshotPath, jsonContent, 'utf-8');

console.log(`\n=======================================================`);
console.log(` SCARRED TWIN CREATED FOR: ${cityArg.toUpperCase()}`);
console.log(` Total Nodes Exported: ${nodes.length}`);
console.log(` Saved to: ${citySnapshotPath}`);
console.log(` Saved to: ${defaultSnapshotPath}`);
console.log(`=======================================================`);

nodes.forEach((node, i) => {
  const scar = (node.scarIndex || 0).toFixed(3);
  console.log(` [${i + 1}] ${node.nodeId.padEnd(28)} | ${node.name.padEnd(42)} | Scar: ${scar} | Type: ${node.nodeType}`);
});
console.log(`\n✓ City "${cityArg}" successfully duplicated into Scarred Twin.`);
