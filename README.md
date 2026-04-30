<p align="center">
  <img src="favicon.png" alt="NooRoticX" width="48"/>
</p>

<h1 align="center">LLM Test Bench</h1>

<p align="center">
  <strong>Same prompts. Multiple models. Side-by-side results.</strong>
</p>

<p align="center">
  Fire identical scenarios at LMStudio (local), Claude, and Gemini.<br/>
  Get a visual report with latency grids and color-coded response cards.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a>
  &nbsp;&middot;&nbsp;
  <a href="#how-it-works">How It Works</a>
  &nbsp;&middot;&nbsp;
  <a href="#configuration">Configuration</a>
  &nbsp;&middot;&nbsp;
  <a href="#output">Output</a>
</p>

---

## Why does this exist?

I was A/B testing personality prompts for the [RipTheAI](https://twitch.tv/nooroticx) Twitch bot across local and cloud models. Needed a way to run the same scenario against multiple LLMs and compare responses without copy-pasting between browser tabs.

This runs the full matrix (scenarios x system prompts x models), prints a terminal summary, and generates a self-contained HTML report that opens in your browser.

## Quick Start

```bash
git clone https://github.com/NooRotic/llm-test-bench.git
cd llm-test-bench
npm install
cp config/providers.example.json config/providers.json
```

Add your API keys to `config/providers.json` (or set `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` as env vars).

Start LMStudio if you want local models, then:

```bash
node src/index.mjs
```

Interactive CLI discovers your models, lets you pick which to include, runs the matrix.

## How It Works

```
1. Discovers LMStudio models via /v1/models
2. Detects cloud providers from API keys
3. You pick which models to run (or --all for non-interactive)
4. Runs every scenario x system prompt x model
5. Prints terminal latency grid
6. Saves JSON + HTML report to results/
```

### CLI Flags

| Flag | What it does |
|------|-------------|
| `--all` | Non-interactive, use all available models |
| `--local-only` | Skip cloud providers |
| `--cloud-only` | Skip LMStudio |
| `--models=1,3` | Select specific local models by index |

## Configuration

All config is JSON files in `config/`. No code changes needed to add tests.

### `providers.json`

```json
{
  "lmstudio": {
    "url": "http://127.0.0.1:1234/v1/chat/completions",
    "modelsUrl": "http://127.0.0.1:1234/v1/models",
    "enabled": true,
    "defaults": { "temperature": 0.7, "max_tokens": 200 }
  },
  "claude": {
    "model": "claude-sonnet-4-20250514",
    "enabled": true,
    "defaults": { "max_tokens": 200 }
  },
  "gemini": {
    "model": "gemini-2.0-flash",
    "enabled": true,
    "defaults": { "maxOutputTokens": 200, "temperature": 0.7 }
  }
}
```

### `test-scenarios.json`

Each scenario is a user message to throw at every model:

```json
{
  "id": "coding_help",
  "user": "DevBoul42",
  "message": "how do I center a div in CSS? been stuck for an hour",
  "category": "technical"
}
```

### `system-prompts.json`

Named system prompts to compare. The whole point: same user message, different personality configs, see which one hits.

```json
{
  "current_unhinged": {
    "name": "Current Unhinged (v1)",
    "prompt": "You are the UNHINGED version of RipTheAI..."
  },
  "new_core": {
    "name": "Pai Mei / Corleone / Malcolm",
    "prompt": "You are RipTheAI. Lethal discipline of Pai Mei..."
  }
}
```

The test matrix is `scenarios x system prompts x models`. Add entries and re-run.

## Output

Each run saves to `results/`:

| File | Content |
|------|---------|
| `YYYY-MM-DDTHH-MM-SS.json` | All responses, latency, token counts |
| `YYYY-MM-DDTHH-MM-SS.html` | Visual report (auto-opens in browser) |

### HTML Report

The report is a single self-contained HTML file. No external dependencies. Dark theme.

What you get:
- **Provider latency bars**: average response time per provider, color-coded
- **Side-by-side response cards**: every scenario x prompt x model with latency bars and full response text
- **Model summary cards**: avg latency, response length, success/error counts
- **Color coding**: purple = local, green = Claude, orange = Gemini

### Terminal Output

```
Provider Latency:
  lmstudio       842ms avg  ████          (6 calls, 0 errors)
  claude         1204ms avg  ██████        (6 calls, 0 errors)
  gemini          523ms avg  ██            (6 calls, 0 errors)
```

## Architecture

```
src/
  index.mjs              # CLI entry point + interactive model selection
  runner.mjs             # Test matrix runner
  terminal-reporter.mjs  # Progress + latency grid for terminal
  html-reporter.mjs      # Self-contained HTML report generator
  providers/
    lmstudio.mjs         # LMStudio OpenAI-compatible client
    claude.mjs           # Anthropic Messages API client
    gemini.mjs           # Gemini generateContent client
```

Adding a new provider = one file in `src/providers/` exporting `callModel()` and `getApiKey()`.

## Requirements

- Node.js 18+
- LMStudio at `http://127.0.0.1:1234` (for local models)
- API keys for cloud providers (optional)

## License

MIT

---

<p align="center">
  <img src="wutang_fullyellow.png" alt="Wu-Tang" width="28"/>
</p>

<p align="center"><strong>C.R.E.A.M.</strong><br/>Code Rules Everything Around Me.</p>
