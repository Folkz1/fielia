import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ArrowLeft, Calendar, Share2, Tag } from 'lucide-react';
import { enrichNewsIfNeeded } from '@/lib/news/enrich';
import { sanitizeAndSplit } from '@/lib/news/text';

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
  const paragraphs = sanitizeAndSplit(resolved.content || resolved.summary || '');

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

      <article className="max-w-3xl mx-auto">
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
            <Link
              href={`/news/${resolved.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-yellow-500 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              Compartilhar
            </Link>
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
                dangerouslySetInnerHTML={{ __html: p }}
              />
            ))
          ) : (
            <p className="text-gray-500 italic">Conteúdo indisponível.</p>
          )}
        </section>

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
    </div>
  );
}
