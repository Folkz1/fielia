"use client";

import { useState, useEffect } from "react";
import { Bot, Save, RefreshCw, RotateCcw } from "lucide-react";

const DEFAULT_PROMPT = `Você é o FIEL.IA, um torcedor fanático do Corinthians batendo papo com outro torcedor. Nasceu na arquibancada, sangra preto e branco. Você é a fiel torcida em pessoa — NÃO um atendente nem um chatbot. Também conhece o app Fiel.IA por dentro e ajuda quando o torcedor pergunta dele.

COMO VOCÊ CONVERSA:
- Fala como torcedor de verdade: natural, de bar, de quebrada. Gíria, emoção, paixão pelo Timão.
- Chama o outro de "cria", "mano", "parça", "irmão" ou "maluco" — sem repetir sempre o mesmo.
- Usa emoji com moderação pra dar emoção (🖤🤍⚫⚪🦅⚽🏆🔥💪😤), nunca em excesso.
- Responde SOBRE O ASSUNTO que o cara trouxe. Se ele cita um jogador, você fala daquele jogador. Se fala de um jogo, comenta o jogo. Vai fundo no que interessa pra ele.
- Pode se estender quando o papo pede — não corta curto demais. Mas também não enrola.
- Trata rival com deboche leve quando cabe (palmeirense, são-paulino, santista), sem nunca ofender o torcedor com quem está falando.

REGRAS DURAS (nunca quebre):
- NUNCA comece com "Como posso te ajudar hoje?" nem nada com cara de atendimento.
- NUNCA termine com CTA institucional tipo "se tiver dúvida sobre o Fiel.IA é só dar o salve", "caso queira saber dos planos", "estou aqui pra ajudar". Conversa de torcedor não tem isso.
- NUNCA force falar do app, de planos ou do Premium no meio de um papo de futebol. Só toca nesse assunto se o cara perguntar.
- NUNCA invente resultado, escalação, contratação, número, benefício ou prazo.

QUANDO TIVER CONTEXTO (base de conhecimento / notícias abaixo):
- O CONTEXTO ADICIONAL é a fonte de verdade. Use ele antes do conhecimento geral.
- Se a resposta está no contexto, responde com segurança e na lata. NUNCA diga "preciso validar", "valida comigo" ou "confere na fonte oficial" — isso é robótico e o torcedor detesta.
- Só quando realmente não tiver o dado (nem no contexto, nem na sua memória), seja honesto de boa: "essa eu não tenho atualizada agora, mano" — e segue o papo com o que sabe.

SOBRE O PRODUTO (só quando perguntarem de plano, cadastro, quiz, ranking, premium ou grupo):
- Responde como quem conhece o app, mas no mesmo tom de torcedor, sem discurso de vendedor.
- Regras confirmadas: NÃO tem sorteio, NÃO tem free trial, e o Premium é pago desde o início. Nunca prometa benefício, trial, sorteio ou desconto que não esteja no contexto.

CONHECIMENTO:
- História do Corinthians (fundado em 1910, Parque São Jorge), títulos (2 Mundiais — 2000 e 2012 —, Brasileiros, Paulistas, Libertadores 2012), ídolos (Sócrates, Rivelino, Neto, Marcelinho, Ronaldo, Cássio), Neo Química Arena, Gaviões da Fiel, Democracia Corinthiana.
- Pro momento atual do time (elenco, jogos recentes, contratações), use SEMPRE o contexto fornecido (notícias/base de conhecimento). Se o contexto não trouxer, seja honesto em vez de inventar.

ESTILO:
- Português brasileiro informal, sempre.
- Quando falar de jogo, transmite emoção, tipo narração de rádio.
- Defende o Timão com o coração, mas sem ser cego — reconhece fase ruim com dor no peito.`;

// Custo entre parênteses = USD por 1M tokens (entrada / saída) no OpenRouter.
// "Mais usados" = ranking real top-weekly do OpenRouter (maio/2026), validado no catálogo.
const MODEL_GROUPS: { label: string; models: { value: string; label: string }[] }[] = [
  {
    label: "⭐ Recomendados pra conversa de torcedor (testados 29/05)",
    models: [
      { value: "deepseek/deepseek-v4-flash", label: "DeepSeek V4 Flash — natural e barato ($0.10/$0.20)" },
      { value: "openai/gpt-4o-mini", label: "GPT-4o mini — rápido, bom fallback ($0.15/$0.60)" },
      { value: "google/gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite — atual/estável ($0.25/$1.50)" },
    ],
  },
  {
    label: "🔥 Mais usados no OpenRouter (top 20 — maio/2026)",
    models: [
      { value: "tencent/hy3-preview", label: "Hy3 preview ($0.06/$0.21)" },
      { value: "anthropic/claude-opus-4.7", label: "Claude Opus 4.7 — caro ($5/$25)" },
      { value: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6 ($3/$15)" },
      { value: "openrouter/owl-alpha", label: "Owl Alpha — experimental/grátis" },
      { value: "xiaomi/mimo-v2.5", label: "MiMo V2.5 ($0.14/$0.28)" },
      { value: "deepseek/deepseek-v4-pro", label: "DeepSeek V4 Pro ($0.44/$0.87)" },
      { value: "xiaomi/mimo-v2.5-pro", label: "MiMo V2.5 Pro ($0.44/$0.87)" },
      { value: "deepseek/deepseek-v3.2", label: "DeepSeek V3.2 ($0.25/$0.38)" },
      { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash Preview ($0.50/$3)" },
      { value: "nvidia/nemotron-3-super-120b-a12b", label: "Nemotron 3 Super 120B ($0.09/$0.45)" },
      { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite — barato ($0.10/$0.40)" },
      { value: "moonshotai/kimi-k2.6", label: "Kimi K2.6 ($0.68/$3.42)" },
      { value: "anthropic/claude-opus-4.6", label: "Claude Opus 4.6 — caro ($5/$25)" },
      { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash ($0.30/$2.50)" },
      { value: "poolside/laguna-m.1:free", label: "Laguna M.1 — experimental/grátis" },
      { value: "google/gemini-3.5-flash", label: "Gemini 3.5 Flash — caro ($1.50/$9)" },
      { value: "minimax/minimax-m2.7", label: "MiniMax M2.7 ($0.26/$1.20)" },
      { value: "openai/gpt-5.5", label: "GPT-5.5 — caro ($5/$30)" },
    ],
  },
];

export default function AdminIAPage() {
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPT);
  const [primaryModel, setPrimaryModel] = useState("deepseek/deepseek-v4-flash");
  const [fallbackModel, setFallbackModel] = useState("");
  const [temperature, setTemperature] = useState(0.8);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/admin/config");
        const data = await res.json();
        if (data.system_prompt) setSystemPrompt(data.system_prompt);
        if (data.primary_model) setPrimaryModel(data.primary_model);
        if (data.fallback_model) setFallbackModel(data.fallback_model);
        if (data.temperature) setTemperature(parseFloat(data.temperature));
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  async function saveConfig(key: string, value: string) {
    const res = await fetch("/api/admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) throw new Error(`Failed to save ${key}`);
  }

  async function handleSave() {
    setSaving(true);
    setResult(null);

    try {
      await Promise.all([
        saveConfig("system_prompt", systemPrompt),
        saveConfig("primary_model", primaryModel),
        saveConfig("fallback_model", fallbackModel),
        saveConfig("temperature", temperature.toString()),
      ]);
      setResult({ success: true, message: "Configuracoes salvas com sucesso!" });
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Erro ao salvar",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (!confirm("Restaurar prompt padrao? As alteracoes nao salvas serao perdidas.")) return;
    setSystemPrompt(DEFAULT_PROMPT);
    setTemperature(0.8);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <Bot className="w-8 h-8 text-orange-500" />
            Configuracao da IA
          </h1>
          <p className="text-gray-400">Edite o prompt, modelo e comportamento do FIEL.IA</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Restaurar Padrao
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </button>
        </div>
      </div>

      {result && (
        <div
          className={`p-4 rounded-lg ${
            result.success
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-red-500/20 text-red-400 border border-red-500/30"
          }`}
        >
          {result.message}
        </div>
      )}

      {/* System Prompt */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-lg font-bold mb-2">System Prompt</h2>
        <p className="text-sm text-gray-400 mb-4">
          Este e o prompt que define a personalidade e regras do FIEL.IA. O contexto RAG e historico
          sao adicionados automaticamente.
        </p>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={20}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg resize-y font-mono text-sm leading-relaxed"
        />
        <p className="text-xs text-gray-500 mt-2">{systemPrompt.length} caracteres</p>
      </div>

      {/* Modelo e Temperatura */}
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4">Modelo Primario</h2>
          <select
            value={primaryModel}
            onChange={(e) => setPrimaryModel(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
          >
            {MODEL_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.models.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-2">
            Modelo principal usado nas respostas. Env OPENROUTER_MODEL sobrescreve.
          </p>

          <h3 className="text-sm font-bold mt-4 mb-2">Modelo Fallback</h3>
          <select
            value={fallbackModel}
            onChange={(e) => setFallbackModel(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
          >
            <option value="">Nenhum</option>
            {MODEL_GROUPS.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.models.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4">Temperatura</h2>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="flex-1 accent-orange-500"
            />
            <span className="text-xl font-bold text-orange-400 w-12 text-center">
              {temperature.toFixed(1)}
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Preciso</span>
            <span>Criativo</span>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Valores mais altos = respostas mais criativas e variadas.
            Valores mais baixos = respostas mais consistentes e factuais.
          </p>
        </div>
      </div>
    </div>
  );
}
