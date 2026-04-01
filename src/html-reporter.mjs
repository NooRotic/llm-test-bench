// src/html-reporter.mjs
import fs from 'node:fs';

const PROVIDER_COLORS = {
  lmstudio: { bg: '#1e1b4b', text: '#a78bfa', bar: '#7c3aed', badge: 'Local' },
  claude: { bg: '#052e16', text: '#86efac', bar: '#22c55e', badge: 'Claude' },
  gemini: { bg: '#431407', text: '#fdba74', bar: '#f97316', badge: 'Gemini' },
};

function esc(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function barPct(ms, maxMs) {
  return Math.min(100, Math.round((ms / Math.max(maxMs, 1)) * 100));
}

export function generateHtmlReport(runData, outputPath) {
  const { results, models, config, summary, timestamp, duration, runId } = runData;
  const scenarios = config.scenarios;
  const systemPrompts = config.systemPrompts;
  const maxLatency = Math.max(...results.filter(r => !r.error).map(r => r.latencyMs), 1);

  // Group: scenario → prompt → model
  const grouped = {};
  for (const r of results) {
    if (!grouped[r.scenarioId]) grouped[r.scenarioId] = {};
    if (!grouped[r.scenarioId][r.systemPromptId]) grouped[r.scenarioId][r.systemPromptId] = {};
    grouped[r.scenarioId][r.systemPromptId][r.model] = r;
  }

  const scenarioCards = scenarios.map(scenario => {
    const promptSections = Object.entries(systemPrompts).map(([promptId, promptCfg]) => {
      const modelCells = models.map(m => {
        const r = grouped[scenario.id]?.[promptId]?.[m.id];
        const color = PROVIDER_COLORS[m.provider] || PROVIDER_COLORS.lmstudio;
        if (!r) return `<div class="model-cell empty">No data</div>`;
        const pct = r.error ? 0 : barPct(r.latencyMs, maxLatency);
        return `<div class="model-cell" style="border-top:3px solid ${color.bar}">
          <div class="model-name" style="color:${color.text}">${esc(m.id.length > 22 ? m.id.substring(0, 22) + '…' : m.id)}</div>
          <span class="badge" style="background:${color.bg};color:${color.text}">${color.badge}</span>
          ${r.error
            ? `<div class="error">✗ ${esc(r.error.substring(0, 80))}</div>`
            : `<div class="latency">${r.latencyMs.toLocaleString()}ms</div>
               <div class="latency-bar"><div style="width:${pct}%;background:${color.bar}"></div></div>
               <div class="response">${esc(r.response)}</div>
               <div class="meta">${r.charCount} chars · ${r.tokens.total || r.tokens.prompt_tokens || '?'} tokens</div>`
          }
        </div>`;
      }).join('');

      return `<div class="prompt-section">
        <div class="prompt-label">${esc(promptCfg.name)}</div>
        <div class="model-grid" style="grid-template-columns:repeat(${models.length},1fr)">${modelCells}</div>
      </div>`;
    }).join('');

    return `<div class="scenario-card">
      <div class="scenario-header">
        <span class="scenario-id">${esc(scenario.id)}</span>
        <span class="scenario-category">${esc(scenario.category)}</span>
      </div>
      <div class="scenario-message">${esc(scenario.user)}: "${esc(scenario.message)}"</div>
      ${promptSections}
    </div>`;
  }).join('');

  // Model summary cards
  const modelCards = models.map(m => {
    const mr = results.filter(r => r.model === m.id && !r.error);
    const avgLat = mr.length ? Math.round(mr.reduce((s, r) => s + r.latencyMs, 0) / mr.length) : 0;
    const avgChars = mr.length ? Math.round(mr.reduce((s, r) => s + r.charCount, 0) / mr.length) : 0;
    const errs = results.filter(r => r.model === m.id && r.error).length;
    const color = PROVIDER_COLORS[m.provider] || PROVIDER_COLORS.lmstudio;
    return `<div class="model-summary" style="border-left:4px solid ${color.bar}">
      <div class="model-summary-name" style="color:${color.text}">${esc(m.id)}</div>
      <span class="badge" style="background:${color.bg};color:${color.text}">${color.badge}</span>
      <div class="model-summary-stats">
        <div>${avgLat.toLocaleString()}ms avg latency</div>
        <div>${avgChars} avg chars</div>
        <div>${mr.length} success · ${errs} errors</div>
      </div>
    </div>`;
  }).join('');

  // Provider latency bars
  const providerBars = Object.entries(summary.byProvider).map(([p, s]) => {
    const color = PROVIDER_COLORS[p] || PROVIDER_COLORS.lmstudio;
    const maxAvg = Math.max(...Object.values(summary.byProvider).map(x => x.avgLatencyMs), 1);
    const pct = barPct(s.avgLatencyMs, maxAvg);
    return `<div class="provider-bar-row">
      <div class="provider-bar-label" style="color:${color.text}">${p}</div>
      <div class="provider-bar-track"><div class="provider-bar-fill" style="width:${pct}%;background:${color.bar}"></div></div>
      <div class="provider-bar-value">${s.avgLatencyMs.toLocaleString()}ms</div>
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LLM Test Bench — ${runId}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0d1117;color:#e6edf3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;line-height:1.5;padding:24px;max-width:1400px;margin:0 auto}
h1{font-size:24px;margin-bottom:4px}
h2{font-size:18px;margin-bottom:16px}
.subtitle{color:#8b949e;font-size:14px;margin-bottom:24px}
.summary-bar{display:flex;gap:16px;margin-bottom:32px;flex-wrap:wrap}
.summary-stat{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px 20px;min-width:120px}
.summary-stat .label{color:#8b949e;font-size:11px;text-transform:uppercase;letter-spacing:0.5px}
.summary-stat .value{font-size:20px;font-weight:600}
.latency-section{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:20px;margin-bottom:32px}
.provider-bar-row{display:flex;align-items:center;gap:12px;margin-bottom:8px}
.provider-bar-label{width:80px;font-size:13px;font-weight:600;text-align:right}
.provider-bar-track{flex:1;height:24px;background:#21262d;border-radius:4px;overflow:hidden}
.provider-bar-fill{height:100%;border-radius:4px;transition:width 0.3s}
.provider-bar-value{width:80px;font-size:13px;color:#8b949e}
.scenario-card{background:#161b22;border:1px solid #30363d;border-radius:8px;margin-bottom:24px;overflow:hidden}
.scenario-header{padding:16px 20px 4px;display:flex;justify-content:space-between;align-items:center}
.scenario-id{font-weight:600;font-size:16px}
.scenario-category{color:#8b949e;font-size:12px;background:#21262d;padding:2px 8px;border-radius:12px}
.scenario-message{padding:0 20px 16px;color:#8b949e;font-style:italic;font-size:14px}
.prompt-section{border-top:1px solid #30363d}
.prompt-label{padding:10px 20px;font-size:13px;font-weight:600;color:#8b949e;background:#0d1117}
.model-grid{display:grid;gap:1px;background:#30363d}
.model-cell{padding:14px 16px;background:#161b22;font-size:13px}
.model-cell.empty{color:#484f58}
.model-name{font-weight:600;font-size:12px;margin-bottom:4px}
.badge{font-size:10px;padding:1px 6px;border-radius:4px;font-weight:600;display:inline-block;margin-bottom:8px}
.latency{font-size:18px;font-weight:600;margin-bottom:4px}
.latency-bar{height:4px;background:#21262d;border-radius:2px;margin-bottom:10px}
.latency-bar div{height:100%;border-radius:2px}
.response{font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:12px;line-height:1.6;color:#c9d1d9;background:#0d1117;padding:10px;border-radius:6px;margin-bottom:8px;white-space:pre-wrap;word-break:break-word;max-height:200px;overflow-y:auto}
.meta{font-size:11px;color:#484f58}
.error{color:#f85149;font-size:12px;margin-top:8px}
.models-section{margin-top:32px}
.model-summaries{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.model-summary{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px}
.model-summary-name{font-weight:600;margin-bottom:4px}
.model-summary-stats{margin-top:8px;font-size:13px;color:#8b949e}
.model-summary-stats div{margin-top:2px}
footer{margin-top:40px;padding-top:20px;border-top:1px solid #30363d;color:#484f58;font-size:12px}
footer a{color:#58a6ff}
@media print{body{background:#fff;color:#000}.scenario-card,.model-summary,.summary-stat,.latency-section{border-color:#ccc;background:#f8f8f8}.response{background:#f0f0f0;color:#333}}
</style>
</head>
<body>
<h1>LLM Test Bench Results</h1>
<div class="subtitle">${runId} · ${models.length} models · ${scenarios.length} scenarios · ${Object.keys(systemPrompts).length} prompts · ${Math.round((duration || 0) / 1000)}s total</div>

<div class="summary-bar">
  <div class="summary-stat"><div class="label">Total Calls</div><div class="value">${summary.totalCalls}</div></div>
  <div class="summary-stat"><div class="label">Successful</div><div class="value" style="color:#3fb950">${summary.successful}</div></div>
  <div class="summary-stat"><div class="label">Errors</div><div class="value" style="color:${summary.errors > 0 ? '#f85149' : '#3fb950'}">${summary.errors}</div></div>
</div>

<div class="latency-section">
  <h2>Average Latency by Provider</h2>
  ${providerBars}
</div>

${scenarioCards}

<div class="models-section">
  <h2>Model Summary</h2>
  <div class="model-summaries">${modelCards}</div>
</div>

<footer>LLM Test Bench v0.1.0 · Generated ${new Date().toISOString()} · <a href="${runId}.json">Raw JSON</a> · C.R.E.A.M.</footer>
</body>
</html>`;

  fs.writeFileSync(outputPath, html);
}
