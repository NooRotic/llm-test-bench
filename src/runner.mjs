// src/runner.mjs
import * as lmstudio from './providers/lmstudio.mjs';
import * as claude from './providers/claude.mjs';
import * as gemini from './providers/gemini.mjs';

const providers = { lmstudio, claude, gemini };

export async function run({ models, systemPrompts, scenarios, providerConfigs, onProgress }) {
  const results = [];
  const totalCalls = models.length * Object.keys(systemPrompts).length * scenarios.length;
  let completed = 0;

  for (const scenario of scenarios) {
    for (const [promptId, promptConfig] of Object.entries(systemPrompts)) {
      for (const model of models) {
        completed++;
        const label = `${model.id.substring(0, 20)} × ${scenario.id} × ${promptId}`;

        if (onProgress) onProgress({ completed, totalCalls, label, status: 'running' });

        const userMessage = `${scenario.user} asks: ${scenario.message}`;
        const providerModule = providers[model.provider];
        const providerConfig = providerConfigs[model.provider];

        const result = await providerModule.callModel(model, promptConfig.prompt, userMessage, providerConfig);

        results.push({
          scenarioId: scenario.id,
          category: scenario.category,
          systemPromptId: promptId,
          model: model.id,
          provider: model.provider,
          response: result.response,
          latencyMs: result.latencyMs,
          tokens: result.tokens,
          charCount: result.response ? result.response.length : 0,
          error: result.error,
        });

        if (onProgress) {
          onProgress({ completed, totalCalls, label, status: result.error ? 'error' : 'done', latencyMs: result.latencyMs, error: result.error });
        }
      }
    }
  }

  return results;
}

export function buildSummary(results) {
  const byProvider = {};
  for (const r of results) {
    if (!byProvider[r.provider]) byProvider[r.provider] = { calls: 0, totalLatency: 0, errors: 0 };
    byProvider[r.provider].calls++;
    byProvider[r.provider].totalLatency += r.latencyMs;
    if (r.error) byProvider[r.provider].errors++;
  }
  for (const p of Object.values(byProvider)) {
    p.avgLatencyMs = p.calls > 0 ? Math.round(p.totalLatency / p.calls) : 0;
    delete p.totalLatency;
  }
  return {
    totalCalls: results.length,
    successful: results.filter(r => !r.error).length,
    errors: results.filter(r => r.error).length,
    byProvider,
  };
}
