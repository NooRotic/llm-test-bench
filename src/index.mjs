#!/usr/bin/env node
// src/index.mjs — LLM Test Bench CLI
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
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
}

function ask(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
  console.log('\nLLM Test Bench v0.1.0');
  console.log('━━━━━━━━━━━━━━━━━━━━━\n');

  const args = process.argv.slice(2);
  const nonInteractive = args.includes('--all') || args.includes('--local-only') || args.includes('--cloud-only') || !process.stdin.isTTY;
  const includeLocal = !args.includes('--cloud-only');
  const includeCloud = !args.includes('--local-only');
  // --models 1,2,4 to pick specific local models by index
  const modelArg = args.find(a => a.startsWith('--models='));
  const modelIndices = modelArg ? modelArg.split('=')[1].split(',').map(s => parseInt(s.trim()) - 1) : null;

  const providerConfigs = loadJson('config/providers.json');
  const systemPrompts = loadJson('config/system-prompts.json');
  const scenarios = loadJson('config/test-scenarios.json');

  console.log('Loading config...');
  console.log(`  System prompts: ${Object.keys(systemPrompts).length} loaded`);
  console.log(`  Test scenarios: ${scenarios.length} loaded\n`);

  const rl = nonInteractive ? null : readline.createInterface({ input: process.stdin, output: process.stdout });
  const selectedModels = [];

  // Discover LMStudio models
  if (providerConfigs.lmstudio?.enabled && includeLocal) {
    console.log(`Discovering LMStudio models at ${providerConfigs.lmstudio.modelsUrl}...`);
    const localModels = await discoverModels(providerConfigs.lmstudio);

    if (localModels.length === 0) {
      console.log('  No LMStudio models found (server not running?)\n');
    } else {
      console.log(`  Found ${localModels.length} models.\n`);

      if (nonInteractive) {
        // Non-interactive: use --models=1,2 or take all
        if (modelIndices) {
          for (const i of modelIndices) {
            if (i >= 0 && i < localModels.length) selectedModels.push(localModels[i]);
          }
        } else {
          selectedModels.push(...localModels);
        }
        console.log(`  Auto-selected ${selectedModels.length} local model(s)\n`);
      } else {
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
  }

  // Cloud providers
  const claudeKey = getClaudeKey(providerConfigs.claude || {});
  const geminiKey = getGeminiKey(providerConfigs.gemini || {});

  const hasCloud = (claudeKey && providerConfigs.claude?.enabled) || (geminiKey && providerConfigs.gemini?.enabled);

  if (hasCloud && includeCloud) {
    console.log('Cloud providers:');
    if (claudeKey && providerConfigs.claude?.enabled) console.log(`  [✓] Claude (${providerConfigs.claude.model}) — API key found`);
    else console.log('  [ ] Claude — no API key');
    if (geminiKey && providerConfigs.gemini?.enabled) console.log(`  [✓] Gemini (${providerConfigs.gemini.model}) — API key found`);
    else console.log('  [ ] Gemini — no API key');

    let addCloud = true;
    if (!nonInteractive) {
      const answer = await ask(rl, '  Include cloud providers? (Y/n): ');
      addCloud = answer.trim().toLowerCase() !== 'n';
    } else {
      console.log('  Auto-including cloud providers');
    }

    if (addCloud) {
      if (claudeKey && providerConfigs.claude?.enabled) {
        selectedModels.push({ id: providerConfigs.claude.model, provider: 'claude' });
      }
      if (geminiKey && providerConfigs.gemini?.enabled) {
        selectedModels.push({ id: providerConfigs.gemini.model, provider: 'gemini' });
      }
    }
    console.log('');
  }

  if (rl) rl.close();

  if (selectedModels.length === 0) {
    console.log('No models selected. Exiting.');
    return;
  }

  const totalCalls = selectedModels.length * Object.keys(systemPrompts).length * scenarios.length;
  console.log(`Running: ${selectedModels.length} models × ${scenarios.length} scenarios × ${Object.keys(systemPrompts).length} prompts = ${totalCalls} calls`);
  console.log('━'.repeat(60) + '\n');

  const startTime = Date.now();
  const results = await run({ models: selectedModels, systemPrompts, scenarios, providerConfigs, onProgress: printProgress });
  const duration = Date.now() - startTime;

  const summary = buildSummary(results);
  printSummary(summary, selectedModels, systemPrompts, results);

  // Save results
  const runId = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const resultsDir = path.join(ROOT, 'results');
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

  const runData = { runId, timestamp: new Date().toISOString(), duration, config: { systemPrompts, scenarios }, models: selectedModels, results, summary };

  const jsonPath = path.join(resultsDir, `${runId}.json`);
  const htmlPath = path.join(resultsDir, `${runId}.html`);

  fs.writeFileSync(jsonPath, JSON.stringify(runData, null, 2));
  generateHtmlReport(runData, htmlPath);

  console.log(`\nResults saved:`);
  console.log(`  JSON: ${jsonPath}`);
  console.log(`  HTML: ${htmlPath}`);

  try {
    const { exec } = await import('node:child_process');
    exec(`start "" "${htmlPath}"`);
    console.log('\nOpening report in browser...');
  } catch {
    console.log('\nOpen the HTML file in your browser to view the report.');
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
