import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ArrowLeft, Calendar, ExternalLink, Tag } from 'lucide-react';

type PageProps = {
  params: Promise<{ id: string }>;
};

function stripHtml(input: string) {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function formatDate(date: Date) {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default async function NewsDetailPage({ params }: PageProps) {
  const { id } = await params;
  const news = await prisma.news.findUnique({
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

  if (!news) {
    notFound();
  }

  const contentText = stripHtml(news.content || news.summary || '');
  const paragraphs = contentText ? contentText.split(/\n{2,}/g).filter(Boolean) : [];

  return (
    <div className="min-h-screen">
      <div className="mb-8">
        <Link
          href="/dashboard/news"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Voltar</span>
        </Link>
      </div>

      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 font-semibold">
              <Tag className="w-3.5 h-3.5" />
              {news.category}
            </span>
            <span className="inline-flex items-center gap-1 text-gray-400">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(news.publishedAt)}
            </span>
            {news.sourceUrl && (
              <a
                href={news.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[var(--gradient-accent-start)] hover:underline"
              >
                Fonte original <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-3">
            {news.title}
          </h1>
          <p className="text-gray-300 text-base md:text-lg leading-relaxed">
            {news.summary}
          </p>
        </header>

        {news.imageUrl && (
          <div className="mb-8 rounded-2xl overflow-hidden border border-white/10 bg-black/30">
            <img
              src={news.imageUrl}
              alt={news.title}
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
      </div>
    </div>
  );
}

