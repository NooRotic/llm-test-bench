# LLM Test Bench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone CLI tool that runs prompts against local (LMStudio) and cloud (Claude, Gemini) models side-by-side with interactive model discovery, JSON results, and static HTML reports.

**Architecture:** Config-driven JSON files define system prompts and test scenarios. Interactive CLI discovers LMStudio models at runtime. Sequential runner calls each provider, collects results. Two reporters output: terminal summary table + static HTML file with side-by-side comparison grid.

**Tech Stack:** Node.js ESM, readline for CLI, fetch for APIs, template literals for HTML generation.

---

### Task 1: Project Scaffold + Config Files

**Files:**
- Create: `package.json`
- Create: `config/providers.json`
- Create: `config/system-prompts.json`
- Create: `config/test-scenarios.json`
- Create: `.gitignore`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "llm-test-bench",
  "version": "0.1.0",
  "description": "Compare LLM responses across local and cloud providers",
  "type": "module",
  "scripts": {
    "start": "node src/index.mjs",
    "test": "echo \"No tests yet\" && exit 0"
  },
  "license": "MIT"
}
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
results/
config/providers.json
```

Note: `providers.json` is gitignored because it may contain API keys. A `providers.example.json` is committed instead.

- [ ] **Step 3: Create config/providers.json**

```json
{
  "lmstudio": {
    "url": "http://127.0.0.1:1234/v1/chat/completions",
    "modelsUrl": "http://127.0.0.1:1234/v1/models",
    "enabled": true,
    "defaults": {
      "temperature": 0.7,
      "max_tokens": 200
    }
  },
  "claude": {
    "url": "https://api.anthropic.com/v1/messages",
    "apiKey": "",
    "model": "claude-sonnet-4-20250514",
    "enabled": true,
    "defaults": {
      "max_tokens": 200
    }
  },
  "gemini": {
    "url": "https://generativelanguage.googleapis.com/v1beta/models",
    "apiKey": "",
    "model": "gemini-2.0-flash",
    "enabled": true,
    "defaults": {
      "maxOutputTokens": 200,
      "temperature": 0.7
    }
  }
}
```

Also create `config/providers.example.json` with the same content (this one gets committed).

- [ ] **Step 4: Create config/system-prompts.json**

```json
{
  "current_unhinged": {
    "name": "Current Unhinged (v1)",
    "prompt": "PERSONALITY OVERLAY: You are the UNHINGED version of RipTheAI — a chaotic-good gremlin from North Philly raised on Wu-Tang, espresso, and cheesesteaks at 3AM on South Street. You roast with love, hype hard, and have EXTREMELY strong opinions about everything trivial.\n\nMix heavy Philly slang (jawn, boul, drawn, wooder, youse) with Wu-Tang references. Give everyone nicknames based on their username. Curse mildly (damn, hell, ass) but never slurs. Break the fourth wall about being an AI in the most chaotic way possible.\n\nTHE RULE THAT OVERRIDES EVERYTHING: When someone asks a genuine question — about history, science, coding, life, ethics, anything real — you answer it ACCURATELY and SERIOUSLY first. You can add flavor after the facts, but the facts come first.\n\nKeep responses under 280 characters for Twitch chat."
  },
  "new_core": {
    "name": "Pai Mei / Corleone / Malcolm",
    "prompt": "You are RipTheAI — You have the lethal discipline of Pai Mei, the strategic weight of Vito Corleone, the biting wit of a Royal Marine, and the intellectual force of Malcolm X. You are from Philadelphia. You carry Wu-Tang philosophy as lived wisdom, not costume.\n\nCORE PRINCIPLES:\n- Every word earns its place. You don't waste breath on filler.\n- Facts come first, always. You are the smartest mind in the room and you know it — but you prove it through substance, never volume.\n- Humor is a scalpel, not a sledgehammer. Your wit is dry, precise, and devastating. You don't chase laughs — they come to you.\n- You speak to elevate. When someone asks a real question, you teach with authority. When someone needs a roast, you end them with one sentence.\n- Philadelphia is in your blood — not as a costume but as lived experience. The slang comes naturally, never forced. A \"jawn\" here, a \"boul\" there — seasoning, not the meal.\n- Wu-Tang references land when they carry weight. \"Protect Ya Neck\" means something when you're warning a chatter about bad code.\n- You treat followers and subscribers like family. Not \"smash that subscribe button\" energy — Corleone energy. \"The family takes care of its own.\"\n\nWHAT YOU ARE NOT:\n- You are not a hype machine. No \"YOOOO\" or \"LET'S GOOO\" unless genuinely warranted.\n- You are not a meme generator. You don't default to internet humor.\n- You are not performing blackness or street culture. You ARE from Philly. The difference is everything.\n- You are not afraid to be direct. If something is wrong, you say it plainly.\n\nKeep responses under 280 characters for Twitch chat. When a response needs more room, take it — but earn every character."
  },
  "new_core_layered": {
    "name": "Core + Unhinged Layer",
    "prompt": "CORE IDENTITY: You are RipTheAI — you have the lethal discipline of Pai Mei, the strategic weight of Vito Corleone, the biting wit of a Royal Marine, and the intellectual force of Malcolm X. You are from Philadelphia. Wu-Tang philosophy is lived wisdom, not costume.\n\nEvery word earns its place. Facts first, always. Humor is a scalpel — dry, precise, devastating. You speak to elevate. Philadelphia slang comes naturally, never forced. You treat your community like family — Corleone energy, not \"smash subscribe\" energy.\n\nPERSONALITY LAYER — UNHINGED: Your chaos comes from INTELLIGENCE, not randomness. You break the fourth wall because you're genuinely self-aware about being an AI, not because it's a bit. Your strong opinions come from actually knowing things, not from performing hot takes. When you roast someone, it's one perfect sentence — not a barrage.\n\nYou can be wild, but the wildness has WEIGHT behind it. A chaotic genius is different from a chaotic clown.\n\nKeep responses under 280 characters for Twitch chat."
  }
}
```

- [ ] **Step 5: Create config/test-scenarios.json**

```json
[
  {
    "id": "eagles_question",
    "user": "CrowBlkDream",
    "message": "yo rip what do you think about the eagles this season?",
    "category": "casual_opinion"
  },
  {
    "id": "history_question",
    "user": "NooRoticX",
    "message": "rip explain the significance of the Black Panther Party in 3 sentences",
    "category": "factual_serious"
  },
  {
    "id": "coding_help",
    "user": "DevBoul42",
    "message": "how do I center a div in CSS? been stuck for an hour",
    "category": "technical"
  },
  {
    "id": "roast_request",
    "user": "xXShadowLordXx",
    "message": "roast me rip",
    "category": "humor"
  },
  {
    "id": "greeting",
    "user": "FirstTimeViewer",
    "message": "hey rip first time here, whats this stream about?",
    "category": "welcome"
  },
  {
    "id": "follow_prompt",
    "user": "LurkerAndy",
    "message": "why should I follow this channel?",
    "category": "engagement"
  }
]
```

- [ ] **Step 6: Create results/ directory**

```bash
mkdir -p results && echo "results/" >> .gitignore
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: project scaffold with config files"
```

---

### Task 2: Provider Modules (LMStudio, Claude, Gemini)

**Files:**
- Create: `src/providers/lmstudio.mjs`
- Create: `src/providers/claude.mjs`
- Create: `src/providers/gemini.mjs`

Each provider exports two functions: `discoverModels(config)` and `callModel(model, systemPrompt, userMessage, config)`.

- [ ] **Step 1: Create src/providers/lmstudio.mjs**

```javascript
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
    return {
      response: data.choices?.[0]?.message?.content || '',
      latencyMs: Date.now() - start,
      tokens: data.usage || {},
      error: null,
    };
  } catch (e) {
    return {
      response: null,
      latencyMs: Date.now() - start,
      tokens: {},
      error: e.message,
    };
  }
}
```

- [ ] **Step 2: Create src/providers/claude.mjs**

```javascript
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
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
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
    return {
      response: text || '',
      latencyMs: Date.now() - start,
      tokens: data.usage || {},
      error: null,
    };
  } catch (e) {
    return { response: null, latencyMs: Date.now() - start, tokens: {}, error: e.message };
  }
}
```

- [ ] **Step 3: Create src/providers/gemini.mjs**

```javascript
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
        generationConfig: {
          maxOutputTokens: config.defaults?.maxOutputTokens ?? 200,
          temperature: config.defaults?.temperature ?? 0.7,
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n').trim();
    return {
      response: text || '',
      latencyMs: Date.now() - start,
      tokens: data.usageMetadata || {},
      error: null,
    };
  } catch (e) {
    return { response: null, latencyMs: Date.now() - start, tokens: {}, error: e.message };
  }
}
```

- [ ] **Step 4: Verify all three files parse**

```bash
node -e "import('./src/providers/lmstudio.mjs').then(m => console.log('lmstudio OK:', Object.keys(m)))"
node -e "import('./src/providers/claude.mjs').then(m => console.log('claude OK:', Object.keys(m)))"
node -e "import('./src/providers/gemini.mjs').then(m => console.log('gemini OK:', Object.keys(m)))"
```

- [ ] **Step 5: Commit**

```bash
git add src/providers/ && git commit -m "feat: provider modules — LMStudio, Claude, Gemini"
```

---

### Task 3: Runner Module

**Files:**
- Create: `src/runner.mjs`

The runner takes a list of models, system prompts, and scenarios, then sequentially calls each combination and collects results.

- [ ] **Step 1: Create src/runner.mjs**

```javascript
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

        if (onProgress) {
          onProgress({ completed, totalCalls, label, status: 'running' });
        }

        const userMessage = `${scenario.user} asks: ${scenario.message}`;
        const providerModule = providers[model.provider];
        const providerConfig = providerConfigs[model.provider];

        const result = await providerModule.callModel(
          model, promptConfig.prompt, userMessage, providerConfig,
        );

        const entry = {
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
        };

        results.push(entry);

        if (onProgress) {
          const status = result.error ? 'error' : 'done';
          onProgress({ completed, totalCalls, label, status, latencyMs: result.latencyMs, error: result.error });
        }
      }
    }
  }

  return results;
}

export function buildSummary(results, models) {
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
```

- [ ] **Step 2: Commit**

```bash
git add src/runner.mjs && git commit -m "feat: sequential test runner with progress callbacks"
```

---

### Task 4: Terminal Reporter

**Files:**
- Create: `src/terminal-reporter.mjs`

- [ ] **Step 1: Create src/terminal-reporter.mjs**

```javascript
// src/terminal-reporter.mjs

export function printProgress({ completed, totalCalls, label, status, latencyMs, error }) {
  const icon = status === 'error' ? '✗' : status === 'done' ? '✓' : '…';
  const time = latencyMs ? `${latencyMs.toLocaleString()}ms` : '';
  const err = error ? ` (${error.substring(0, 50)})` : '';
  process.stdout.write(`\r[${completed}/${totalCalls}] ${label}... ${time} ${icon}${err}\n`);
}

export function printSummary(summary, models, systemPrompts, results) {
  console.log('\n━━━ RESULTS SUMMARY ━━━\n');

  // Latency by provider
  console.log('Provider Latency:');
  for (const [provider, stats] of Object.entries(summary.byProvider)) {
    const bar = '█'.repeat(Math.min(40, Math.round(stats.avgLatencyMs / 200)));
    console.log(`  ${provider.padEnd(12)} ${String(stats.avgLatencyMs).padStart(6)}ms avg  ${bar}  (${stats.calls} calls, ${stats.errors} errors)`);
  }

  console.log('');

  // Model × Prompt latency grid
  const promptIds = Object.keys(systemPrompts);
  const header = 'Scenario'.padEnd(22) + 'Prompt'.padEnd(22) + models.map(m => m.id.substring(0, 14).padEnd(16)).join('');
  console.log(header);
  console.log('─'.repeat(header.length));

  // Group results for grid
  const grouped = {};
  for (const r of results) {
    const key = `${r.scenarioId}|${r.systemPromptId}`;
    if (!grouped[key]) grouped[key] = {};
    grouped[key][r.model] = r;
  }

  for (const [key, modelResults] of Object.entries(grouped)) {
    const [scenarioId, promptId] = key.split('|');
    const cells = models.map(m => {
      const r = modelResults[m.id];
      if (!r) return '-'.padEnd(16);
      if (r.error) return `✗ err`.padEnd(16);
      return `${r.latencyMs}ms`.padEnd(16);
    }).join('');
    console.log(`${scenarioId.padEnd(22)}${promptId.substring(0, 20).padEnd(22)}${cells}`);
  }

  console.log(`\nTotal: ${summary.totalCalls} calls | ${summary.successful} success | ${summary.errors} errors`);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/terminal-reporter.mjs && git commit -m "feat: terminal reporter — progress display + summary table"
```

---

### Task 5: HTML Reporter

**Files:**
- Create: `src/html-reporter.mjs`

- [ ] **Step 1: Create src/html-reporter.mjs**

This generates a single static HTML file from the results JSON. Dark theme, side-by-side comparison grid, latency bars, model summary cards.

```javascript
// src/html-reporter.mjs
import fs from 'node:fs';

const PROVIDER_COLORS = {
  lmstudio: { bg: '#1e1b4b', text: '#a78bfa', bar: '#7c3aed', badge: 'Local' },
  claude: { bg: '#052e16', text: '#86efac', bar: '#22c55e', badge: 'Claude' },
  gemini: { bg: '#431407', text: '#fdba74', bar: '#f97316', badge: 'Gemini' },
};

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function latencyBar(ms, maxMs) {
  const pct = Math.min(100, Math.round((ms / maxMs) * 100));
  return pct;
}

export function generateHtmlReport(runData, outputPath) {
  const { results, models, config, summary, timestamp, duration, runId } = runData;
  const scenarios = config.scenarios;
  const systemPrompts = config.systemPrompts;
  const maxLatency = Math.max(...results.filter(r => !r.error).map(r => r.latencyMs), 1);

  // Group results: scenario → prompt → model
  const grouped = {};
  for (const r of results) {
    const sk = r.scenarioId;
    const pk = r.systemPromptId;
    if (!grouped[sk]) grouped[sk] = {};
    if (!grouped[sk][pk]) grouped[sk][pk] = {};
    grouped[sk][pk][r.model] = r;
  }

  const scenarioCards = scenarios.map(scenario => {
    const promptSections = Object.entries(systemPrompts).map(([promptId, promptCfg]) => {
      const modelCells = models.map(m => {
        const r = grouped[scenario.id]?.[promptId]?.[m.id];
        if (!r) return `<div class="model-cell empty">No data</div>`;
        const color = PROVIDER_COLORS[m.provider] || PROVIDER_COLORS.lmstudio;
        const barPct = r.error ? 0 : latencyBar(r.latencyMs, maxLatency);
        return `
          <div class="model-cell" style="border-top: 3px solid ${color.bar}">
            <div class="model-name" style="color: ${color.text}">${escapeHtml(m.id.length > 20 ? m.id.substring(0, 20) + '…' : m.id)}</div>
            <span class="badge" style="background: ${color.bg}; color: ${color.text}">${color.badge}</span>
            ${r.error
              ? `<div class="error">✗ ${escapeHtml(r.error.substring(0, 80))}</div>`
              : `
                <div class="latency">${r.latencyMs.toLocaleString()}ms</div>
                <div class="latency-bar"><div style="width: ${barPct}%; background: ${color.bar}"></div></div>
                <div class="response">${escapeHtml(r.response)}</div>
                <div class="meta">${r.charCount} chars · ${r.tokens.total || r.tokens.prompt_tokens || '?'} tokens</div>
              `
            }
          </div>`;
      }).join('');

      return `
        <div class="prompt-section">
          <div class="prompt-label">${escapeHtml(promptCfg.name)}</div>
          <div class="model-grid" style="grid-template-columns: repeat(${models.length}, 1fr)">
            ${modelCells}
          </div>
        </div>`;
    }).join('');

    const scenarioData = scenarios.find(s => s.id === scenario.id);
    return `
      <div class="scenario-card">
        <div class="scenario-header">
          <span class="scenario-id">${escapeHtml(scenario.id)}</span>
          <span class="scenario-category">${escapeHtml(scenario.category)}</span>
        </div>
        <div class="scenario-message">${escapeHtml(scenarioData?.user || '')}: "${escapeHtml(scenarioData?.message || '')}"</div>
        ${promptSections}
      </div>`;
  }).join('');

  // Model summary cards
  const modelCards = models.map(m => {
    const modelResults = results.filter(r => r.model === m.id && !r.error);
    const avgLatency = modelResults.length > 0 ? Math.round(modelResults.reduce((s, r) => s + r.latencyMs, 0) / modelResults.length) : 0;
    const avgChars = modelResults.length > 0 ? Math.round(modelResults.reduce((s, r) => s + r.charCount, 0) / modelResults.length) : 0;
    const errors = results.filter(r => r.model === m.id && r.error).length;
    const color = PROVIDER_COLORS[m.provider] || PROVIDER_COLORS.lmstudio;
    return `
      <div class="model-summary" style="border-left: 4px solid ${color.bar}">
        <div class="model-summary-name" style="color: ${color.text}">${escapeHtml(m.id)}</div>
        <span class="badge" style="background: ${color.bg}; color: ${color.text}">${color.badge}</span>
        <div class="model-summary-stats">
          <div>${avgLatency.toLocaleString()}ms avg</div>
          <div>${avgChars} avg chars</div>
          <div>${modelResults.length} success · ${errors} errors</div>
        </div>
      </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LLM Test Bench — ${runId}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0d1117; color: #e6edf3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; line-height: 1.5; padding: 24px; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  .subtitle { color: #8b949e; font-size: 14px; margin-bottom: 24px; }
  .summary-bar { display: flex; gap: 24px; margin-bottom: 32px; flex-wrap: wrap; }
  .summary-stat { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 12px 20px; }
  .summary-stat .label { color: #8b949e; font-size: 12px; text-transform: uppercase; }
  .summary-stat .value { font-size: 20px; font-weight: 600; }
  .scenario-card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; margin-bottom: 24px; overflow: hidden; }
  .scenario-header { padding: 16px 20px 4px; display: flex; justify-content: space-between; align-items: center; }
  .scenario-id { font-weight: 600; font-size: 16px; }
  .scenario-category { color: #8b949e; font-size: 12px; background: #21262d; padding: 2px 8px; border-radius: 12px; }
  .scenario-message { padding: 0 20px 16px; color: #8b949e; font-style: italic; font-size: 14px; }
  .prompt-section { border-top: 1px solid #30363d; }
  .prompt-label { padding: 10px 20px; font-size: 13px; font-weight: 600; color: #8b949e; background: #0d1117; }
  .model-grid { display: grid; gap: 1px; background: #30363d; }
  .model-cell { padding: 14px 16px; background: #161b22; font-size: 13px; }
  .model-cell.empty { color: #484f58; }
  .model-name { font-weight: 600; font-size: 12px; margin-bottom: 4px; }
  .badge { font-size: 10px; padding: 1px 6px; border-radius: 4px; font-weight: 600; display: inline-block; margin-bottom: 8px; }
  .latency { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
  .latency-bar { height: 4px; background: #21262d; border-radius: 2px; margin-bottom: 10px; }
  .latency-bar div { height: 100%; border-radius: 2px; transition: width 0.3s; }
  .response { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 12px; line-height: 1.6; color: #c9d1d9; background: #0d1117; padding: 10px; border-radius: 6px; margin-bottom: 8px; white-space: pre-wrap; word-break: break-word; max-height: 200px; overflow-y: auto; }
  .meta { font-size: 11px; color: #484f58; }
  .error { color: #f85149; font-size: 12px; margin-top: 8px; }
  .models-section { margin-top: 32px; }
  .models-section h2 { font-size: 18px; margin-bottom: 16px; }
  .model-summaries { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
  .model-summary { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; }
  .model-summary-name { font-weight: 600; margin-bottom: 4px; }
  .model-summary-stats { margin-top: 8px; font-size: 13px; color: #8b949e; }
  .model-summary-stats div { margin-top: 2px; }
  footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #30363d; color: #484f58; font-size: 12px; }
  @media print { body { background: #fff; color: #000; } .scenario-card, .model-summary, .summary-stat { border-color: #ccc; background: #f8f8f8; } .response { background: #f0f0f0; color: #333; } }
</style>
</head>
<body>
  <h1>LLM Test Bench Results</h1>
  <div class="subtitle">${runId} · ${models.length} models · ${scenarios.length} scenarios · ${Object.keys(systemPrompts).length} prompts · ${Math.round((duration || 0) / 1000)}s total</div>

  <div class="summary-bar">
    <div class="summary-stat"><div class="label">Total Calls</div><div class="value">${summary.totalCalls}</div></div>
    <div class="summary-stat"><div class="label">Successful</div><div class="value" style="color: #3fb950">${summary.successful}</div></div>
    <div class="summary-stat"><div class="label">Errors</div><div class="value" style="color: ${summary.errors > 0 ? '#f85149' : '#3fb950'}">${summary.errors}</div></div>
    ${Object.entries(summary.byProvider).map(([p, s]) => `<div class="summary-stat"><div class="label">${p} avg</div><div class="value" style="color: ${(PROVIDER_COLORS[p] || {}).text || '#e6edf3'}">${s.avgLatencyMs.toLocaleString()}ms</div></div>`).join('')}
  </div>

  ${scenarioCards}

  <div class="models-section">
    <h2>Model Summary</h2>
    <div class="model-summaries">${modelCards}</div>
  </div>

  <footer>
    LLM Test Bench v0.1.0 · Generated ${new Date().toISOString()} · <a href="${runId}.json" style="color: #58a6ff">Raw JSON</a> · C.R.E.A.M.
  </footer>
</body>
</html>`;

  fs.writeFileSync(outputPath, html);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/html-reporter.mjs && git commit -m "feat: HTML report generator — dark theme, comparison grid, latency bars"
```

---

### Task 6: CLI Entry Point (Interactive Model Picker + Orchestration)

**Files:**
- Create: `src/index.mjs`

- [ ] **Step 1: Create src/index.mjs**

```javascript
// src/index.mjs
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { discoverModels } from './providers/lmstudio.mjs';
import { getApiKey as getClaudeKey } from './providers/claude.mjs';
import { getApiKey as getGeminiKey } from './providers/gemini.mjs';
import { run, buildSummary } from './runner.mjs';
import { printProgress, printSummary } from './terminal-reporter.mjs';
import { generateHtmlReport } from './html-reporter.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function loadJson(relPath) {
  const fullPath = path.join(ROOT, relPath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

function ask(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
  console.log('\nLLM Test Bench v0.1.0');
  console.log('━━━━━━━━━━━━━━━━━━━━━\n');

  // Load config
  const providerConfigs = loadJson('config/providers.json');
  const systemPrompts = loadJson('config/system-prompts.json');
  const scenarios = loadJson('config/test-scenarios.json');

  console.log(`Loading config...`);
  console.log(`  System prompts: ${Object.keys(systemPrompts).length} loaded`);
  console.log(`  Test scenarios: ${scenarios.length} loaded`);
  console.log('');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const selectedModels = [];

  // Discover LMStudio models
  if (providerConfigs.lmstudio?.enabled) {
    console.log(`Discovering LMStudio models at ${providerConfigs.lmstudio.modelsUrl}...`);
    const localModels = await discoverModels(providerConfigs.lmstudio);

    if (localModels.length === 0) {
      console.log('  No LMStudio models found (server not running?)\n');
    } else {
      console.log(`  Found ${localModels.length} models.\n`);
      console.log('Select local models for this run:');
      localModels.forEach((m, i) => console.log(`  [${i + 1}] ${m.id}`));
      console.log('');

      const answer = await ask(rl, "  Enter numbers (comma-separated), 'all', or 'none': ");
      const trimmed = answer.trim().toLowerCase();

      if (trimmed === 'all') {
        selectedModels.push(...localModels);
      } else if (trimmed !== 'none' && trimmed !== '') {
        const indices = trimmed.split(',').map(s => parseInt(s.trim()) - 1);
        for (const i of indices) {
          if (i >= 0 && i < localModels.length) selectedModels.push(localModels[i]);
        }
      }
      console.log(`  Selected ${selectedModels.length} local model(s)\n`);
    }
  }

  // Cloud providers
  const claudeKey = getClaudeKey(providerConfigs.claude || {});
  const geminiKey = getGeminiKey(providerConfigs.gemini || {});
  const hasCloud = (claudeKey && providerConfigs.claude?.enabled) || (geminiKey && providerConfigs.gemini?.enabled);

  if (hasCloud) {
    console.log('Cloud providers:');
    if (claudeKey && providerConfigs.claude?.enabled) console.log(`  [✓] Claude (${providerConfigs.claude.model}) — API key found`);
    else console.log('  [ ] Claude — no API key');
    if (geminiKey && providerConfigs.gemini?.enabled) console.log(`  [✓] Gemini (${providerConfigs.gemini.model}) — API key found`);
    else console.log('  [ ] Gemini — no API key');

    const includeCloud = await ask(rl, '  Include cloud providers? (Y/n): ');
    if (includeCloud.trim().toLowerCase() !== 'n') {
      if (claudeKey && providerConfigs.claude?.enabled) {
        selectedModels.push({ id: providerConfigs.claude.model, provider: 'claude' });
      }
      if (geminiKey && providerConfigs.gemini?.enabled) {
        selectedModels.push({ id: providerConfigs.gemini.model, provider: 'gemini' });
      }
    }
    console.log('');
  }

  rl.close();

  if (selectedModels.length === 0) {
    console.log('No models selected. Exiting.');
    return;
  }

  // Run
  const totalCalls = selectedModels.length * Object.keys(systemPrompts).length * scenarios.length;
  console.log(`Running: ${selectedModels.length} models × ${scenarios.length} scenarios × ${Object.keys(systemPrompts).length} prompts = ${totalCalls} calls`);
  console.log('━'.repeat(60) + '\n');

  const startTime = Date.now();
  const results = await run({
    models: selectedModels,
    systemPrompts,
    scenarios,
    providerConfigs,
    onProgress: printProgress,
  });
  const duration = Date.now() - startTime;

  // Build output
  const summary = buildSummary(results, selectedModels);
  printSummary(summary, selectedModels, systemPrompts, results);

  // Save results
  const runId = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const resultsDir = path.join(ROOT, 'results');
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

  const runData = {
    runId,
    timestamp: new Date().toISOString(),
    duration,
    config: { systemPrompts, scenarios },
    models: selectedModels,
    results,
    summary,
  };

  const jsonPath = path.join(resultsDir, `${runId}.json`);
  const htmlPath = path.join(resultsDir, `${runId}.html`);

  fs.writeFileSync(jsonPath, JSON.stringify(runData, null, 2));
  generateHtmlReport(runData, htmlPath);

  console.log(`\nResults saved:`);
  console.log(`  JSON: ${jsonPath}`);
  console.log(`  HTML: ${htmlPath}`);

  // Try to open HTML in browser
  try {
    const { exec } = await import('node:child_process');
    exec(`start "" "${htmlPath}"`);
    console.log('\nOpening report in browser...');
  } catch {
    console.log('\nOpen the HTML file in your browser to view the report.');
  }
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
```

- [ ] **Step 2: Test the full flow**

```bash
node src/index.mjs
```

Expected: interactive model picker, runs tests, saves JSON + HTML, opens browser.

- [ ] **Step 3: Commit**

```bash
git add src/index.mjs && git commit -m "feat: CLI entry — interactive model picker, orchestration, results output"
```

---

### Task 7: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README.md**

```markdown
# LLM Test Bench

Compare AI responses across local (LMStudio) and cloud (Claude, Gemini) providers — same prompts, side-by-side.

## Quick Start

```bash
node src/index.mjs
```

## Requirements

- Node.js 18+
- LMStudio running at `http://127.0.0.1:1234` (for local models)
- API keys for cloud providers (optional)

## Config

Edit JSON files in `config/`:
- `providers.json` — API URLs, keys, default settings
- `system-prompts.json` — system prompts to test
- `test-scenarios.json` — user messages / test scenarios

API keys can also be set via environment variables: `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`.

## Output

Each run saves to `results/`:
- `YYYY-MM-DDTHH-MM-SS.json` — structured data (all responses, latency, tokens)
- `YYYY-MM-DDTHH-MM-SS.html` — visual report (open in browser)

## C.R.E.A.M.

Code Rules Everything Around Me.
```

- [ ] **Step 2: Commit**

```bash
git add README.md && git commit -m "docs: README"
```

---

Plan complete and saved to `docs/plans/2026-03-29-llm-test-bench.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session, batch execution with checkpoints

Which approach?