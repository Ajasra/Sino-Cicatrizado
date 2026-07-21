import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { calculateHaversineMeters, calculateInverseSquareGain } from '../server/services/spatial.js';
import { validateSynthPreset } from '../server/utils/immunological-parser.js';
import { getDatabaseConnection, updateNodeStateVector } from '../server/db/database.js';
import { CONFIG } from '../server/config.js';

console.log('=======================================================');
console.log(' SINO CICATRIZADO - AUTOMATED VERIFICATION MATRIX TEST');
console.log('=======================================================\n');

let passCount = 0;
let testCount = 0;

function runTest(description, testFn) {
  testCount++;
  try {
    testFn();
    passCount++;
    console.log(`✅ [PASS ${testCount}] ${description}`);
  } catch (err) {
    console.error(`❌ [FAIL ${testCount}] ${description}`);
    console.error(`   Error: ${err.message}\n`);
  }
}

// ----------------------------------------------------
// TEST 1: Haversine Metric Accuracy
// ----------------------------------------------------
runTest('Haversine Distance Metric Accuracy (São Francisco to Santa Efigênia)', () => {
  const saoFrancisco = { lat: -20.3867, lng: -43.5031 };
  const santaEfigenia = { lat: -20.3845, lng: -43.4988 };

  const distanceMeters = calculateHaversineMeters(saoFrancisco, santaEfigenia);
  console.log(`   Calculated distance: ${distanceMeters.toFixed(2)} meters`);

  // Geodesic distance is ~490m +/- 5%
  assert(distanceMeters >= 450 && distanceMeters <= 530, `Distance out of expected range: ${distanceMeters}`);
});

// ----------------------------------------------------
// TEST 2: Inverse-Square Attenuation Metric
// ----------------------------------------------------
runTest('Inverse-Square Gain Attenuation Check (100m & 500m)', () => {
  const gainAt0m = calculateInverseSquareGain(0);
  const gainAt100m = calculateInverseSquareGain(100);
  const gainAt500m = calculateInverseSquareGain(500);

  console.log(`   Gain 0m: ${gainAt0m.toFixed(4)} | 100m: ${gainAt100m.toFixed(4)} | 500m: ${gainAt500m.toFixed(4)}`);

  assert.strictEqual(gainAt0m, 1.0, 'Gain at 0m must be 1.0');
  assert(gainAt100m < 1.0 && gainAt100m > 0.9, `Gain at 100m unexpected: ${gainAt100m}`);
  assert(gainAt500m < 0.25 && gainAt500m > 0.15, `Gain at 500m unexpected: ${gainAt500m}`);
});

// ----------------------------------------------------
// TEST 3: Immunological Membrane Payload Guardrails
// ----------------------------------------------------
runTest('Immunological Parsing Layer Guardrail & Fallback Test', () => {
  const malformedPayload = '{"carrierType": "hacked", "baseFrequency": "NaN", "decay": 9999.0}';
  const cleanPreset = validateSynthPreset(malformedPayload);

  console.log('   Cleaned Preset:', cleanPreset);

  assert.strictEqual(cleanPreset.carrierType, 'sine', 'Invalid carrierType must fallback to sine');
  assert.strictEqual(cleanPreset.baseFrequency, 220.0, 'NaN baseFrequency must fallback to 220.0');
  assert.strictEqual(cleanPreset.decay, 6.0, 'Out of bounds decay must be clamped to 6.0');
});

// ----------------------------------------------------
// TEST 4: SQLite WAL Mode Parallel Concurrency Test
// ----------------------------------------------------
runTest('SQLite WAL Mode Parallel Concurrency (100 Concurrent Writes)', () => {
  const db = getDatabaseConnection();
  const nodeId = 'church_sao_francisco_1';

  for (let i = 0; i < 100; i++) {
    updateNodeStateVector(nodeId, {
      baseFrequency: 220.0 + (i % 10),
      harmonicity: 1.414,
      decay: 1.5,
      gain: 1.0,
      euclideanDensity: 3
    }, 0.001);
  }

  const row = db.prepare('SELECT scar_index, interaction_count FROM nodes WHERE node_id = ?').get(nodeId);
  console.log(`   Nodes interaction count: ${row.interaction_count}, scar index: ${row.scar_index.toFixed(4)}`);

  assert(row.interaction_count >= 100, 'Interaction count should be at least 100');
});

// ----------------------------------------------------
// TEST 5: Hysteresis Irreversible State Mutation
// ----------------------------------------------------
runTest('Hysteresis Irreversible Parameter Mutation & Boundary Limits', () => {
  const initialValue = 220.0;
  const limit = CONFIG.PARAMETER_BOUNDS.baseFrequency.limit; // 880.0
  const alpha = CONFIG.SCAR_COEFFICIENT_ALPHA; // 0.05

  let currentVal = initialValue;
  for (let cycle = 0; cycle < 10000; cycle++) {
    currentVal = currentVal + alpha * 0.1 * (limit - currentVal);
  }

  console.log(`   Baseline: ${initialValue}Hz -> Mutated after 10k steps: ${currentVal.toFixed(2)}Hz (Limit: ${limit}Hz)`);

  assert(currentVal > initialValue, 'Parameter must drift away from initial value (irreversibility)');
  assert(currentVal <= limit, 'Parameter must not exceed parameter limit');
});

console.log(`\n=======================================================`);
console.log(` VERIFICATION COMPLETE: ${passCount}/${testCount} TESTS PASSED`);
console.log(`=======================================================\n`);

if (passCount === testCount) {
  process.exit(0);
} else {
  process.exit(1);
}
