// src/providers/claude.mjs

export function getApiKey(config) {
  return process.env.ANTHROPIC_API_KEY || config.apiKey || '';
}

export async function callModel(model, systemPrompt, userMessage, config) {
  const apiKey = getApiKey(config);
  if (!apiKey) return { response: null, latencyMs: 0, tokens: {}, error: 'No API key' };
  const start = Date.now();
  try {
    const res = await fetch(config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: model.id,
        max_tokens: config.defaults?.max_tokens ?? 200,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    return { response: text || '', latencyMs: Date.now() - start, tokens: data.usage || {}, error: null };
  } catch (e) {
    return { response: null, latencyMs: Date.now() - start, tokens: {}, error: e.message };
  }
}
