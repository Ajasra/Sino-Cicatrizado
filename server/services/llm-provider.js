import { CONFIG } from '../config.js';

const PROVIDER_ENDPOINTS = {
  deepseek: 'https://api.deepseek.com/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions'
};

/**
 * Executes a chat completion request against DeepSeek or OpenRouter API.
 * Supports automatic model and provider fallback with configurable thinking/reasoning levels.
 * 
 * @param {string} systemPrompt 
 * @param {string} userPrompt 
 * @returns {Promise<object|null>} Parsed LLM JSON response object or null on fallback
 */
export async function callLLMCompletion(systemPrompt, userPrompt) {
  const { PROVIDER, MODEL, FALLBACK_MODEL, DEEPSEEK_API_KEY, OPENROUTER_API_KEY, THINKING_LEVEL } = CONFIG.LLM;

  const primaryApiKey = PROVIDER === 'openrouter' ? OPENROUTER_API_KEY : DEEPSEEK_API_KEY;
  const secondaryProvider = PROVIDER === 'openrouter' ? 'deepseek' : 'openrouter';
  const secondaryApiKey = PROVIDER === 'openrouter' ? DEEPSEEK_API_KEY : OPENROUTER_API_KEY;

  // 1. Attempt primary provider with primary model
  if (primaryApiKey) {
    console.log(`[LLM] Requesting completion via ${PROVIDER.toUpperCase()} using model "${MODEL}" (Thinking: ${THINKING_LEVEL.toUpperCase()})...`);
    const res = await requestChatCompletion(PROVIDER, primaryApiKey, MODEL, systemPrompt, userPrompt, THINKING_LEVEL);
    if (res) return res;

    // Fallback: Attempt primary provider with fallback model
    if (FALLBACK_MODEL && FALLBACK_MODEL !== MODEL) {
      console.warn(`[LLM] Primary model "${MODEL}" failed. Attempting fallback model "${FALLBACK_MODEL}"...`);
      const fallbackRes = await requestChatCompletion(PROVIDER, primaryApiKey, FALLBACK_MODEL, systemPrompt, userPrompt, THINKING_LEVEL);
      if (fallbackRes) return fallbackRes;
    }
  }

  // 2. Fallback: Attempt secondary provider if API key available
  if (secondaryApiKey) {
    console.warn(`[LLM] Primary provider ${PROVIDER.toUpperCase()} unavailable. Switching to secondary provider ${secondaryProvider.toUpperCase()}...`);
    const secRes = await requestChatCompletion(secondaryProvider, secondaryApiKey, FALLBACK_MODEL || 'deepseek-chat', systemPrompt, userPrompt, THINKING_LEVEL);
    if (secRes) return secRes;
  }

  console.warn('[LLM] No active LLM API keys available or requests failed. Defaulting to deterministic synthesis derivation.');
  return null;
}

async function requestChatCompletion(provider, apiKey, model, systemPrompt, userPrompt, thinkingLevel = 'none') {
  const endpoint = PROVIDER_ENDPOINTS[provider];
  if (!endpoint || !apiKey) return null;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };

  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'http://localhost:3000';
    headers['X-Title'] = 'Sino Cicatrizado (The Scarred Bell)';
  }

  const payload = {
    model: model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' }
  };

  // Configure thinking / reasoning parameters per provider
  const level = (thinkingLevel || 'none').toLowerCase();
  if (provider === 'deepseek') {
    if (level === 'none') {
      payload.thinking = { type: 'disabled' };
    } else {
      payload.thinking = { type: 'enabled', budget_tokens: level === 'low' ? 1024 : 2048 };
    }
  } else if (provider === 'openrouter') {
    if (level === 'none') {
      payload.reasoning = { effort: 'none' };
    } else {
      payload.reasoning = { effort: level };
    }
  }

  let resObj = await sendFetchPayload(endpoint, headers, payload);
  
  // If API rejects additional thinking parameters on standard models, retry without thinking object
  if (!resObj && (payload.thinking || payload.reasoning)) {
    delete payload.thinking;
    delete payload.reasoning;
    delete payload.reasoning_effort;
    resObj = await sendFetchPayload(endpoint, headers, payload);
  }

  return resObj;
}

async function sendFetchPayload(endpoint, headers, payload) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[LLM] API returned status ${response.status}: ${errText}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    // Parse JSON from text response
    const cleanJsonText = content.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanJsonText);
  } catch (err) {
    console.warn(`[LLM] Fetch error:`, err.message);
    return null;
  }
}
