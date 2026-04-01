# LLM Test Bench

Compare AI responses across local (LMStudio) and cloud (Claude, Gemini) providers — same prompts, side-by-side.

## Quick Start

```bash
node src/index.mjs
```

Interactive model discovery picks up whatever LMStudio has loaded. Cloud providers are detected from API keys.

## Requirements

- Node.js 18+
- LMStudio running at `http://127.0.0.1:1234` (for local models)
- API keys for cloud providers (optional)

## Config

Edit JSON files in `config/`:

| File | Purpose |
|------|---------|
| `providers.json` | API URLs, keys, default settings (gitignored — copy from `.example`) |
| `providers.example.json` | Template for providers config |
| `system-prompts.json` | System prompts to test |
| `test-scenarios.json` | User messages / test scenarios |

API keys can also be set via environment variables: `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`.

## How It Works

1. Discovers available LMStudio models via `/v1/models`
2. Asks which local models + cloud providers to include
3. Runs every scenario × system prompt × model combination sequentially
4. Prints terminal summary with latency grid
5. Saves JSON results + static HTML report

## Output

Each run saves to `results/`:
- `YYYY-MM-DDTHH-MM-SS.json` — structured data (all responses, latency, tokens)
- `YYYY-MM-DDTHH-MM-SS.html` — visual report with side-by-side comparison grid

The HTML report features:
- Dark theme (GitHub-style)
- Provider latency bar chart
- Side-by-side response cards per scenario × system prompt
- Model summary cards with avg latency and response length
- Color-coded by provider (purple=local, green=Claude, orange=Gemini)

## Adding Tests

Edit `config/test-scenarios.json`:
```json
{ "id": "my_test", "user": "TestUser", "message": "the prompt", "category": "category" }
```

Edit `config/system-prompts.json`:
```json
{ "my_prompt": { "name": "Display Name", "prompt": "The full system prompt..." } }
```

No code changes needed.

## C.R.E.A.M.

Code Rules Everything Around Me.
