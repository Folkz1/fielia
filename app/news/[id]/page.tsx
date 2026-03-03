import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { enrichNewsIfNeeded } from '@/lib/news/enrich';
import { splitParagraphs, stripHtmlToText } from '@/lib/news/text';
import { Calendar, Tag } from 'lucide-react';
import { AffiliateCTA } from '@/components/affiliate-cta';

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
      <article className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6 md:py-14">
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

        <header className="mb-10">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-bold uppercase tracking-wider">
              <Tag className="w-3 h-3" />
              {resolved.category}
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(resolved.publishedAt)}
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-bold text-white leading-[1.15] mb-5">
            {resolved.title}
          </h1>

          <p className="text-lg md:text-xl text-gray-400 leading-relaxed border-l-2 border-yellow-500/40 pl-5">
            {resolved.summary}
          </p>
        </header>

        {resolved.imageUrl && (
          <figure className="mb-12 -mx-4 md:mx-0">
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <img
                src={resolved.imageUrl}
                alt={resolved.title}
                className="w-full max-h-[480px] object-cover"
                loading="lazy"
              />
            </div>
          </figure>
        )}

        <section className="space-y-6">
          {paragraphs.length ? (
            paragraphs.map((p, idx) => (
              <p
                key={idx}
                className={`text-gray-300 leading-8 md:leading-9 ${
                  idx === 0
                    ? 'text-lg md:text-xl text-gray-200 first-letter:text-5xl first-letter:font-bold first-letter:text-yellow-500 first-letter:float-left first-letter:mr-3 first-letter:mt-1'
                    : 'text-base md:text-lg'
                }`}
              >
                {p}
              </p>
            ))
          ) : (
            <p className="text-gray-500 italic">Conteudo indisponivel.</p>
          )}
        </section>

        <AffiliateCTA source="news" referrer={`/news/${resolved.id}`} variant="banner" className="mt-10" />

        {resolved.sourceUrl && (
          <footer className="mt-12 pt-6 border-t border-white/10">
            <p className="text-sm text-gray-600">
              Fonte:{' '}
              <a
                href={resolved.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-yellow-500 underline underline-offset-2 decoration-gray-700 transition-colors"
              >
                {new URL(resolved.sourceUrl).hostname.replace('www.', '')}
              </a>
            </p>
          </footer>
        )}
      </article>
    </main>
  );
}
