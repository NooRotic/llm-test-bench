# LLM Test Bench — Design Spec

**Date:** 2026-03-29
**Status:** Approved
**Repo:** `c:\Dev\projects\RipTheAI_bot\llm-test-bench`

## Purpose

A standalone CLI tool for running prompts against local (LMStudio) and cloud (Claude, Gemini) models side-by-side. Interactive model discovery, configurable test suites via JSON files, structured results with terminal summary and static HTML report.

**Primary use case:** "How does my free local 14B model compare to Claude Sonnet on the same prompt? Is the quality gap worth the cost? How much slower is local?"

**Secondary use case (Phase 2):** Quality scoring, benchmarking metrics, web dashboard for trend analysis.

### Design constraints

- Zero coupling to any bot or application — standalone tool
- Config-driven: JSON files for prompts and scenarios, no code changes to add tests
- Interactive model discovery at runtime (no stale config)
- Results are portable JSON files + generated HTML reports

---

## Tech Stack

- Node.js (ESM, no TypeScript — keep it simple for a utility)
- `readline` for interactive CLI
- `fetch` for all API calls
- No framework for HTML report — template literals, inline CSS

---

## Project Structure

```
llm-test-bench/
  config/
    system-prompts.json      ← system prompts to test
    test-scenarios.json      ← user messages / test cases
    providers.json           ← API URLs, keys, provider settings
  results/                   ← one JSON + one HTML per run
  src/
    index.mjs                ← CLI entry: interactive model picker, run orchestration
    providers/
      lmstudio.mjs           ← OpenAI-compat chat completions
      claude.mjs             ← Anthropic Messages API
      gemini.mjs             ← Google Gemini generateContent
    runner.mjs               ← core loop: scenarios × prompts × models
    terminal-reporter.mjs    ← prints summary tables to terminal
    html-reporter.mjs        ← generates static HTML report from results
  package.json
  README.md
```

---

## CLI Flow

```
$ node src/index.mjs

LLM Test Bench v0.1.0
━━━━━━━━━━━━━━━━━━━━━

Loading config...
  System prompts: 3 loaded
  Test scenarios: 6 loaded

Discovering LMStudio models at http://127.0.0.1:1234...
  Found 9 models.

Select local models for this run:
  [1] qwen2.5-14b-instruct
  [2] deepseek-r1-distill-qwen-14b
  [3] qwen3.5-35b-a3b-uncensored
  [4] mistralai/mistral-7b-instruct-v0.3
  [5] llama-3.2-1b-lewd-mental-occult
  ...
  Enter numbers (comma-separated) or 'all' or 'none': 1,2

Cloud providers:
  [✓] Claude (claude-sonnet-4-20250514) — API key found
  [✓] Gemini (gemini-2.0-flash) — API key found
  Include cloud providers? (Y/n): y

Running: 4 models × 6 scenarios × 3 prompts = 72 calls
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1/72] qwen2.5-14b × eagles × current_unhinged... 7,200ms ✓
[2/72] qwen2.5-14b × eagles × new_core... 6,800ms ✓
...

━━━ RESULTS ━━━

Results saved:
  JSON: results/2026-03-29T12-00-00.json
  HTML: results/2026-03-29T12-00-00.html

Opening report in browser...
```

---

## Config Files

### providers.json

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

API keys can be in the config file OR in environment variables (`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`). Env vars take precedence.

### system-prompts.json

```json
{
  "current_unhinged": {
    "name": "Current Unhinged (v1)",
    "prompt": "PERSONALITY OVERLAY: You are the UNHINGED version of RipTheAI..."
  },
  "new_core": {
    "name": "Pai Mei / Corleone / Malcolm",
    "prompt": "You are RipTheAI — You have the lethal discipline of Pai Mei..."
  },
  "new_core_layered": {
    "name": "Core + Unhinged Layer",
    "prompt": "CORE IDENTITY: You are RipTheAI — you have the lethal discipline..."
  }
}
```

### test-scenarios.json

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

---

## Provider Implementations

### LMStudio (OpenAI-compat)

```javascript
// POST http://127.0.0.1:1234/v1/chat/completions
{
  model: "qwen2.5-14b-instruct",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage }
  ],
  temperature: 0.7,
  max_tokens: 200,
  stream: false
}
```

Response: `data.choices[0].message.content`, `data.usage`, `data.model`

### Claude (Anthropic Messages API)

```javascript
// POST https://api.anthropic.com/v1/messages
{
  model: "claude-sonnet-4-20250514",
  max_tokens: 200,
  system: systemPrompt,
  messages: [{ role: "user", content: userMessage }]
}
// Headers: x-api-key, anthropic-version: 2023-06-01
```

Response: `data.content[0].text`, `data.usage`, `data.model`

### Gemini (generateContent)

```javascript
// POST https://.../{model}:generateContent?key=API_KEY
{
  systemInstruction: { parts: [{ text: systemPrompt }] },
  contents: [{ role: "user", parts: [{ text: userMessage }] }],
  generationConfig: { maxOutputTokens: 200, temperature: 0.7 }
}
```

Response: `data.candidates[0].content.parts[0].text`, `data.usageMetadata`

---

## Results JSON

```json
{
  "runId": "2026-03-29T12-00-00",
  "timestamp": "2026-03-29T12:00:00.000Z",
  "duration": 184000,
  "config": {
    "systemPrompts": { "...": "..." },
    "scenarios": [ "..." ]
  },
  "models": [
    { "id": "qwen2.5-14b-instruct", "provider": "lmstudio" },
    { "id": "claude-sonnet-4-20250514", "provider": "claude" },
    { "id": "gemini-2.0-flash", "provider": "gemini" }
  ],
  "results": [
    {
      "scenarioId": "eagles_question",
      "systemPromptId": "new_core",
      "model": "qwen2.5-14b-instruct",
      "provider": "lmstudio",
      "response": "The Eagles are looking strong...",
      "latencyMs": 7200,
      "tokens": { "prompt": 143, "completion": 84, "total": 227 },
      "charCount": 187,
      "error": null
    }
  ],
  "summary": {
    "totalCalls": 72,
    "successful": 71,
    "errors": 1,
    "byProvider": {
      "lmstudio": { "calls": 36, "avgLatencyMs": 7500, "errors": 1 },
      "claude": { "calls": 18, "avgLatencyMs": 1400, "errors": 0 },
      "gemini": { "calls": 18, "avgLatencyMs": 800, "errors": 0 }
    }
  }
}
```

---

## HTML Report Layout

Single static HTML file, dark theme, no dependencies. Generated from results JSON.

### Header Section
- Run timestamp, total duration, model count, scenario count
- Summary stats bar: total calls, success rate, avg latency per provider

### Comparison Grid (main content)
For each test scenario:

```
┌─────────────────────────────────────────────────────────┐
│ eagles_question (casual_opinion)                         │
│ User: CrowBlkDream                                       │
│ "yo rip what do you think about the eagles this season?" │
├──────────────┬──────────────┬──────────────┬────────────┤
│ System: current_unhinged                                 │
├──────────────┬──────────────┬──────────────┬────────────┤
│ qwen2.5-14b  │ deepseek-14b │ Claude       │ Gemini     │
│ 7,200ms      │ 12,100ms     │ 1,400ms      │ 800ms      │
│              │              │              │            │
│ "Yo Eagles   │ "The Eagles  │ "Eagles are  │ "Philly's  │
│  looking..." │  have a..."  │  positioned."│  finest..."│
│              │              │              │            │
│ 187 chars    │ 210 chars    │ 156 chars    │ 134 chars  │
│ 227 tokens   │ 312 tokens   │ 89 tokens    │ 71 tokens  │
├──────────────┴──────────────┴──────────────┴────────────┤
│ System: new_core (Pai Mei / Corleone / Malcolm)          │
├──────────────┬──────────────┬──────────────┬────────────┤
│ qwen2.5-14b  │ deepseek-14b │ Claude       │ Gemini     │
│ 6,800ms      │ 11,500ms     │ 1,200ms      │ 750ms      │
│ "The Eagles  │ "Facts first │ "Eagles have │ "Philly    │
│  represent.."│  — this..."  │  the talent."│  DNA runs."│
└──────────────┴──────────────┴──────────────┴────────────┘
```

### Latency Comparison Section
- Horizontal bar chart per provider (CSS-only, no JS charting library)
- Color-coded: local models = blue/purple, Claude = green, Gemini = orange
- Shows min/avg/max per provider

### Per-Model Summary Cards
For each model tested:
- Provider badge (Local / Claude / Gemini)
- Average latency, total tokens, avg response length
- Error count if any

### Footer
- Config used: which system prompts, which scenarios
- Link to raw JSON file

### Style
- Dark background (#0d1117), light text (#e6edf3) — GitHub dark theme
- Monospace for responses (code-block style)
- Provider color coding consistent throughout
- Responsive — works on any screen width
- Print-friendly (light mode @media print)

---

## Runner Logic

### Execution order

Sequential — one call at a time. Reasons:
1. Local models can only process one request at a time (GPU bound)
2. Predictable latency measurements (no contention)
3. Cloud rate limits won't be hit

### Progress display

```
[12/72] deepseek-14b × history × new_core... 14,200ms ✓
[13/72] deepseek-14b × coding × new_core... ✗ Model is unloaded
```

### Error handling

- Model unloaded mid-run → log error, continue with next
- API key invalid → log error, skip that provider
- Timeout (30s for local, 15s for cloud) → log timeout, continue
- Network error → log, continue

Never abort the full run for a single failure.

---

## What's NOT in v1

- Web dashboard (Phase 2)
- Quality scoring / rating system
- Parallel execution
- Model downloading / management
- Prompt suggestion / generation
- Historical trend analysis across runs
- A/B statistical significance testing

---

## Success Criteria

1. Interactive model discovery from LMStudio works
2. Same prompt runs against local + cloud models in one session
3. Results saved as JSON with all data preserved
4. HTML report opens in browser with readable side-by-side comparison
5. Terminal shows summary table during and after run
6. Adding new prompts or scenarios requires only editing JSON files
