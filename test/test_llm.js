import { CONFIG } from '../server/config.js';
import { generateReflectorPresetFromPrompt } from '../server/llm-membrane.js';

async function testLLMIntegration() {
  console.log('=======================================================');
  console.log(' SINO CICATRIZADO - LLM MODULE INTEGRATION TEST');
  console.log('=======================================================');
  console.log('Configured Provider:', CONFIG.LLM.PROVIDER);
  console.log('Configured Model:', CONFIG.LLM.MODEL);
  console.log('Configured Fallback Model:', CONFIG.LLM.FALLBACK_MODEL);
  console.log('DeepSeek Key Present:', Boolean(CONFIG.LLM.DEEPSEEK_API_KEY));
  console.log('OpenRouter Key Present:', Boolean(CONFIG.LLM.OPENROUTER_API_KEY));

  const promptText = 'Resonant bronze bell with deep harmonic drone';
  console.log(`\nGenerating preset for prompt: "${promptText}"...`);
  
  const preset = await generateReflectorPresetFromPrompt(promptText);
  console.log('Generated Validated Preset:', preset);

  if (
    preset &&
    preset.baseFrequency >= 80 &&
    preset.baseFrequency <= 880 &&
    preset.euclideanDensity >= 1 &&
    preset.euclideanDensity <= 16
  ) {
    console.log('\n✅ [PASS] LLM Module preset generation & immunological validation test successful!');
  } else {
    console.error('\n❌ [FAIL] Invalid preset generated.');
    process.exit(1);
  }
}

testLLMIntegration().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
