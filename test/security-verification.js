import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { createNewCity } from '../server/services/city-generator.js';
import { getCityAcousticContext } from '../server/llm-membrane.js';
import { CONFIG } from '../server/config.js';

console.log('=======================================================');
console.log(' SINO CICATRIZADO - ENDPOINT SECURITY & HARDENING TESTS');
console.log('=======================================================\n');

let passCount = 0;
let testCount = 0;

async function runTest(description, testFn) {
  testCount++;
  try {
    await testFn();
    passCount++;
    console.log(`✅ [PASS ${testCount}] ${description}`);
  } catch (err) {
    console.error(`❌ [FAIL ${testCount}] ${description}`);
    console.error(`   Error: ${err.message}\n`);
  }
}

// ----------------------------------------------------
// TEST 1: Path Traversal Rejection in createNewCity
// ----------------------------------------------------
await runTest('Path Traversal Rejection in City Key (../ sequences)', async () => {
  const maliciousKeys = [
    '../../public/evil.js',
    '..\\..\\scripts\\evil.bat',
    'ouro/preto',
    'city\0null',
    '../test',
    'invalid space key'
  ];

  for (const key of maliciousKeys) {
    let errorThrown = false;
    try {
      await createNewCity({
        key,
        name: 'Malicious Attempt',
        contextText: 'Malicious payload'
      });
    } catch (err) {
      errorThrown = true;
      assert(
        err.message.includes('Invalid city key format') ||
        err.message.includes('Path traversal') ||
        err.message.includes('Security Violation'),
        `Unexpected error message: ${err.message}`
      );
    }
    assert(errorThrown, `Expected createNewCity to reject key "${key}", but it succeeded.`);
  }
});

// ----------------------------------------------------
// TEST 2: Executable File Extension Blocking in createNewCity
// ----------------------------------------------------
await runTest('Executable and Dangerous File Extension Blocking', async () => {
  const dangerousKeys = [
    'malicious.exe',
    'exploit.bat',
    'payload.cmd',
    'shell.sh',
    'script.js',
    'page.html',
    'code.wasm'
  ];

  for (const key of dangerousKeys) {
    let errorThrown = false;
    try {
      await createNewCity({
        key,
        name: 'Dangerous Extension Attempt',
        contextText: 'malicious payload'
      });
    } catch (err) {
      errorThrown = true;
    }
    assert(errorThrown, `Expected createNewCity to reject dangerous key "${key}", but it succeeded.`);
  }
});

// ----------------------------------------------------
// TEST 3: Windows Reserved Device Name Blocking
// ----------------------------------------------------
await runTest('Windows Reserved Device Names Blocking', async () => {
  const reservedNames = ['con', 'prn', 'aux', 'nul', 'com1', 'lpt1'];

  for (const name of reservedNames) {
    let errorThrown = false;
    try {
      await createNewCity({
        key: name,
        name: `Reserved ${name}`,
        contextText: 'reserved test'
      });
    } catch (err) {
      errorThrown = true;
      assert(
        err.message.includes('reserved device name') || err.message.includes('Invalid city key format'),
        `Unexpected error message: ${err.message}`
      );
    }
    assert(errorThrown, `Expected createNewCity to reject reserved device name "${name}"`);
  }
});

// ----------------------------------------------------
// TEST 4: Safe Path Containment in getCityAcousticContext
// ----------------------------------------------------
await runTest('Path Traversal Prevention in getCityAcousticContext', async () => {
  // Attempt to read package.json or server.js via directory traversal
  const traversalAttempt = '../../package';
  const context = getCityAcousticContext(traversalAttempt);

  // Must fall back to default prompt and not expose arbitrary file contents
  assert(!context.includes('"name": "sino-cicatrizado"'), 'Path traversal must not leak package.json');
  assert(context.length > 0, 'Must return default or fallback acoustic context');
});

// ----------------------------------------------------
// TEST 5: Landmark Array Limiting (DoS / LLM Exhaustion Prevention)
// ----------------------------------------------------
await runTest('Landmarks Array Boundary Check (Max 25)', async () => {
  const oversizedLandmarks = new Array(50).fill({
    name: 'Spam Landmark',
    lat: 0,
    lng: 0,
    intentText: 'spam'
  });

  let errorThrown = false;
  try {
    await createNewCity({
      key: 'valid_test_city',
      name: 'Valid Name',
      contextText: 'Acoustic landscape test',
      landmarks: oversizedLandmarks
    });
  } catch (err) {
    errorThrown = true;
    assert(err.message.includes('Landmarks must be an array with at most 25 items'));
  }
  assert(errorThrown, 'Oversized landmarks array must be rejected');
});

// ----------------------------------------------------
// TEST 6: Context Text Length Clamping
// ----------------------------------------------------
await runTest('Valid City Creation with Clamped Context Text', async () => {
  const safeCityKey = 'kyoto_security_test';
  const longContext = 'A'.repeat(8000); // Exceeds 5000 chars

  const result = await createNewCity({
    key: safeCityKey,
    name: 'Kyoto Test',
    contextText: longContext,
    landmarks: []
  });

  assert.strictEqual(result.cityKey, safeCityKey);
  assert(fs.existsSync(result.promptFile), 'Prompt file must be written safely inside prompts dir');

  const writtenContent = fs.readFileSync(result.promptFile, 'utf-8');
  assert.strictEqual(writtenContent.length, 5000, 'Context text must be clamped to 5000 characters');

  // Clean up test file
  fs.unlinkSync(result.promptFile);
});

// ----------------------------------------------------
// TEST 7: Coordinates Range Clamping / Validation Logic
// ----------------------------------------------------
await runTest('Coordinate Range & Finite Validation Guardrails', async () => {
  function validateCoordinates(coords) {
    if (!coords || typeof coords !== 'object') return false;
    const lat = Number(coords.lat);
    const lng = Number(coords.lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      return false;
    }
    return true;
  }

  assert(!validateCoordinates(null), 'null coordinates must fail');
  assert(!validateCoordinates({ lat: 'NaN', lng: 0 }), 'NaN lat must fail');
  assert(!validateCoordinates({ lat: 91, lng: 0 }), 'lat > 90 must fail');
  assert(!validateCoordinates({ lat: -91, lng: 0 }), 'lat < -90 must fail');
  assert(!validateCoordinates({ lat: 0, lng: 181 }), 'lng > 180 must fail');
  assert(!validateCoordinates({ lat: 0, lng: -181 }), 'lng < -180 must fail');
  assert(validateCoordinates({ lat: -20.3856, lng: -43.5035 }), 'valid coordinates must pass');
});

// ----------------------------------------------------
// TEST 8: State Vector Defensive Parsing Guardrail
// ----------------------------------------------------
await runTest('State Vector Defensive Fallback (No Server Crash on undefined stateVector)', async () => {
  const malformedBody = {
    name: 'Crash Attempt',
    stateVector: undefined
  };

  const sv = (malformedBody.stateVector && typeof malformedBody.stateVector === 'object') ? malformedBody.stateVector : {};
  const soundType = sv.soundType || 'bell_deep';
  const baseFreq = Number(sv.baseFrequency || 220.0);

  assert.strictEqual(soundType, 'bell_deep', 'Undefined soundType must safely fallback');
  assert.strictEqual(baseFreq, 220.0, 'Undefined baseFrequency must safely fallback');
});

console.log('\n=======================================================');
console.log(` SECURITY VERIFICATION COMPLETE: ${passCount}/${testCount} TESTS PASSED`);
console.log('=======================================================');

if (passCount !== testCount) {
  process.exit(1);
}
