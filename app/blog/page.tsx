import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Calendar, ChevronRight, Newspaper } from 'lucide-react';

type Props = {
  searchParams?: Promise<{
    category?: string;
  }>;
};

function formatDate(value: Date | null) {
  if (!value) return '-';
  return value.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default async function BlogIndexPage({ searchParams }: Props) {
  const params = (await searchParams) || {};
  const category = params.category?.trim();

  const where: { status: string; category?: string } = { status: 'PUBLISHED' };
  if (category && category.toLowerCase() !== 'todas') {
    where.category = category;
  }

  const [posts, categoryRows] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 24,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        category: true,
        coverImageUrl: true,
        publishedAt: true,
      },
    }),
    prisma.blogPost.findMany({
      where: { status: 'PUBLISHED' },
      distinct: ['category'],
      select: { category: true },
      orderBy: { category: 'asc' },
    }),
  ]);

  const categories = ['Todas', ...categoryRows.map((row) => row.category)];
  const activeCategory = category || 'Todas';

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-black to-zinc-950">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6 md:py-14">
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-gray-300">
            <Newspaper className="h-3.5 w-3.5 text-[var(--gradient-accent-start)]" />
            Blog FIEL.IA
          </div>
          <h1 className="mt-4 text-4xl font-semibold text-white md:text-6xl">
            Noticias reescritas para a Fiel
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-gray-400 md:text-base">
            Conteudos editoriais criados a partir das fontes originais, com linguagem focada na torcida do Corinthians.
          </p>
        </header>

        <section className="mb-8 flex flex-wrap gap-2">
          {categories.map((item) => {
            const href = item === 'Todas' ? '/blog' : `/blog?category=${encodeURIComponent(item)}`;
            const isActive = activeCategory === item;
            return (
              <Link
                key={item}
                href={href}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  isActive
                    ? 'border-[var(--gradient-accent-start)] bg-[var(--gradient-accent-start)]/20 text-white'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:border-white/25'
                }`}
              >
                {item}
              </Link>
            );
          })}
        </section>

        {posts.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
            <p className="text-sm text-gray-400">Nenhum post publicado para essa categoria.</p>
          </section>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <article
                key={post.id}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition hover:-translate-y-1 hover:border-[var(--gradient-accent-start)]/40"
              >
                <Link href={`/blog/${post.slug}`} className="block h-full">
                  <div className="relative h-44 w-full overflow-hidden bg-zinc-900">
                    {post.coverImageUrl ? (
                      <img
                        src={post.coverImageUrl}
                        alt={post.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-800 text-sm text-gray-500">
                        Sem imagem
                      </div>
                    )}
                    <span className="absolute left-3 top-3 rounded-md border border-white/20 bg-black/60 px-2 py-1 text-[11px] text-gray-200">
                      {post.category}
                    </span>
                  </div>

                  <div className="flex h-[calc(100%-11rem)] flex-col p-5">
                    <h2 className="line-clamp-2 text-2xl font-semibold leading-tight text-white">
                      {post.title}
                    </h2>
                    <p className="mt-3 line-clamp-3 text-sm text-gray-300">{post.excerpt}</p>

                    <div className="mt-auto flex items-center justify-between pt-5 text-xs text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(post.publishedAt)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[var(--gradient-accent-start)]">
                        Ler post
                        <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                      </span>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
