// src/providers/lmstudio.mjs

export async function discoverModels(config) {
  if (!config.enabled) return [];
  try {
    const res = await fetch(config.modelsUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map(m => ({ id: m.id, provider: 'lmstudio' }));
  } catch {
    return [];
  }
}

export async function callModel(model, systemPrompt, userMessage, config) {
  const start = Date.now();
  try {
    const res = await fetch(config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model.id,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: config.defaults?.temperature ?? 0.7,
        max_tokens: config.defaults?.max_tokens ?? 200,
        stream: false,
      }),
      signal: AbortSignal.timeout(30000),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || data.error);
    return { response: data.choices?.[0]?.message?.content || '', latencyMs: Date.now() - start, tokens: data.usage || {}, error: null };
  } catch (e) {
    return { response: null, latencyMs: Date.now() - start, tokens: {}, error: e.message };
  }
}
