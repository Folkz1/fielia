import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hasBlogPostsTable } from '@/lib/db/postgres';

type Params = {
  params: Promise<{ slug: string }>;
};

export async function GET(_: NextRequest, context: Params) {
  try {
    const blogPostsReady = await hasBlogPostsTable();
    if (!blogPostsReady) {
      return NextResponse.json({ error: 'Blog is not initialized' }, { status: 503 });
    }

    const { slug } = await context.params;
    const post = await prisma.blogPost.findUnique({
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
        targetAudience: true,
        tone: true,
        status: true,
        publishedAt: true,
        createdAt: true,
      },
    });

    if (!post || post.status !== 'PUBLISHED') {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const response = NextResponse.json({ post });
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
    return response;
  } catch (error) {
    console.error('Blog post error:', error);
    return NextResponse.json({ error: 'Failed to fetch blog post' }, { status: 500 });
  }
}
