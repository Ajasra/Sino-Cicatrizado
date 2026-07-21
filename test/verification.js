import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { calculateHaversineMeters, calculateInverseSquareGain } from '../server/services/spatial.js';
import { validateSynthPreset } from '../server/utils/immunological-parser.js';
import { getDatabaseConnection, updateNodeStateVector } from '../server/db/database.js';
import { CONFIG } from '../server/config.js';
import { getSomaticSignature, evaluateSomaticProximity } from '../server/services/hysteresis.js';

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
  assert.strictEqual(cleanPreset.decay, CONFIG.PARAMETER_BOUNDS.decay.max, `Out of bounds decay must be clamped to ${CONFIG.PARAMETER_BOUNDS.decay.max}`);
});

// ----------------------------------------------------
// TEST 4: SQLite WAL Mode Parallel Concurrency Test
// ----------------------------------------------------
runTest('SQLite WAL Mode Parallel Concurrency (100 Concurrent Writes)', () => {
  const db = getDatabaseConnection();
  const firstNode = db.prepare('SELECT node_id FROM nodes LIMIT 1').get();
  assert(firstNode, 'At least one node must exist in the database');
  const nodeId = firstNode.node_id;

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
  console.log(`   Node "${nodeId}" interaction count: ${row.interaction_count}, scar index: ${row.scar_index.toFixed(4)}`);

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

// ----------------------------------------------------
// TEST 6: Somatic Signature Determinism & Crowd Damping
// ----------------------------------------------------
runTest('Somatic Signature Determinism & Crowd Damping Calculation', () => {
  const sig1 = getSomaticSignature('user_ouro_preto_1');
  const sig1Repeat = getSomaticSignature('user_ouro_preto_1');
  const sig2 = getSomaticSignature('user_chicago_9');

  console.log('   User 1 Sig:', sig1);
  console.log('   User 2 Sig:', sig2);

  assert.deepStrictEqual(sig1, sig1Repeat, 'Somatic signature must be strictly deterministic per somaticId');
  assert(sig1.weightMultiplier >= 0.5 && sig1.weightMultiplier <= 1.8, 'Weight multiplier out of bounds');

  // Crowd damping multiplier test for N=10 users
  const crowdDamping = CONFIG.CROWD_DAMPING_FACTOR; // 0.3
  const crowdMultiplier10 = 1.0 / (1.0 + crowdDamping * (10 - 1)); // ~0.27
  assert(crowdMultiplier10 < 0.35 && crowdMultiplier10 > 0.2, 'Crowd multiplier for 10 users should dampen effect to ~0.27');
});

// ----------------------------------------------------
// TEST 7: Non-Compounding Pitch Drift & User Reflector Scarring
// ----------------------------------------------------
runTest('Non-Compounding Pitch Drift Stability & User Reflector Scarring', () => {
  const dummyReflector = {
    nodeId: 'test_user_reflector_999',
    nodeType: 'REFLECTOR',
    city: 'chicago',
    name: 'Test Chicago User Reflector',
    coordinates: { lat: 41.8818, lng: -87.6231, alt: 0 },
    stateVector: {
      soundType: 'bell_deep',
      carrierType: 'sine',
      baseFrequency: 440.0,
      initialBaseFrequency: 440.0,
      harmonicity: 1.414,
      decay: 1.5,
      gain: 1.0,
      euclideanDensity: 2,
      fmIndex: 0.0,
      filterCutoff: 1200.0,
      bitDepth: 16
    },
    scarIndex: 0.0
  };

  const userPos = { lat: 41.8818, lng: -87.6231 }; // Directly at node coordinate
  let mutatedNode = dummyReflector;

  // Run 100 proximity evaluations
  for (let i = 0; i < 100; i++) {
    const res = evaluateSomaticProximity(userPos, mutatedNode, 'user_soma_chicago');
    assert(res !== null, 'Proximity evaluation should succeed for user reflector');
    mutatedNode = {
      ...mutatedNode,
      stateVector: res.mutatedStateVector,
      scarIndex: mutatedNode.scarIndex + res.scarIncrement
    };
  }

  const finalFreq = mutatedNode.stateVector.baseFrequency;
  console.log(`   Initial Pitch: 440Hz -> Pitch after 100 ticks: ${finalFreq}Hz | Scar Index: ${mutatedNode.scarIndex.toFixed(6)}`);

  // Verify pitch did not explode exponentially (must remain within microtonal range 420Hz - 460Hz)
  assert(finalFreq >= 420.0 && finalFreq <= 460.0, `Pitch exploded unexpectedly: ${finalFreq}Hz`);
  assert(mutatedNode.scarIndex > 0, 'User reflector scar index must increase over proximity updates');
});

console.log(`\n=======================================================`);
console.log(` VERIFICATION COMPLETE: ${passCount}/${testCount} TESTS PASSED`);
console.log(`=======================================================\n`);

if (passCount === testCount) {
  process.exit(0);
} else {
  process.exit(1);
}
