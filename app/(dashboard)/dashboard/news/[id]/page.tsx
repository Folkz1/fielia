import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ArrowLeft, Calendar, Share2, Tag } from 'lucide-react';
import { enrichNewsIfNeeded } from '@/lib/news/enrich';
import { splitParagraphs, stripHtmlToText } from '@/lib/news/text';

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

  const resolved = await enrichNewsIfNeeded(news);
  const contentText = stripHtmlToText(resolved.content || resolved.summary || '');
  const paragraphs = splitParagraphs(contentText);

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
              {resolved.category}
            </span>
            <span className="inline-flex items-center gap-1 text-gray-400">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(resolved.publishedAt)}
            </span>
            <Link
              href={`/news/${resolved.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-gray-300 hover:text-white"
            >
              Link publico <Share2 className="w-3.5 h-3.5" />
            </Link>
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
      </div>
    </div>
  );
}
