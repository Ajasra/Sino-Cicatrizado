import { CONFIG } from '../server/config.js';
import { getAllNodes, getDatabaseConnection } from '../server/db/database.js';

console.log('[TEST] Initializing DB...');
getDatabaseConnection();

console.log('[TEST] Testing getAllNodes("ouro_preto")...');
const ouroNodes = getAllNodes('ouro_preto');
console.log(`[TEST] Ouro Preto nodes count: ${ouroNodes.length}`);

console.log('[TEST] Testing getAllNodes("chicago")...');
const chicagoNodes = getAllNodes('chicago');
console.log(`[TEST] Chicago nodes count: ${chicagoNodes.length}`);

chicagoNodes.forEach((n, idx) => {
  console.log(`  ${idx + 1}. [${n.nodeType}] ${n.name} - Sound: ${n.stateVector.soundType}, Freq: ${n.stateVector.baseFrequency}Hz, Lat: ${n.coordinates.lat}, Lng: ${n.coordinates.lng}`);
});

if (chicagoNodes.length >= 6) {
  console.log('\n[SUCCESS] Chicago towers seeded successfully and queryable!');
} else {
  console.error('\n[FAIL] Chicago towers count mismatch');
  process.exit(1);
}
