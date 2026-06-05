#!/usr/bin/env node
// Testa a logica pura do LLM Lab (sem rede): cobertura de keywords,
// agregacao por modelo e concorrencia preservando ordem.
// Espelha as funcoes de app/api/admin/llm-eval/route.ts.

let pass = 0, fail = 0;
function assert(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "✓" : "✗"} ${name}` + (ok ? "" : `  got=${JSON.stringify(got)} want=${JSON.stringify(want)}`));
  ok ? pass++ : fail++;
}

function scoreKeywordCoverage(content, expect) {
  if (!expect || expect.length === 0) return null;
  const lower = content.toLowerCase();
  const hits = expect.filter((kw) => kw.trim() && lower.includes(kw.toLowerCase().trim())).length;
  return Math.round((hits / expect.length) * 100);
}

function aggregate(models, cells) {
  return models.map((model) => {
    const own = cells.filter((c) => c.model === model);
    const ok = own.filter((c) => c.ok);
    const scored = ok.filter((c) => c.score !== null);
    const costs = ok.map((c) => c.costUsd).filter((v) => v !== null);
    return {
      model,
      avgScore: scored.length ? Math.round(scored.reduce((s, c) => s + c.score, 0) / scored.length) : null,
      avgLatencyMs: ok.length ? Math.round(ok.reduce((s, c) => s + c.latencyMs, 0) / ok.length) : 0,
      totalTokens: own.reduce((s, c) => s + c.totalTokens, 0),
      totalCostUsd: costs.length ? costs.reduce((s, v) => s + v, 0) : null,
      okCount: ok.length,
      errorCount: own.length - ok.length,
    };
  });
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// --- Cobertura de keywords ---
assert("cobertura total", scoreKeywordCoverage("Fundado em 1910 no Bom Retiro", ["1910"]), 100);
assert("cobertura parcial 50%", scoreKeywordCoverage("Venceu em 2012", ["2000", "2012"]), 50);
assert("cobertura zero", scoreKeywordCoverage("resposta sem nada", ["xyz"]), 0);
assert("sem keywords = null", scoreKeywordCoverage("qualquer", []), null);
assert("case-insensitive", scoreKeywordCoverage("SOCRATES e Rivelino", ["socrates"]), 100);

// --- Agregacao ---
const cells = [
  { model: "A", ok: true, score: 100, latencyMs: 200, totalTokens: 50, costUsd: 0.001 },
  { model: "A", ok: true, score: 0, latencyMs: 400, totalTokens: 30, costUsd: 0.002 },
  { model: "B", ok: true, score: 50, latencyMs: 100, totalTokens: 20, costUsd: null },
  { model: "B", ok: false, score: null, latencyMs: 999, totalTokens: 0, costUsd: null },
];
const agg = aggregate(["A", "B"], cells);
assert("A avgScore (100,0)->50", agg[0].avgScore, 50);
assert("A avgLatency (200,400)->300", agg[0].avgLatencyMs, 300);
assert("A totalTokens 80", agg[0].totalTokens, 80);
assert("A totalCost 0.003", Number(agg[0].totalCostUsd.toFixed(6)), 0.003);
assert("B okCount 1 / error 1", [agg[1].okCount, agg[1].errorCount], [1, 1]);
assert("B avgLatency ignora erro", agg[1].avgLatencyMs, 100);
assert("B totalCost null (sem custo)", agg[1].totalCostUsd, null);

// --- Concorrencia preserva ordem ---
const order = await mapLimit([1, 2, 3, 4, 5], 2, async (n) => {
  await new Promise((r) => setTimeout(r, (6 - n) * 5)); // inverte tempos
  return n * 10;
});
assert("mapLimit preserva ordem", order, [10, 20, 30, 40, 50]);

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail ? 1 : 0);
