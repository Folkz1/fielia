"use client";

import { useState, useEffect, useMemo } from "react";
import {
  FlaskConical, Play, RefreshCw, Plus, Trash2, Crown, Check,
  AlertTriangle, Coins, Timer, Target, ChevronDown, ChevronRight, History,
} from "lucide-react";
import { MODEL_OPTIONS, modelLabel, modelsByTier, type CostTier } from "@/lib/models";

interface GoldenPrompt {
  id: string;
  prompt: string;
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
interface HistoryEntry {
  ranAt: string;
  models: string[];
  promptCount: number;
  systemPromptUsed: boolean;
  aggregates: ModelAggregate[];
}

const MAX_MATRIX = 80;
const DEFAULT_MODELS = [
  "deepseek/deepseek-v4-flash",
  "openai/gpt-4o-mini",
  "google/gemini-3.1-flash-lite",
];

const TIER_META: Record<CostTier, { label: string; cls: string }> = {
  barato: { label: "💚 barato", cls: "text-green-400" },
  medio: { label: "💛 médio", cls: "text-yellow-400" },
  caro: { label: "🔴 caro", cls: "text-red-400" },
};

function fmtCost(v: number | null): string {
  if (v === null) return "—";
  if (v === 0) return "$0";
  if (v < 0.01) return `$${v.toFixed(6)}`;
  return `$${v.toFixed(4)}`;
}
function fmtLatency(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms} ms`;
}

export default function LlmLabPage() {
  const [goldenSet, setGoldenSet] = useState<GoldenPrompt[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>(DEFAULT_MODELS);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [primaryModel, setPrimaryModel] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [run, setRun] = useState<EvalRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingModel, setSavingModel] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [credits, setCredits] = useState<{ totalCredits: number; totalUsage: number; remaining: number } | null>(null);
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  async function loadCredits() {
    setLoadingCredits(true);
    try {
      const res = await fetch("/api/admin/openrouter-credits");
      if (res.ok) setCredits(await res.json());
    } catch {
      // ignora — card de creditos simplesmente nao aparece
    } finally {
      setLoadingCredits(false);
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const [evalRes, cfgRes] = await Promise.all([
          fetch("/api/admin/llm-eval"),
          fetch("/api/admin/config"),
        ]);
        const evalData = await evalRes.json();
        if (Array.isArray(evalData.goldenSet)) setGoldenSet(evalData.goldenSet);
        if (evalData.lastRun) setRun(evalData.lastRun);
        if (Array.isArray(evalData.history)) setHistory(evalData.history);
        const cfg = await cfgRes.json();
        if (cfg.primary_model) setPrimaryModel(cfg.primary_model);
        // Pre-popula com o system prompt REAL do FIEL.IA: assim o eval compara
        // os modelos nas condicoes de producao, nao "modelos puros".
        if (cfg.system_prompt) setSystemPrompt(cfg.system_prompt);
      } catch {
        // mantem defaults
      } finally {
        setLoading(false);
      }
    }
    load();
    loadCredits();
  }, []);

  const matrixSize = selectedModels.length * goldenSet.filter((p) => p.prompt.trim()).length;
  const overLimit = matrixSize > MAX_MATRIX;
  const expensiveSelected = selectedModels.filter(
    (v) => MODEL_OPTIONS.find((m) => m.value === v)?.tier === "caro"
  );

  // Ranking: maior cobertura primeiro, desempate por menor latencia.
  const ranked = useMemo(() => {
    if (!run) return [];
    return [...run.aggregates].sort((a, b) => {
      const sa = a.avgScore ?? -1;
      const sb = b.avgScore ?? -1;
      if (sb !== sa) return sb - sa;
      return a.avgLatencyMs - b.avgLatencyMs;
    });
  }, [run]);
  const championModel = ranked[0]?.model;

  function toggleModel(value: string) {
    setSelectedModels((prev) =>
      prev.includes(value) ? prev.filter((m) => m !== value) : [...prev, value]
    );
  }
  function selectTiers(...tiers: CostTier[]) {
    setSelectedModels(modelsByTier(...tiers));
  }
  function updatePrompt(idx: number, patch: Partial<GoldenPrompt>) {
    setGoldenSet((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }
  function addPrompt() {
    setGoldenSet((prev) => [
      ...prev,
      { id: `p${Date.now().toString(36)}`, prompt: "", expect: [] },
    ]);
  }
  function removePrompt(idx: number) {
    setGoldenSet((prev) => prev.filter((_, i) => i !== idx));
  }

  async function runEval() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/llm-eval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          models: selectedModels,
          prompts: goldenSet.filter((p) => p.prompt.trim()),
          systemPrompt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao rodar eval");
      const fresh = data as EvalRun;
      setRun(fresh);
      // Acrescenta ao historico local (o backend ja persistiu no site_config).
      setHistory((prev) => [
        {
          ranAt: fresh.ranAt,
          models: fresh.models,
          promptCount: fresh.prompts.length,
          systemPromptUsed: systemPrompt.trim().length > 0,
          aggregates: fresh.aggregates,
        },
        ...prev,
      ].slice(0, 20));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado");
    } finally {
      setRunning(false);
    }
  }

  async function useAsPrimary(model: string) {
    setSavingModel(model);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "primary_model", value: model }),
      });
      if (!res.ok) throw new Error("Falha ao definir modelo primario");
      setPrimaryModel(model);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar modelo");
    } finally {
      setSavingModel(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
          <FlaskConical className="w-8 h-8 text-orange-500" />
          LLM Lab — Golden Set Eval
        </h1>
        <p className="text-gray-400">
          Compare modelos no mesmo conjunto de perguntas e escolha o melhor por
          qualidade, velocidade e custo — sem ficar refém de um provedor.
        </p>
      </div>

      {/* Controle de créditos OpenRouter */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-orange-400 font-medium">
          <Coins className="w-5 h-5" /> Créditos OpenRouter
        </div>
        {credits ? (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <span className="text-gray-400">
              Gasto: <span className="text-white font-semibold">${credits.totalUsage.toFixed(4)}</span>
            </span>
            <span className="text-gray-400">
              Comprado: <span className="text-white font-semibold">${credits.totalCredits.toFixed(2)}</span>
            </span>
            <span className="text-gray-400">
              Resta:{" "}
              <span
                className={`font-semibold ${credits.remaining <= 1 ? "text-red-400" : "text-green-400"}`}
              >
                ${credits.remaining.toFixed(4)}
              </span>
            </span>
          </div>
        ) : (
          <span className="text-sm text-gray-500">
            {loadingCredits ? "carregando saldo..." : "saldo indisponível"}
          </span>
        )}
        <button
          onClick={loadCredits}
          disabled={loadingCredits}
          className="ml-auto flex items-center gap-1 text-gray-400 hover:text-white text-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loadingCredits ? "animate-spin" : ""}`} /> Atualizar
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Golden Set */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-400" /> Golden Set
            </h2>
            <p className="text-sm text-gray-400">
              Perguntas de teste. As <em>keywords</em> esperadas medem cobertura
              (heurística simples — não é nota de acerto real).
            </p>
          </div>
          <button
            onClick={addPrompt}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 text-sm"
          >
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>

        <div className="space-y-3">
          {goldenSet.map((p, idx) => (
            <div key={p.id} className="grid md:grid-cols-[1fr_240px_auto] gap-3 items-start">
              <textarea
                value={p.prompt}
                onChange={(e) => updatePrompt(idx, { prompt: e.target.value })}
                rows={2}
                placeholder="Pergunta de teste..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm resize-y"
              />
              <input
                value={p.expect.join(", ")}
                onChange={(e) =>
                  updatePrompt(idx, {
                    expect: e.target.value.split(",").map((k) => k.trim()).filter(Boolean),
                  })
                }
                placeholder="keywords, separadas, por vírgula"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
              />
              <button
                onClick={() => removePrompt(idx)}
                className="p-2 text-gray-500 hover:text-red-400"
                title="Remover"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {goldenSet.length === 0 && (
            <p className="text-sm text-gray-500">Nenhum prompt. Clique em “Adicionar”.</p>
          )}
        </div>

        <details className="mt-4">
          <summary className="text-sm text-gray-400 cursor-pointer hover:text-white">
            System prompt (opcional) — testar com o contexto do FIEL.IA
          </summary>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={4}
            placeholder="Deixe vazio para testar os modelos puros."
            className="mt-2 w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm resize-y font-mono"
          />
        </details>
      </div>

      {/* Modelos + Run */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-lg font-bold">Modelos a comparar</h2>
          <div className="flex flex-wrap gap-2 text-xs">
            <button onClick={() => selectTiers("barato")} className="px-2.5 py-1 rounded bg-green-500/15 text-green-300 hover:bg-green-500/25">💚 Baratos</button>
            <button onClick={() => selectTiers("barato", "medio")} className="px-2.5 py-1 rounded bg-yellow-500/15 text-yellow-200 hover:bg-yellow-500/25">💚💛 Baratos+Médios</button>
            <button onClick={() => setSelectedModels(MODEL_OPTIONS.map((m) => m.value))} className="px-2.5 py-1 rounded bg-white/10 text-gray-300 hover:bg-white/20">Todos</button>
            <button onClick={() => setSelectedModels([])} className="px-2.5 py-1 rounded bg-white/10 text-gray-400 hover:bg-white/20">Limpar</button>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
          {MODEL_OPTIONS.map((m) => {
            const checked = selectedModels.includes(m.value);
            return (
              <label
                key={m.value}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                  checked
                    ? "bg-orange-500/15 border-orange-500/40 text-white"
                    : "bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleModel(m.value)}
                  className="accent-orange-500"
                />
                <span className="flex-1">{m.label}</span>
                <span className={`text-[10px] whitespace-nowrap ${TIER_META[m.tier].cls}`}>
                  {TIER_META[m.tier].label}
                </span>
                {primaryModel === m.value && (
                  <span className="text-[10px] text-orange-400">ATIVO</span>
                )}
              </label>
            );
          })}
        </div>

        {expensiveSelected.length > 0 && (
          <div className="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {expensiveSelected.length} modelo(s) <strong>caro(s)</strong> selecionado(s) — esses
              queimam crédito rápido (Opus/GPT-5.5 ~$25–30 por 1M tokens). Pros testes, prefira
              💚 Baratos / 💛 Médios.
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            onClick={runEval}
            disabled={running || overLimit || matrixSize === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium"
          >
            {running ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {running ? "Rodando..." : "Rodar Eval"}
          </button>
          <span className={`text-sm ${overLimit ? "text-red-400" : "text-gray-400"}`}>
            {matrixSize} chamada(s) ao OpenRouter ({selectedModels.length} modelos ×{" "}
            {goldenSet.filter((p) => p.prompt.trim()).length} prompts)
            {overLimit && ` — acima do limite de ${MAX_MATRIX}, reduza.`}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
          <Coins className="w-3 h-3" /> Cada execução consome tokens reais (custo medido abaixo).
        </p>
      </div>

      {/* Resultados */}
      {run && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Resultado</h2>
            <span className="text-xs text-gray-500">
              {new Date(run.ranAt).toLocaleString("pt-BR")}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-white/10">
                  <th className="py-2 pr-4">Modelo</th>
                  <th className="py-2 px-3"><Target className="w-3.5 h-3.5 inline" /> Cobertura</th>
                  <th className="py-2 px-3"><Timer className="w-3.5 h-3.5 inline" /> Latência</th>
                  <th className="py-2 px-3">Tokens</th>
                  <th className="py-2 px-3"><Coins className="w-3.5 h-3.5 inline" /> Custo</th>
                  <th className="py-2 px-3">OK</th>
                  <th className="py-2 pl-3"></th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((a) => (
                  <tr
                    key={a.model}
                    className={`border-b border-white/5 ${
                      a.model === championModel ? "bg-orange-500/10" : ""
                    }`}
                  >
                    <td className="py-2.5 pr-4 font-medium text-white">
                      <div className="flex items-center gap-2">
                        {a.model === championModel && (
                          <Crown className="w-4 h-4 text-orange-400" />
                        )}
                        <span>{modelLabel(a.model)}</span>
                        {primaryModel === a.model && (
                          <span className="text-[10px] text-orange-400 border border-orange-500/40 rounded px-1">
                            ATIVO
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      {a.avgScore === null ? "—" : `${a.avgScore}%`}
                    </td>
                    <td className="py-2.5 px-3">{fmtLatency(a.avgLatencyMs)}</td>
                    <td className="py-2.5 px-3">{a.totalTokens.toLocaleString("pt-BR")}</td>
                    <td className="py-2.5 px-3">{fmtCost(a.totalCostUsd)}</td>
                    <td className="py-2.5 px-3">
                      {a.okCount}
                      {a.errorCount > 0 && (
                        <span className="text-red-400"> / {a.errorCount} erro</span>
                      )}
                    </td>
                    <td className="py-2.5 pl-3 text-right">
                      {primaryModel === a.model ? (
                        <span className="text-green-400 flex items-center gap-1 justify-end">
                          <Check className="w-4 h-4" /> Primário
                        </span>
                      ) : (
                        <button
                          onClick={() => useAsPrimary(a.model)}
                          disabled={savingModel === a.model}
                          className="text-orange-400 hover:text-orange-300 disabled:opacity-50 whitespace-nowrap"
                        >
                          {savingModel === a.model ? "..." : "Usar como primário"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            <strong>Cobertura</strong> = % das keywords esperadas que apareceram na resposta
            (heurística, não é avaliação semântica). Custo via <code>usage.cost</code> do OpenRouter.
          </p>

          {/* Detalhe por prompt */}
          <div className="mt-6 space-y-2">
            <h3 className="text-sm font-bold text-gray-300">Respostas por pergunta</h3>
            {run.prompts.map((p) => {
              const isOpen = expanded === p.id;
              return (
                <div key={p.id} className="border border-white/10 rounded-lg">
                  <button
                    onClick={() => setExpanded(isOpen ? null : p.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/5"
                  >
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <span className="flex-1">{p.prompt}</span>
                    {p.expect.length > 0 && (
                      <span className="text-[10px] text-gray-500">
                        espera: {p.expect.join(", ")}
                      </span>
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 space-y-2">
                      {run.cells
                        .filter((c) => c.promptId === p.id)
                        .map((c) => (
                          <div key={c.model} className="text-xs bg-gray-800/50 rounded p-2">
                            <div className="flex items-center justify-between text-gray-400 mb-1">
                              <span className="font-medium text-gray-300">
                                {modelLabel(c.model)}
                              </span>
                              <span>
                                {c.score === null ? "" : `${c.score}% · `}
                                {fmtLatency(c.latencyMs)} · {fmtCost(c.costUsd)}
                              </span>
                            </div>
                            <p className="text-gray-300 whitespace-pre-wrap">
                              {c.ok ? c.content : `⚠️ ${c.error}`}
                            </p>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Histórico de análises */}
      {history.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-1">
            <History className="w-5 h-5 text-orange-400" /> Histórico de análises
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Últimas {history.length} rodadas salvas — parâmetro pra comparar evolução dos modelos.
          </p>
          <div className="space-y-2">
            {history.map((h, i) => {
              const best = [...h.aggregates].sort((a, b) => {
                const sa = a.avgScore ?? -1;
                const sb = b.avgScore ?? -1;
                if (sb !== sa) return sb - sa;
                return a.avgLatencyMs - b.avgLatencyMs;
              })[0];
              const totalCost = h.aggregates.reduce((s, a) => s + (a.totalCostUsd ?? 0), 0);
              return (
                <div
                  key={h.ranAt + i}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm border-b border-white/5 pb-2"
                >
                  <span className="text-gray-500 text-xs w-36 shrink-0">
                    {new Date(h.ranAt).toLocaleString("pt-BR")}
                  </span>
                  <span className="text-gray-400">
                    {h.models.length} modelos · {h.promptCount} prompts
                  </span>
                  {best && (
                    <span className="flex items-center gap-1 text-white">
                      <Crown className="w-3.5 h-3.5 text-orange-400" />
                      {modelLabel(best.model)}
                      {best.avgScore !== null && (
                        <span className="text-gray-400">({best.avgScore}%)</span>
                      )}
                    </span>
                  )}
                  <span className="text-gray-400 ml-auto">{fmtCost(totalCost || null)}</span>
                  {h.systemPromptUsed && (
                    <span className="text-[10px] text-gray-500">c/ system prompt</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
