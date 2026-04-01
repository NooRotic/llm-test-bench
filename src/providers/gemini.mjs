// src/providers/gemini.mjs

export function getApiKey(config) {
  return process.env.GEMINI_API_KEY || config.apiKey || '';
}

export async function callModel(model, systemPrompt, userMessage, config) {
  const apiKey = getApiKey(config);
  if (!apiKey) return { response: null, latencyMs: 0, tokens: {}, error: 'No API key' };
  const start = Date.now();
  try {
    const url = `${config.url}/${model.id}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { maxOutputTokens: config.defaults?.maxOutputTokens ?? 200, temperature: config.defaults?.temperature ?? 0.7 },
      }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n').trim();
    return { response: text || '', latencyMs: Date.now() - start, tokens: data.usageMetadata || {}, error: null };
  } catch (e) {
    return { response: null, latencyMs: Date.now() - start, tokens: {}, error: e.message };
  }
}
