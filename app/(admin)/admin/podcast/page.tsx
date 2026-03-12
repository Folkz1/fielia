"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, Play, Pause, RefreshCw, Save, RotateCcw, Volume2 } from "lucide-react";

const VOICE_OPTIONS = [
  { value: "nova", label: "Nova (feminina, energetica)" },
  { value: "ash", label: "Ash (masculino, jovem)" },
  { value: "coral", label: "Coral (feminina, natural)" },
  { value: "sage", label: "Sage (masculino, calmo)" },
  { value: "alloy", label: "Alloy (neutro)" },
  { value: "echo", label: "Echo (masculino, grave)" },
  { value: "onyx", label: "Onyx (masculino, profundo)" },
  { value: "shimmer", label: "Shimmer (feminina, suave)" },
];

const DEFAULT_PROMPT = `Voce e o narrador do podcast "Voz da Fiel" - o podcast diario da torcida do Corinthians.

ESTILO:
- Fale como torcedor apaixonado do Corinthians numa mesa de bar
- Use girias: "mano", "cria", "maluco", "e nois", "vai corinthians"
- Transmita EMOCAO - vibre com boas noticias, sofra com as ruins
- Tom de conversa entre amigos, nao de jornalista
- Paragrafos curtos, frases diretas

ESTRUTURA:
1. Abertura (1-2 frases): Saudacao energetica
2. Noticias (1 paragrafo cada): Conte cada noticia com emocao
3. Encerramento (1-2 frases): Mensagem motivacional, "Vai Corinthians!"

REGRAS:
- NUNCA invente fatos - use SOMENTE o que esta nas noticias
- Maximo 2000 caracteres (2-3 minutos de audio)
- Texto corrido para ser NARRADO em voz alta
- Sem emojis, sem bullets, sem markdown`;

type Podcast = {
  id: string;
  title: string;
  script: string;
  newsIds: string[];
  ttsModel?: string;
  ttsVoice?: string;
  audioSize: number;
  createdAt: string;
  estimatedCostUsd?: number;
};

export default function AdminPodcastPage() {
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [voice, setVoice] = useState("nova");
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadPodcasts();
    loadConfig();
  }, []);

  async function loadPodcasts() {
    try {
      const res = await fetch("/api/admin/podcast");
      const data = await res.json();
      setPodcasts(data.podcasts || []);
      if (data.needsMigration) setNeedsMigration(true);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function loadConfig() {
    try {
      const res = await fetch("/api/admin/config");
      const data = await res.json();
      if (data.podcast_prompt) setPrompt(data.podcast_prompt);
      if (data.podcast_voice) setVoice(data.podcast_voice);
    } catch {
      // use defaults
    }
  }

  async function saveConfig() {
    setSaving(true);
    setResult(null);
    try {
      await Promise.all([
        fetch("/api/admin/config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "podcast_prompt", value: prompt }),
        }),
        fetch("/api/admin/config", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: "podcast_voice", value: voice }),
        }),
      ]);
      setResult({ success: true, message: "Configuracoes do podcast salvas!" });
    } catch {
      setResult({ success: false, message: "Erro ao salvar" });
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerate() {
    if (!confirm("Gerar podcast com as noticias curadas de hoje? Isso usara creditos TTS.")) return;
    setGenerating(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/podcast", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar");
      setResult({ success: true, message: `Podcast "${data.podcast.title}" gerado com sucesso!` });
      loadPodcasts();
    } catch (error) {
      setResult({ success: false, message: error instanceof Error ? error.message : "Erro ao gerar podcast" });
    } finally {
      setGenerating(false);
    }
  }

  async function handleMigrate() {
    setMigrating(true);
    try {
      const res = await fetch("/api/admin/podcast/migrate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNeedsMigration(false);
      setResult({ success: true, message: "Tabela podcasts criada!" });
      loadPodcasts();
    } catch (error) {
      setResult({ success: false, message: error instanceof Error ? error.message : "Erro na migration" });
    } finally {
      setMigrating(false);
    }
  }

  function togglePlay(id: string) {
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(`/api/podcast/${id}/audio`);
    audio.onended = () => setPlayingId(null);
    audio.play();
    audioRef.current = audio;
    setPlayingId(id);
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <Mic className="w-8 h-8 text-orange-500" />
            Podcast Voz da Fiel
          </h1>
          <p className="text-gray-400">Gere podcasts narrados das noticias do Corinthians</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={saveConfig}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Config
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
            {generating ? "Gerando..." : "Gerar Podcast"}
          </button>
        </div>
      </div>

      {result && (
        <div className={`p-4 rounded-lg ${
          result.success
            ? "bg-green-500/20 text-green-400 border border-green-500/30"
            : "bg-red-500/20 text-red-400 border border-red-500/30"
        }`}>
          {result.message}
        </div>
      )}

      {needsMigration && (
        <div className="p-4 rounded-lg bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center justify-between">
          <span>Tabela de podcasts nao encontrada. Criar agora?</span>
          <button
            onClick={handleMigrate}
            disabled={migrating}
            className="px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-400 disabled:opacity-50"
          >
            {migrating ? "Criando..." : "Criar Tabela"}
          </button>
        </div>
      )}

      {/* Config */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-2">Prompt do Podcast</h2>
          <p className="text-sm text-gray-400 mb-4">
            Define o estilo de narracao. As noticias curadas sao injetadas automaticamente.
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={12}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg resize-y font-mono text-sm leading-relaxed"
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500">{prompt.length} caracteres</p>
            <button
              onClick={() => { if (confirm("Restaurar prompt padrao?")) setPrompt(DEFAULT_PROMPT); }}
              className="text-xs text-gray-500 hover:text-white flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Restaurar padrao
            </button>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-bold">Voz</h2>
          <select
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
          >
            {VOICE_OPTIONS.map((v) => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500">
            Vozes via OpenRouter (gpt-4o-audio-preview). Recomendado: Ash ou Echo.
          </p>

          <div className="pt-4 border-t border-white/10">
            <h3 className="text-sm font-bold mb-2">Modelo TTS</h3>
            <div className="space-y-1 text-xs text-gray-400">
              <p className="font-mono text-orange-400">openai/gpt-4o-audio-preview</p>
              <p>~800 chars / boletim (30-60s áudio)</p>
              <p>Custo estimado: ~$0.01-0.02 / podcast</p>
              <p>Qualidade máxima de voz</p>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
            <h3 className="text-sm font-bold mb-2">Stats</h3>
            <p className="text-xs text-gray-400">{podcasts.length} podcasts gerados</p>
          </div>
        </div>
      </div>

      {/* Lista de podcasts */}
      {podcasts.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-orange-500" />
            Podcasts Gerados
          </h2>
          <div className="space-y-4">
            {podcasts.map((podcast) => (
              <div key={podcast.id} className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => togglePlay(podcast.id)}
                      className="w-10 h-10 flex items-center justify-center bg-orange-500 rounded-full hover:bg-orange-600 transition-colors flex-shrink-0"
                    >
                      {playingId === podcast.id
                        ? <Pause className="w-5 h-5 text-white" />
                        : <Play className="w-5 h-5 text-white ml-0.5" />}
                    </button>
                    <div>
                      <h3 className="font-bold text-white">{podcast.title}</h3>
                      <p className="text-xs text-gray-400">
                        {formatDate(podcast.createdAt)} | {formatSize(podcast.audioSize)} |
                        {podcast.ttsVoice || "?"} | {(podcast.newsIds || []).length} notícias
                        {podcast.ttsModel && <span className="text-orange-400"> | {podcast.ttsModel}</span>}
                        {podcast.estimatedCostUsd != null && <span className="text-green-400"> | ~${podcast.estimatedCostUsd.toFixed(3)}</span>}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-300 line-clamp-3 mt-2">{podcast.script}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
