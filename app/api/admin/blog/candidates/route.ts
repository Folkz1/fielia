import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { hasBlogPostsTable } from '@/lib/db/postgres';
import { dedupeNewsItems } from '@/lib/news/dedupe';

async function ensureAdmin() {
  const session = await auth();
  if (!session?.user?.id) return false;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  return Boolean(user?.isAdmin);
}

export async function GET(req: NextRequest) {
  try {
    const isAdmin = await ensureAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.max(1, Math.min(Number(searchParams.get('limit') || '30'), 100));

    const blogPostsReady = await hasBlogPostsTable();

    const items = await prisma.news.findMany({
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(limit * 6, 240),
      select: {
        id: true,
        title: true,
        summary: true,
        content: true,
        category: true,
        imageUrl: true,
        sourceUrl: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        ...(blogPostsReady
          ? {
              blogPost: {
                select: {
                  id: true,
                  slug: true,
                  title: true,
                  status: true,
                  publishedAt: true,
                },
              },
            }
          : {}),
      },
    });

    const normalized = blogPostsReady
      ? dedupeNewsItems(items, limit)
      : dedupeNewsItems(items.map((item) => ({ ...item, blogPost: null })), limit);

    return NextResponse.json({ items: normalized, blogPostsReady });
  } catch (error) {
    console.error('Blog candidates error:', error);
    return NextResponse.json({ error: 'Failed to fetch blog candidates' }, { status: 500 });
  }
}
