import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * LLM Lab — Golden Set Eval (tecnica 3 do video do Lucas Montano).
 *
 * Roda um conjunto fixo de prompts ("golden set") contra varios modelos
 * do OpenRouter e mede, por modelo: cobertura de keywords (heuristica),
 * latencia real, tokens e CUSTO REAL (usage.cost do OpenRouter).
 *
 * Persistencia: golden set + ultimo resultado ficam em `site_config`
 * (tabela key-value ja existente) como JSON. ZERO migration — nao toca
 * o schema do banco produtivo compartilhado.
 *
 * SEGURANCA: este endpoint queima creditos do OpenRouter por chamada,
 * entao exige admin no proprio handler (nao basta a UI estar gated).
 */

const GOLDEN_SET_KEY = "llm_golden_set";
const EVAL_LAST_KEY = "llm_eval_last";
const EVAL_HISTORY_KEY = "llm_eval_history";
/** Quantos runs manter no historico (parametro pra analise ao longo do tempo). */
const HISTORY_MAX = 20;

/** Teto da matriz prompts × modelos por execucao (evita rodadas gigantes). */
const MAX_MATRIX = 25;
/** Concorrencia de chamadas simultaneas ao OpenRouter. */
const CONCURRENCY = 4;
/** Chars de resposta guardados ao persistir (texto completo so na resposta viva). */
const PERSIST_CONTENT_CHARS = 300;
/** Timeout por chamada de modelo. */
const CALL_TIMEOUT_MS = 45_000;

export interface GoldenPrompt {
  id: string;
  prompt: string;
  /** Keywords que idealmente aparecem na resposta (case-insensitive). */
  expect: string[];
}

interface CellResult {
  promptId: string;
  model: string;
  ok: boolean;
  error?: string;
  content: string;
  latencyMs: number;
  totalTokens: number;
  costUsd: number | null;
  /** Cobertura de keywords 0-100, ou null se o prompt nao define expect[]. */
  score: number | null;
}

interface ModelAggregate {
  model: string;
  avgScore: number | null;
  avgLatencyMs: number;
  totalTokens: number;
  totalCostUsd: number | null;
  okCount: number;
  errorCount: number;
}

interface EvalRun {
  ranAt: string;
  models: string[];
  prompts: GoldenPrompt[];
  cells: CellResult[];
  aggregates: ModelAggregate[];
}

/** Resumo leve de um run, guardado no historico (sem cells/respostas — so metricas). */
interface HistoryEntry {
  ranAt: string;
  models: string[];
  promptCount: number;
  systemPromptUsed: boolean;
  aggregates: ModelAggregate[];
}

const DEFAULT_GOLDEN_SET: GoldenPrompt[] = [
  { id: "fundacao", prompt: "Em que ano o Corinthians foi fundado?", expect: ["1910"] },
  {
    id: "mundiais",
    prompt: "Quantos titulos mundiais o Corinthians conquistou e em quais anos?",
    expect: ["2000", "2012"],
  },
  { id: "libertadores", prompt: "Em que ano o Corinthians ganhou a Libertadores?", expect: ["2012"] },
  {
    id: "idolos",
    prompt: "Cite dois idolos historicos do Corinthians.",
    expect: ["Socrates"],
  },
];

async function requireAdmin(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
  }
  return null;
}

async function readGoldenSet(): Promise<GoldenPrompt[]> {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { key: GOLDEN_SET_KEY } });
    if (!row?.value) return DEFAULT_GOLDEN_SET;
    const parsed = JSON.parse(row.value) as GoldenPrompt[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_GOLDEN_SET;
  } catch {
    return DEFAULT_GOLDEN_SET;
  }
}

async function readLastRun(): Promise<EvalRun | null> {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { key: EVAL_LAST_KEY } });
    return row?.value ? (JSON.parse(row.value) as EvalRun) : null;
  } catch {
    return null;
  }
}

/** % das keywords esperadas presentes na resposta. Heuristica simples — NAO e "assertividade". */
function scoreKeywordCoverage(content: string, expect: string[]): number | null {
  if (!expect || expect.length === 0) return null;
  const lower = content.toLowerCase();
  const hits = expect.filter((kw) => kw.trim() && lower.includes(kw.toLowerCase().trim())).length;
  return Math.round((hits / expect.length) * 100);
}

async function callModel(
  model: string,
  prompt: GoldenPrompt,
  systemPrompt: string
): Promise<CellResult> {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "X-Title": "FielIA LLM Lab",
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          { role: "user", content: prompt.prompt },
        ],
        temperature: 0.3,
        max_tokens: 600,
        usage: { include: true },
      }),
    });
    const latencyMs = Date.now() - start;
    const data = await res.json();
    if (!res.ok) {
      const msg =
        (data as { error?: { message?: string } })?.error?.message || `HTTP ${res.status}`;
      return cellError(prompt.id, model, msg, latencyMs);
    }
    const raw = (data as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0]
      ?.message?.content;
    const content = typeof raw === "string" ? raw : "";
    const usage = (data as { usage?: Record<string, unknown> })?.usage ?? {};
    return {
      promptId: prompt.id,
      model,
      ok: true,
      content,
      latencyMs,
      totalTokens: typeof usage.total_tokens === "number" ? usage.total_tokens : 0,
      costUsd: typeof usage.cost === "number" ? usage.cost : null,
      score: scoreKeywordCoverage(content, prompt.expect),
    };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const msg = err instanceof Error && err.name === "AbortError" ? "timeout" : String(err);
    return cellError(prompt.id, model, msg, latencyMs);
  } finally {
    clearTimeout(timeout);
  }
}

function cellError(promptId: string, model: string, error: string, latencyMs: number): CellResult {
  return {
    promptId,
    model,
    ok: false,
    error,
    content: "",
    latencyMs,
    totalTokens: 0,
    costUsd: null,
    score: null,
  };
}

/** Executa tasks com concorrencia limitada, preservando a ordem de entrada. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function aggregate(models: string[], cells: CellResult[]): ModelAggregate[] {
  return models.map((model) => {
    const own = cells.filter((c) => c.model === model);
    const ok = own.filter((c) => c.ok);
    const scored = ok.filter((c) => c.score !== null) as Array<CellResult & { score: number }>;
    const costs = ok.map((c) => c.costUsd).filter((v): v is number => v !== null);
    return {
      model,
      avgScore:
        scored.length > 0
          ? Math.round(scored.reduce((s, c) => s + c.score, 0) / scored.length)
          : null,
      avgLatencyMs:
        ok.length > 0 ? Math.round(ok.reduce((s, c) => s + c.latencyMs, 0) / ok.length) : 0,
      totalTokens: own.reduce((s, c) => s + c.totalTokens, 0),
      totalCostUsd: costs.length > 0 ? costs.reduce((s, v) => s + v, 0) : null,
      okCount: ok.length,
      errorCount: own.length - ok.length,
    };
  });
}

async function readHistory(): Promise<HistoryEntry[]> {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { key: EVAL_HISTORY_KEY } });
    const parsed = row?.value ? (JSON.parse(row.value) as HistoryEntry[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const [goldenSet, lastRun, history] = await Promise.all([
    readGoldenSet(),
    readLastRun(),
    readHistory(),
  ]);
  return NextResponse.json({ goldenSet, lastRun, history });
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY ausente no ambiente" }, { status: 500 });
  }

  let body: { prompts?: GoldenPrompt[]; models?: string[]; systemPrompt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const models = (body.models ?? []).map((m) => m.trim()).filter(Boolean);
  const prompts = (body.prompts && body.prompts.length > 0 ? body.prompts : await readGoldenSet())
    .map((p) => ({
      id: String(p.id || "").trim() || Math.random().toString(36).slice(2, 8),
      prompt: String(p.prompt || "").trim(),
      expect: Array.isArray(p.expect) ? p.expect.map((k) => String(k)) : [],
    }))
    .filter((p) => p.prompt);
  const systemPrompt = (body.systemPrompt ?? "").trim();

  if (models.length === 0) {
    return NextResponse.json({ error: "Selecione ao menos um modelo" }, { status: 400 });
  }
  if (prompts.length === 0) {
    return NextResponse.json({ error: "Defina ao menos um prompt no golden set" }, { status: 400 });
  }
  const matrixSize = models.length * prompts.length;
  if (matrixSize > MAX_MATRIX) {
    return NextResponse.json(
      {
        error: `Matriz de ${matrixSize} chamadas excede o limite de ${MAX_MATRIX}. Reduza prompts ou modelos.`,
      },
      { status: 400 }
    );
  }

  // Monta todas as celulas (prompt × modelo) e roda com concorrencia limitada.
  const tasks = models.flatMap((model) => prompts.map((prompt) => ({ model, prompt })));
  const cells = await mapLimit(tasks, CONCURRENCY, (t) => callModel(t.model, t.prompt, systemPrompt));
  const aggregates = aggregate(models, cells);

  const run: EvalRun = {
    ranAt: new Date().toISOString(),
    models,
    prompts,
    cells,
    aggregates,
  };

  // Persiste o golden set usado + snapshot ENXUTO do run + acrescenta ao historico.
  try {
    const persistRun: EvalRun = {
      ...run,
      cells: cells.map((c) => ({ ...c, content: c.content.slice(0, PERSIST_CONTENT_CHARS) })),
    };
    const historyEntry: HistoryEntry = {
      ranAt: run.ranAt,
      models: run.models,
      promptCount: prompts.length,
      systemPromptUsed: systemPrompt.length > 0,
      aggregates: run.aggregates,
    };
    const newHistory = [historyEntry, ...(await readHistory())].slice(0, HISTORY_MAX);
    await Promise.all([
      prisma.siteConfig.upsert({
        where: { key: GOLDEN_SET_KEY },
        update: { value: JSON.stringify(prompts) },
        create: { key: GOLDEN_SET_KEY, value: JSON.stringify(prompts) },
      }),
      prisma.siteConfig.upsert({
        where: { key: EVAL_LAST_KEY },
        update: { value: JSON.stringify(persistRun) },
        create: { key: EVAL_LAST_KEY, value: JSON.stringify(persistRun) },
      }),
      prisma.siteConfig.upsert({
        where: { key: EVAL_HISTORY_KEY },
        update: { value: JSON.stringify(newHistory) },
        create: { key: EVAL_HISTORY_KEY, value: JSON.stringify(newHistory) },
      }),
    ]);
  } catch (err) {
    console.error("[llm-eval] falha ao persistir run:", err);
    // Nao falha a requisicao — o resultado vivo ainda volta pro usuario.
  }

  return NextResponse.json(run);
}
