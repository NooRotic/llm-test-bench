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
      if (r.error) return '✗ err'.padEnd(16);
      return `${r.latencyMs}ms`.padEnd(16);
    }).join('');
    console.log(`${scenarioId.padEnd(22)}${promptId.substring(0, 20).padEnd(22)}${cells}`);
  }

  console.log(`\nTotal: ${summary.totalCalls} calls | ${summary.successful} success | ${summary.errors} errors`);
}
