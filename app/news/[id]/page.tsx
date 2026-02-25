import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { enrichNewsIfNeeded } from '@/lib/news/enrich';
import { splitParagraphs, stripHtmlToText } from '@/lib/news/text';
import { Calendar, ExternalLink, Tag } from 'lucide-react';

export const runtime = 'nodejs';

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(date: Date) {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

async function getNews(id: string) {
  return prisma.news.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      summary: true,
      content: true,
      category: true,
      imageUrl: true,
      sourceUrl: true,
      publishedAt: true,
    },
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const news = await getNews(id);

  if (!news) {
    return { title: 'Noticia nao encontrada | FIEL.IA' };
  }

  return {
    title: `${news.title} | FIEL.IA`,
    description: news.summary,
    openGraph: {
      title: news.title,
      description: news.summary,
      type: 'article',
      images: news.imageUrl ? [{ url: news.imageUrl }] : [],
    },
  };
}

export default async function PublicNewsPage({ params }: PageProps) {
  const { id } = await params;
  const news = await getNews(id);

  if (!news) {
    notFound();
  }

  const resolved = await enrichNewsIfNeeded(news);
  const contentText = stripHtmlToText(resolved.content || resolved.summary || '');
  const paragraphs = splitParagraphs(contentText);

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-black to-zinc-950">
      <article className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6 md:py-14">
        <div className="mb-10 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-sm font-semibold text-white hover:text-gray-200">
            FIEL.IA
          </Link>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <Link href="/auth/login" className="hover:text-white">
              Entrar
            </Link>
            <Link
              href="/auth/register"
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-gray-200 hover:border-white/25"
            >
              Criar conta
            </Link>
          </div>
        </div>

        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 font-semibold">
              <Tag className="w-3.5 h-3.5" />
              {resolved.category}
            </span>
            <span className="inline-flex items-center gap-1 text-gray-400">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(resolved.publishedAt)}
            </span>
            {resolved.sourceUrl && (
              <a
                href={resolved.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[var(--gradient-accent-start)] hover:underline"
              >
                Fonte original <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-3">
            {resolved.title}
          </h1>
          <p className="text-gray-300 text-base md:text-lg leading-relaxed">
            {resolved.summary}
          </p>
        </header>

        {resolved.imageUrl && (
          <div className="mb-8 rounded-2xl overflow-hidden border border-white/10 bg-black/30">
            <img
              src={resolved.imageUrl}
              alt={resolved.title}
              className="w-full max-h-[440px] object-cover"
              loading="lazy"
            />
          </div>
        )}

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8 space-y-5">
          {paragraphs.length ? (
            paragraphs.map((p, idx) => (
              <p key={idx} className="text-gray-200 leading-8">
                {p}
              </p>
            ))
          ) : (
            <p className="text-gray-400">Conteudo indisponivel.</p>
          )}
        </section>
      </article>
    </main>
  );
}

