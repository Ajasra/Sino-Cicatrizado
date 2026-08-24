import dotenv from 'dotenv';
dotenv.config();

const models = [
  'google/gemini-3.7-flash',
  'google/gemini-3.5-flash-lite',
  'openai/gpt-4o-mini',
  'deepseek/deepseek-v4-flash',
  'qwen/qwen-2.5-72b-instruct'
];

const apiKey = process.env.OPENROUTER_API_KEY;

async function test() {
  console.log('Testing OpenRouter models with structured JSON...');
  for (const m of models) {
    const t0 = Date.now();
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Sino Cicatrizado'
        },
        body: JSON.stringify({
          model: m,
          messages: [
            { role: 'system', content: 'Output JSON: {"soundType": "montreal_sat_geodetic", "baseFrequency": 440}' },
            { role: 'user', content: 'SAT Satosphere dome cluster' }
          ],
          response_format: { type: 'json_object' }
        })
      });
      const data = await res.json();
      const dt = Date.now() - t0;
      if (data.choices && data.choices[0]) {
        console.log(`[PASS] ${m.padEnd(35)} | Latency: ${dt}ms | Output: ${data.choices[0].message.content.replace(/\s+/g, ' ')}`);
      } else {
        console.log(`[FAIL] ${m.padEnd(35)} | Latency: ${dt}ms | Error: ${JSON.stringify(data.error)}`);
      }
    } catch (e) {
      console.log(`[ERR ] ${m.padEnd(35)} | ${e.message}`);
    }
  }
}

test();
