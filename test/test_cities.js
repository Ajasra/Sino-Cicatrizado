import { CONFIG } from '../server/config.js';
import { getAllNodes, getDatabaseConnection } from '../server/db/database.js';

console.log('[TEST] Initializing DB...');
getDatabaseConnection();

console.log('\n--- OURO PRETO ---');
const ouroNodes = getAllNodes('ouro_preto');
console.log(`Ouro Preto nodes count: ${ouroNodes.length}`);

console.log('\n--- CHICAGO ---');
const chicagoNodes = getAllNodes('chicago');
console.log(`Chicago nodes count: ${chicagoNodes.length}`);
chicagoNodes.forEach((n, idx) => {
  console.log(`  ${idx + 1}. [${n.nodeType}] ${n.name} - Sound: ${n.stateVector.soundType}, Freq: ${n.stateVector.baseFrequency}Hz`);
});

console.log('\n--- SHANGHAI ---');
const shanghaiNodes = getAllNodes('shanghai');
console.log(`Shanghai nodes count: ${shanghaiNodes.length}`);
shanghaiNodes.forEach((n, idx) => {
  console.log(`  ${idx + 1}. [${n.nodeType}] ${n.name} - Sound: ${n.stateVector.soundType}, Freq: ${n.stateVector.baseFrequency}Hz`);
});

console.log('\n--- SH NOISE ---');
const shanghaiNoiseNodes = getAllNodes('shanghai_noise');
console.log(`SH Noise nodes count: ${shanghaiNoiseNodes.length}`);
shanghaiNoiseNodes.forEach((n, idx) => {
  console.log(`  ${idx + 1}. [${n.nodeType}] ${n.name} - Sound: ${n.stateVector.soundType}, Freq: ${n.stateVector.baseFrequency}Hz`);
});

if (ouroNodes.length >= 1 && chicagoNodes.length >= 6 && shanghaiNodes.length >= 6 && shanghaiNoiseNodes.length >= 6) {
  console.log('\n[SUCCESS] Ouro Preto, Chicago, Shanghai, and SH Noise towers verified!');
} else {
  console.error('\n[FAIL] Node count mismatch');
  process.exit(1);
}
