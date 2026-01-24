"use client";

import { ArrowLeft, Calendar, Tag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useNews } from "@/hooks/use-api";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const NEWS_CATEGORIES = ["Todas", "Jogos", "Transferências", "Bastidores", "Torcida"];

export default function NewsPage() {
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const { news, isLoading, error } = useNews(selectedCategory);

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4">
          <ArrowLeft className="w-5 h-5" />
          <span>Voltar</span>
        </Link>
        <h1 className="font-heading text-5xl md:text-6xl text-white mb-2">Notícias do Timão 📰</h1>
        <p className="text-gray-400 text-lg">Fique por dentro de tudo que acontece no Corinthians</p>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Category Filter */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2 scrollbar-thin">
          {NEWS_CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-smooth ${
                selectedCategory === category
                  ? "bg-corinthians-gold text-corinthians-black"
                  : "bg-corinthians-gray-medium text-gray-300 hover:bg-corinthians-gray-light"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
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
            <h3 className="font-heading text-2xl text-white mb-2">Nenhuma notícia encontrada</h3>
            <p className="text-gray-400">Tente selecionar outra categoria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {news.map((item, index) => (
              <div
                key={item.id}
                className="card-corinthians group cursor-pointer animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Image Placeholder */}
                <div className="w-full h-48 bg-gradient-gold rounded-lg mb-4 flex items-center justify-center text-6xl">
                  {item.imageUrl || (item.category === "Jogos" ? "⚽" : item.category === "Transferências" ? "🔄" : "📰")}
                </div>

                {/* Category & Date */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="badge-gold flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {item.category}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.publishedAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-heading text-xl text-white mb-2 group-hover:text-corinthians-gold transition-colors">
                  {item.title}
                </h3>

                {/* Summary */}
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {item.summary}
                </p>

                {/* Read More */}
                <div className="flex items-center text-corinthians-gold text-sm font-semibold">
                  <span>Ler notícia completa</span>
                  <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
