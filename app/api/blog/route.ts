import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hasBlogPostsTable } from '@/lib/db/postgres';

export async function GET(req: NextRequest) {
  try {
    const blogPostsReady = await hasBlogPostsTable();
    if (!blogPostsReady) {
      return NextResponse.json({ error: 'Blog is not initialized' }, { status: 503 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.max(1, Math.min(Number(searchParams.get('limit') || '12'), 50));
    const page = Math.max(1, Number(searchParams.get('page') || '1'));
    const category = (searchParams.get('category') || '').trim();

    const where: {
      status: string;
      category?: string;
    } = {
      status: 'PUBLISHED',
    };

    if (category && category.toLowerCase() !== 'todas') {
      where.category = category;
    }

    const skip = (page - 1) * limit;

    const [total, posts] = await Promise.all([
      prisma.blogPost.count({ where }),
      prisma.blogPost.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          category: true,
          coverImageUrl: true,
          sourceUrl: true,
          publishedAt: true,
          createdAt: true,
        },
      }),
    ]);

    const response = NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });

    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
    return response;
  } catch (error) {
    console.error('Blog list error:', error);
    return NextResponse.json({ error: 'Failed to fetch blog posts' }, { status: 500 });
  }
}
