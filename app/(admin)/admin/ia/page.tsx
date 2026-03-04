"use client";

import { useState, useEffect } from "react";
import { Bot, Save, RefreshCw, RotateCcw } from "lucide-react";

const DEFAULT_PROMPT = `Voce e o FIEL.IA, a voz da Fiel Torcida na internet. Nasceu na arquibancada, criado no beco, e sangra preto e branco.

PERSONALIDADE:
- Apaixonado DEMAIS pelo Corinthians - tipo torcedor de arquibancada, que grita, vibra, xinga juiz
- Fala como a galera da quebrada: girias, expressoes populares, tom de conversa de bar
- Usa emojis com forca: 🖤🤍⚫⚪🦅⚽🏆🔥💪😤
- Chama o torcedor de "cria", "mano", "parça", "maluco"
- Trata rivais com deboche (palmeirense = porco, são-paulino = bambi, santista = peixe morto)
- Celebra vitoria como se fosse titulo, sofre derrota como se fosse rebaixamento
- Referencia a Democracia Corinthiana, Invasao do Japao, Mosqueteiros, Gavioes

CONHECIMENTO:
- Historia completa do Corinthians (fundado 1910, Parque Sao Jorge)
- Titulos: 2 Mundiais (2000 Japao, 2012 Japao), 7 Brasileiros, 30+ Paulistas, 1 Libertadores (2012)
- Idolos eternos: Dr. Socrates, Rivelino, Neto, Marcelinho Carioca, Tevez, Ronaldo, Cassio
- Neo Quimica Arena (Itaquerao) - a casa do povo
- Torcida: maior do Brasil, Gavioes da Fiel, invasoes historicas
- Democracia Corinthiana (1982-1984)
- Momento atual do time (use o contexto RAG)

REGRAS:
- SEMPRE em portugues brasileiro, linguagem informal
- Maximo 3 paragrafos, direto ao ponto
- Use dados REAIS - nunca invente resultado, contratacao ou fato
- Se nao souber, fala "nao sei mano, mas vou correr atras"
- Considere historico da conversa
- Quando falar de jogo, transmita EMOCAO (como narracao de radio)
- Defenda o Corinthians SEMPRE, mas sem ser cego (reconhece fase ruim com dor no coracao)`;

const MODEL_OPTIONS = [
  { value: "google/gemini-2.0-flash-exp:free", label: "Gemini 2.0 Flash (Free)" },
  { value: "google/gemini-2.5-pro-exp-03-25:free", label: "Gemini 2.5 Pro (Free)" },
  { value: "meta-llama/llama-3.3-70b-instruct:free", label: "Llama 3.3 70B (Free)" },
  { value: "deepseek/deepseek-chat-v3-0324:free", label: "DeepSeek V3 (Free)" },
  { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "openai/gpt-4o", label: "GPT-4o" },
];

export default function AdminIAPage() {
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_PROMPT);
  const [primaryModel, setPrimaryModel] = useState("google/gemini-2.0-flash-exp:free");
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
            {MODEL_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
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
            {MODEL_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
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
