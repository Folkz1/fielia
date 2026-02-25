"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, ExternalLink, Newspaper, RefreshCw, Sparkles } from "lucide-react";

type Candidate = {
  id: string;
  title: string;
  summary: string;
  category: string;
  imageUrl: string | null;
  sourceUrl: string | null;
  publishedAt: string;
  blogPost: {
    id: string;
    slug: string;
    title: string;
    status: string;
    publishedAt: string | null;
  } | null;
};

export default function AdminBlogPage() {
  const [items, setItems] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [batching, setBatching] = useState(false);
  const [tone, setTone] = useState("informativo e envolvente");
  const [targetAudience, setTargetAudience] = useState("torcedores do Corinthians");
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [blogPostsReady, setBlogPostsReady] = useState<boolean | null>(null);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/blog/candidates?limit=40");
      const data = await res.json();
      setItems(data.items || []);
      setBlogPostsReady(typeof data.blogPostsReady === "boolean" ? data.blogPostsReady : null);
    } finally {
      setLoading(false);
    }
  }, []);

  async function syncNews() {
    setSyncing(true);
    setResultMessage(null);
    try {
      const res = await fetch("/api/news/sync");
      const data = await res.json();
      if (data?.success) {
        setResultMessage(
          `Sync OK: ${data.created ?? 0} novas noticias (${data.skipped ?? 0} ignoradas).`
        );
      } else {
        setResultMessage(`Falha no sync: ${data?.error || "erro desconhecido"}`);
      }
      await fetchCandidates();
    } catch {
      setResultMessage("Falha no sync de noticias.");
    } finally {
      setSyncing(false);
    }
  }

  async function generateOne(newsId: string, forceRegenerate = false) {
    if (blogPostsReady === false) {
      setResultMessage("Banco ainda nao tem tabela blog_posts. Rode `npx prisma db push` primeiro.");
      return;
    }
    setGeneratingId(newsId);
    setResultMessage(null);
    try {
      const res = await fetch("/api/admin/blog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newsId,
          forceRegenerate,
          tone,
          targetAudience,
          publish: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "erro");
      }
      setResultMessage(
        `Post ${data?.created ? "criado" : "atualizado"}: ${data?.post?.slug || ""}`
      );
      await fetchCandidates();
    } catch (error) {
      const message = error instanceof Error ? error.message : "erro";
      setResultMessage(`Falha ao gerar post: ${message}`);
    } finally {
      setGeneratingId(null);
    }
  }

  async function generateBatch() {
    if (blogPostsReady === false) {
      setResultMessage("Banco ainda nao tem tabela blog_posts. Rode `npx prisma db push` primeiro.");
      return;
    }
    setBatching(true);
    setResultMessage(null);
    try {
      const res = await fetch("/api/admin/blog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limit: 8,
          tone,
          targetAudience,
          publish: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "erro");
      }
      setResultMessage(
        `Batch concluido: ${data?.created || 0} criados, ${data?.fallbackCount || 0} fallback.`
      );
      await fetchCandidates();
    } catch (error) {
      const message = error instanceof Error ? error.message : "erro";
      setResultMessage(`Falha no batch: ${message}`);
    } finally {
      setBatching(false);
    }
  }

  useEffect(() => {
    void fetchCandidates();
  }, [fetchCandidates]);

  const stats = useMemo(() => {
    const withPost = items.filter((item) => item.blogPost).length;
    return {
      total: items.length,
      withPost,
      withoutPost: Math.max(0, items.length - withPost),
    };
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white md:text-3xl">
            <Sparkles className="h-7 w-7 text-orange-500" />
            Blog IA
          </h1>
          <p className="text-gray-400">Geracao de posts a partir do RSS/FreshRSS.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={syncNews}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"
          >
            {syncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Newspaper className="h-4 w-4" />}
            Sincronizar RSS
          </button>
          <button
            onClick={generateBatch}
            disabled={batching || loading || blogPostsReady === false}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {batching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
            Gerar 8 posts
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-gray-400">Noticias avaliadas</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-gray-400">Com post gerado</p>
          <p className="text-2xl font-bold text-green-400">{stats.withPost}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-gray-400">Sem post</p>
          <p className="text-2xl font-bold text-orange-400">{stats.withoutPost}</p>
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-white/10 bg-white/5 p-4 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs text-gray-400">Tom editorial</span>
          <input
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/60"
            placeholder="informativo e envolvente"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-gray-400">Publico-alvo</span>
          <input
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/60"
            placeholder="torcedores do Corinthians"
          />
        </label>
      </div>

      {blogPostsReady === false && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
          Blog ainda nao foi inicializado no banco (tabela blog_posts ausente). Rode `npx prisma db push` ou `npx prisma migrate deploy` no DATABASE_URL.
        </div>
      )}

      {resultMessage && (
        <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-200">
          {resultMessage}
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="h-7 w-7 animate-spin text-gray-400" />
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start">
                <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                      Sem imagem
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <h2 className="line-clamp-2 text-lg font-semibold text-white">{item.title}</h2>
                    {item.sourceUrl && (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 text-xs text-gray-400 hover:text-white"
                      >
                        fonte <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  <p className="line-clamp-2 text-sm text-gray-400">{item.summary}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-gray-300">
                      {item.category}
                    </span>
                    {item.blogPost ? (
                      <LinkBadge slug={item.blogPost.slug} status={item.blogPost.status} />
                    ) : (
                      <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-orange-300">
                        Sem post
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => generateOne(item.id, false)}
                    disabled={generatingId === item.id || blogPostsReady === false}
                    className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    {generatingId === item.id ? "Gerando..." : item.blogPost ? "Atualizar" : "Gerar"}
                  </button>
                  {item.blogPost && (
                    <button
                      onClick={() => generateOne(item.id, true)}
                      disabled={generatingId === item.id || blogPostsReady === false}
                      className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
                    >
                      Forcar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function LinkBadge({ slug, status }: { slug: string; status: string }) {
  const isPublished = status === "PUBLISHED";
  return (
    <a
      href={`/blog/${slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`rounded-full border px-2 py-0.5 ${
        isPublished
          ? "border-green-500/30 bg-green-500/10 text-green-300"
          : "border-yellow-500/30 bg-yellow-500/10 text-yellow-300"
      }`}
    >
      {isPublished ? "Publicado" : status}
    </a>
  );
}
