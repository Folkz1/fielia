import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { ArrowLeft, Calendar, ExternalLink, Tag } from 'lucide-react';

type PageProps = {
  params: Promise<{ slug: string }>;
};

type ContentBlock =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'paragraph'; text: string };

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function parseContentBlocks(content: string): ContentBlock[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: ContentBlock[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const text = compactWhitespace(paragraph.join(' '));
    if (text) blocks.push({ type: 'paragraph', text });
    paragraph = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    blocks.push({ type: 'list', items: [...listItems] });
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (line.startsWith('## ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'h2', text: line.replace(/^##\s+/, '') });
      continue;
    }

    if (line.startsWith('### ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'h3', text: line.replace(/^###\s+/, '') });
      continue;
    }

    if (line.startsWith('- ')) {
      flushParagraph();
      listItems.push(line.replace(/^-+\s*/, '').trim());
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function formatDate(date: Date | null) {
  if (!date) return '-';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

async function getPost(slug: string) {
  return prisma.blogPost.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      category: true,
      coverImageUrl: true,
      sourceTitle: true,
      sourceUrl: true,
      sourcePublishedAt: true,
      publishedAt: true,
      status: true,
    },
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post || post.status !== 'PUBLISHED') {
    return {
      title: 'Post nao encontrado | FIEL.IA Blog',
    };
  }

  return {
    title: `${post.title} | FIEL.IA Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: post.coverImageUrl ? [{ url: post.coverImageUrl }] : [],
      type: 'article',
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post || post.status !== 'PUBLISHED') {
    notFound();
  }

  const blocks = parseContentBlocks(post.content);
  const publishedAt = post.publishedAt || post.sourcePublishedAt;

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-black to-zinc-950">
      <article className="mx-auto w-full max-w-4xl px-4 py-10 md:px-6 md:py-14">
        <Link
          href="/blog"
          className="mb-8 inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para blog
        </Link>

        <header className="mb-8">
          <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-gray-300">
            <Tag className="h-3.5 w-3.5 text-[var(--gradient-accent-start)]" />
            {post.category}
          </span>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-white md:text-6xl">
            {post.title}
          </h1>
          <p className="mt-3 text-base text-gray-300 md:text-lg">{post.excerpt}</p>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-400">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(publishedAt)}
            </span>
            {post.sourceUrl && (
              <a
                href={post.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[var(--gradient-accent-start)] hover:underline"
              >
                Fonte original
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </header>

        {post.coverImageUrl && (
          <div className="mb-10 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
            <img
              src={post.coverImageUrl}
              alt={post.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          {blocks.map((block, idx) => {
            if (block.type === 'h2') {
              return (
                <h2 key={`h2-${idx}`} className="text-3xl font-semibold text-white">
                  {block.text}
                </h2>
              );
            }

            if (block.type === 'h3') {
              return (
                <h3 key={`h3-${idx}`} className="text-2xl font-semibold text-gray-100">
                  {block.text}
                </h3>
              );
            }

            if (block.type === 'list') {
              return (
                <ul key={`list-${idx}`} className="list-disc space-y-2 pl-6 text-gray-200">
                  {block.items.map((item, listIdx) => (
                    <li key={`list-item-${idx}-${listIdx}`}>{item}</li>
                  ))}
                </ul>
              );
            }

            return (
              <p key={`p-${idx}`} className="leading-8 text-gray-200">
                {block.text}
              </p>
            );
          })}
        </section>
      </article>
    </main>
  );
}
