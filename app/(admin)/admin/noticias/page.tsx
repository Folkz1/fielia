"use client";

import { useState, useEffect } from "react";
import { Newspaper, RefreshCw, CheckCircle, XCircle, ExternalLink, Image as ImageIcon } from "lucide-react";

interface News {
  id: string;
  title: string;
  summary: string;
  category: string;
  imageUrl?: string;
  sourceUrl?: string;
  publishedAt: string;
}

interface SyncResult {
  success: boolean;
  fetched?: number;
  created?: number;
  skipped?: number;
  error?: string;
}

export default function AdminNewsPage() {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  async function fetchNews() {
    setLoading(true);
    try {
      const res = await fetch("/api/news?limit=50");
      if (res.ok) {
        const data = await res.json();
        setNews(data.news || []);
      }
    } catch (error) {
      console.error("Erro ao buscar noticias:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/news/sync");
      const data = await res.json();
      setSyncResult(data);
      if (data.success) {
        fetchNews();
      }
    } catch (error) {
      setSyncResult({ success: false, error: "Erro de conexao" });
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    fetchNews();
  }, []);

  const newsWithImages = news.filter(n => n.imageUrl).length;
  const newsWithoutImages = news.length - newsWithImages;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <Newspaper className="w-8 h-8 text-orange-500" />
            Noticias
          </h1>
          <p className="text-gray-400">{news.length} noticias ({newsWithImages} com imagem)</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {syncing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Sincronizar FreshRSS
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sync Result */}
      {syncResult && (
        <div
          className={`p-4 rounded-lg ${
            syncResult.success
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-red-500/20 text-red-400 border border-red-500/30"
          }`}
        >
          {syncResult.success ? (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              <span>
                Sincronizado! {syncResult.fetched} buscadas, {syncResult.created} novas, {syncResult.skipped} duplicadas.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              <span>Erro: {syncResult.error}</span>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total</p>
          <p className="text-2xl font-bold text-white">{news.length}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Com Imagem</p>
          <p className="text-2xl font-bold text-green-400">{newsWithImages}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Sem Imagem</p>
          <p className="text-2xl font-bold text-gray-400">{newsWithoutImages}</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-gray-400 text-sm">% com Imagem</p>
          <p className="text-2xl font-bold text-orange-400">
            {news.length > 0 ? Math.round((newsWithImages / news.length) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* News List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            Nenhuma noticia encontrada
          </div>
        ) : (
          news.map((item) => (
            <div
              key={item.id}
              className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-orange-500/30 transition-colors"
            >
              <div className="flex gap-4">
                {/* Thumbnail */}
                <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-gray-600" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-white line-clamp-2">{item.title}</h3>
                    {item.sourceUrl && (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 p-1 text-gray-400 hover:text-white"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-1 mt-1">{item.summary}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">
                      {item.category}
                    </span>
                    <span className="text-gray-500">
                      {new Date(item.publishedAt).toLocaleDateString('pt-BR')}
                    </span>
                    {item.imageUrl && (
                      <span className="text-green-400 flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" />
                        Imagem
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
