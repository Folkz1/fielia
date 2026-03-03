"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Image as ImageIcon,
  Download,
  Loader2,
  Newspaper,
  Send,
  Crown,
  Trash2,
  RefreshCw,
} from "lucide-react";
import Image from "next/image";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface MemeItem {
  id: string;
  caption: string;
  imageUrl: string;
  prompt: string;
  createdAt: string;
  news?: {
    title: string;
    category: string;
  } | null;
}

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  imageUrl?: string;
  publishedAt: string;
}

/**
 * Normaliza URLs de memes antigas (http://localhost:3000/memes/xxx)
 * para o novo formato via API route (/api/memes/image/xxx)
 */
function normalizeMemeUrl(url: string): string {
  if (!url) return "";
  // Se ja e a nova URL, retornar direto
  if (url.startsWith("/api/memes/image/")) return url;
  // Extrair filename de URLs antigas (qualquer dominio + /memes/filename)
  const match = url.match(/\/memes\/([^/?#]+)$/);
  if (match) return `/api/memes/image/${match[1]}`;
  // URL relativa simples
  if (url.startsWith("/memes/")) return `/api/memes/image/${url.replace("/memes/", "")}`;
  return url;
}

export default function MemesPage() {
  const [memes, setMemes] = useState<MemeItem[]>([]);
  const [recentNews, setRecentNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingFromNews, setGeneratingFromNews] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [remaining, setRemaining] = useState(3);
  const [dailyLimit, setDailyLimit] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedMeme, setSelectedMeme] = useState<MemeItem | null>(null);

  useEffect(() => {
    fetchMemes();
    fetchRecentNews();
  }, []);

  async function fetchMemes() {
    try {
      const res = await fetch("/api/memes");
      if (res.ok) {
        const data = await res.json();
        setMemes(data.memes || []);
        setRemaining(data.remaining);
        setDailyLimit(data.dailyLimit);
      }
    } catch (err) {
      console.error("Erro ao buscar memes:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRecentNews() {
    try {
      const res = await fetch("/api/news?limit=6");
      if (res.ok) {
        const data = await res.json();
        setRecentNews(data.news || []);
      }
    } catch (err) {
      console.error("Erro ao buscar noticias:", err);
    }
  }

  async function handleGenerate(customPrompt?: string, newsId?: string) {
    if (remaining <= 0) {
      setError(
        dailyLimit <= 3
          ? "Limite diario atingido! Assine Premium para gerar ate 15 memes/dia."
          : "Limite diario atingido! Volte amanha."
      );
      return;
    }

    setError(null);
    setSuccessMsg(null);

    if (newsId) {
      setGeneratingFromNews(newsId);
    } else {
      setGenerating(true);
    }

    try {
      const res = await fetch("/api/memes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: customPrompt || prompt,
          newsId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao gerar meme");
        return;
      }

      // Add new meme to gallery
      setMemes((prev) => [
        {
          ...data.meme,
          news: null,
        },
        ...prev,
      ]);
      setRemaining(data.remaining);
      setPrompt("");
      setSuccessMsg("Meme gerado com sucesso!");
      setTimeout(() => setSuccessMsg(null), 3000);

      // Refresh to get full meme data with news relation
      fetchMemes();
    } catch (err) {
      setError("Erro de conexao. Tente novamente.");
    } finally {
      setGenerating(false);
      setGeneratingFromNews(null);
    }
  }

  function handleDownload(meme: MemeItem) {
    const link = document.createElement("a");
    link.href = normalizeMemeUrl(meme.imageUrl);
    link.download = `meme-fiel-ia-${meme.id}.png`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-heading text-white mb-2 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-yellow-500" />
            Gerador de Memes
          </h1>
          <p className="text-gray-400">
            Crie memes do Timao com IA. Escreva um prompt ou use uma noticia!
          </p>
        </div>

        {/* Daily counter */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
          <ImageIcon className="w-4 h-4 text-yellow-500" />
          <span className="text-sm text-gray-300">
            <span className="font-bold text-white">{remaining}</span>/{dailyLimit} restantes hoje
          </span>
          {dailyLimit <= 3 && (
            <span className="text-xs text-yellow-500 flex items-center gap-1 ml-2">
              <Crown className="w-3 h-3" />
              Premium = 15/dia
            </span>
          )}
        </div>
      </div>

      {/* Generator Card */}
      <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          Gerar por Prompt
        </h2>

        <div className="flex gap-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && prompt.trim() && !generating) {
                handleGenerate();
              }
            }}
            placeholder="Ex: Cassio defendendo penalti na final da Libertadores..."
            disabled={generating || remaining <= 0}
            className="flex-1 px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 disabled:opacity-50"
          />
          <button
            onClick={() => handleGenerate()}
            disabled={!prompt.trim() || generating || remaining <= 0}
            className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {generating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Gerar
              </>
            )}
          </button>
        </div>

        {/* Quick prompts */}
        <div className="flex flex-wrap gap-2 mt-4">
          {[
            "Corinthians campeao do mundo",
            "Torcida lotando a Arena",
            "Gol de titulo nos acrescimos",
            "Mascote do Timao em festa",
          ].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setPrompt(suggestion)}
              disabled={generating}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-gray-300 transition-colors disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-sm">
          {successMsg}
        </div>
      )}

      {/* Generate from News */}
      {recentNews.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-yellow-500" />
            Gerar Meme a partir de Noticia
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentNews.map((news) => (
              <div
                key={news.id}
                className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-yellow-500/30 transition-all group"
              >
                {/* News thumbnail */}
                <div className="w-full h-28 bg-black/30 rounded-lg mb-3 overflow-hidden flex items-center justify-center">
                  {news.imageUrl ? (
                    <img
                      src={news.imageUrl}
                      alt={news.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <Newspaper className="w-8 h-8 text-gray-600" />
                  )}
                </div>

                <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-500 font-semibold">
                  {news.category}
                </span>
                <h3 className="text-sm font-bold text-white mt-2 line-clamp-2">
                  {news.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{news.summary}</p>

                <button
                  onClick={() => handleGenerate(undefined, news.id)}
                  disabled={generatingFromNews === news.id || remaining <= 0}
                  className="mt-3 w-full px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 font-semibold text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {generatingFromNews === news.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Gerar Meme
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gallery */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-yellow-500" />
            Meus Memes ({memes.length})
          </h2>
          <button
            onClick={() => fetchMemes()}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {memes.length === 0 ? (
          <div className="text-center py-16 bg-white/5 border border-white/10 rounded-2xl">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-bold text-gray-400 mb-2">Nenhum meme gerado ainda</h3>
            <p className="text-gray-500 text-sm">
              Use o gerador acima para criar seu primeiro meme do Timao!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {memes.map((meme) => (
              <div
                key={meme.id}
                className="bg-white/5 border border-white/10 rounded-xl overflow-hidden group hover:border-yellow-500/30 transition-all cursor-pointer"
                onClick={() => setSelectedMeme(meme)}
              >
                {/* Meme image */}
                <div className="relative w-full aspect-square bg-black/30">
                  <img
                    src={normalizeMemeUrl(meme.imageUrl)}
                    alt={meme.caption}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "";
                      (e.target as HTMLImageElement).alt = "Imagem indisponivel";
                    }}
                  />

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(meme);
                      }}
                      className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                      title="Baixar"
                    >
                      <Download className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>

                {/* Caption */}
                <div className="p-3">
                  <p className="text-sm font-medium text-white line-clamp-2">{meme.caption}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                      {new Date(meme.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                    {meme.news && (
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                        {meme.news.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Meme Modal */}
      {selectedMeme && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedMeme(null)}
        >
          <div
            className="bg-gray-900 border border-white/10 rounded-2xl max-w-lg w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full aspect-square bg-black">
              <img
                src={normalizeMemeUrl(selectedMeme.imageUrl)}
                alt={selectedMeme.caption}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="p-6">
              <p className="text-lg font-bold text-white mb-2">{selectedMeme.caption}</p>
              <p className="text-xs text-gray-500 mb-4">
                {new Date(selectedMeme.createdAt).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              {selectedMeme.news && (
                <p className="text-sm text-blue-400 mb-4">
                  Baseado na noticia: {selectedMeme.news.title}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => handleDownload(selectedMeme)}
                  className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Baixar
                </button>
                <button
                  onClick={() => setSelectedMeme(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
