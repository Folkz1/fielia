"use client";

import { ArrowLeft, Calendar, Tag, ExternalLink, Trophy, Zap, Clock, Filter } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const NEWS_CATEGORIES = ["Todas", "Jogos", "Transferências", "Bastidores", "Torcida"];
const PERIODS = [
  { value: "24h", label: "Últimas 24h" },
  { value: "48h", label: "48 horas" },
  { value: "7d", label: "7 dias" },
  { value: "all", label: "Todas" },
];

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  imageUrl?: string;
  sourceUrl?: string;
  publishedAt: string;
}

interface CurationData {
  date: string;
  hasToday: boolean;
}

export default function NewsPage() {
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [selectedPeriod, setSelectedPeriod] = useState("24h");
  const [highlights, setHighlights] = useState<NewsItem[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [curation, setCuration] = useState<CurationData | null>(null);
  const [isLoadingHighlights, setIsLoadingHighlights] = useState(true);
  const [isLoadingNews, setIsLoadingNews] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch highlights (curated top 3)
  useEffect(() => {
    async function fetchHighlights() {
      try {
        setIsLoadingHighlights(true);
        const res = await fetch('/api/news?curated=true');
        if (!res.ok) throw new Error('Failed to fetch highlights');
        const data = await res.json();
        setHighlights(data.news);
        setCuration(data.curation);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingHighlights(false);
      }
    }
    fetchHighlights();
  }, []);

  // Fetch all news with filters
  useEffect(() => {
    async function fetchNews() {
      try {
        setIsLoadingNews(true);
        const params = new URLSearchParams();
        if (selectedCategory !== 'Todas') params.append('category', selectedCategory);
        if (selectedPeriod !== 'all') params.append('period', selectedPeriod);

        const res = await fetch(`/api/news?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch news');
        const data = await res.json();
        setNews(data.news);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoadingNews(false);
      }
    }
    fetchNews();
  }, [selectedCategory, selectedPeriod]);

  const formatRelativeTime = (date: string) => {
    const now = new Date();
    const published = new Date(date);
    const diffMs = now.getTime() - published.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Agora há pouco';
    if (diffHours < 24) return `Há ${diffHours}h`;
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `Há ${diffDays} dias`;
    return published.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Jogos': return '⚽';
      case 'Transferências': return '🔄';
      case 'Bastidores': return '🎬';
      case 'Torcida': return '🦅';
      default: return '📰';
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-12">
        <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Voltar</span>
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-5xl md:text-6xl font-black text-white mb-3 tracking-tight">
              Notícias do Timão
            </h1>
            <p className="text-gray-400 text-lg">
              Fique por dentro de tudo que acontece no Corinthians
            </p>
          </div>

          {/* Curation Status */}
          {curation && (
            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-gray-400">
                {curation.hasToday
                  ? `Curadoria atualizada às ${new Date(curation.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Aguardando curadoria'
                }
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Highlights Section */}
      {isLoadingHighlights ? (
        <div className="mb-16 flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : highlights.length > 0 && (
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <h2 className="text-2xl font-bold text-white">Destaques do Dia</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {highlights.map((item, index) => {
              const CardWrapper = item.sourceUrl ? 'a' : 'div';
              const wrapperProps = item.sourceUrl
                ? { href: item.sourceUrl, target: "_blank", rel: "noopener noreferrer" }
                : {};

              return (
                <CardWrapper
                  key={item.id}
                  {...wrapperProps}
                  className="group relative block"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Glow Effect */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-2xl opacity-0 group-hover:opacity-20 blur transition duration-500" />

                  {/* Card Content */}
                  <div className="relative bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm border border-white/10 rounded-2xl p-6 h-full transition-all duration-300 group-hover:border-yellow-500/50">
                    {/* Badge */}
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-black font-bold text-sm shadow-lg">
                      {index + 1}
                    </div>

                    {/* Image */}
                    <div className="w-full h-40 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 rounded-xl mb-4 flex items-center justify-center overflow-hidden relative">
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
                        <span className="text-5xl">{getCategoryIcon(item.category)}</span>
                      )}
                      {item.sourceUrl && (
                        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-full p-1.5">
                          <ExternalLink className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2.5 py-1 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-sm font-semibold">
                        {getCategoryIcon(item.category)} {item.category}
                      </span>
                      <span className="flex items-center gap-1 text-sm text-gray-400">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(item.publishedAt)}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 group-hover:text-yellow-500 transition-colors leading-snug">
                      {item.title}
                    </h3>

                    {/* Summary */}
                    <p className="text-gray-300 text-base mb-4 line-clamp-2 leading-relaxed">
                      {item.summary}
                    </p>

                    {/* CTA */}
                    <div className="flex items-center gap-2 text-yellow-500 text-base font-semibold">
                      <span>Ler completa</span>
                      <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </CardWrapper>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-8 space-y-4">
        <div className="flex items-center gap-2 text-gray-400">
          <Filter className="w-5 h-5" />
          <span className="text-sm font-medium">Filtros</span>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {NEWS_CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20"
                  : "bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10"
              }`}
            >
              {category !== 'Todas' && getCategoryIcon(category)} {category}
            </button>
          ))}
        </div>

        {/* Period Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {PERIODS.map((period) => (
            <button
              key={period.value}
              onClick={() => setSelectedPeriod(period.value)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap text-sm transition-all ${
                selectedPeriod === period.value
                  ? "bg-white/10 text-white border border-white/20"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent"
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* News Feed */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Feed Completo</h2>

        {isLoadingNews ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-400">Erro ao carregar notícias: {error}</p>
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-2xl text-white mb-2 font-bold">Nenhuma notícia encontrada</h3>
            <p className="text-gray-400">Tente ajustar os filtros</p>
          </div>
        ) : (
          <div className="space-y-4">
            {news.map((item, index) => {
              const CardWrapper = item.sourceUrl ? 'a' : 'div';
              const wrapperProps = item.sourceUrl
                ? { href: item.sourceUrl, target: "_blank", rel: "noopener noreferrer" }
                : {};

              return (
                <CardWrapper
                  key={item.id}
                  {...wrapperProps}
                  className="group block"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 transition-all duration-300 hover:bg-white/10 hover:border-yellow-500/30 hover:shadow-lg hover:shadow-yellow-500/5">
                    <div className="flex gap-4">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0 w-24 h-24 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 rounded-lg flex items-center justify-center overflow-hidden relative">
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
                          <span className="text-3xl">{getCategoryIcon(item.category)}</span>
                        )}
                        {item.sourceUrl && (
                          <div className="absolute top-1 right-1 bg-black/70 backdrop-blur-sm rounded-full p-1">
                            <ExternalLink className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Meta */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-semibold">
                            {getCategoryIcon(item.category)} {item.category}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(item.publishedAt)}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-lg font-bold text-white mb-1.5 line-clamp-2 group-hover:text-yellow-500 transition-colors">
                          {item.title}
                        </h3>

                        {/* Summary */}
                        <p className="text-gray-400 text-sm line-clamp-2 mb-2 leading-relaxed">
                          {item.summary}
                        </p>

                        {/* CTA */}
                        <div className="flex items-center gap-1.5 text-yellow-500 text-sm font-semibold">
                          <span>Ler mais</span>
                          <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardWrapper>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
