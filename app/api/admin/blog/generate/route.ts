import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { hasBlogPostsTable } from '@/lib/db/postgres';
import {
  generateBlogPostFromNews,
  generateBlogPostsFromLatestNews,
} from '@/lib/blog/generator';

export const runtime = 'nodejs';

async function ensureAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) return null;
  return session.user.id;
}

export async function POST(req: NextRequest) {
  try {
    const adminId = await ensureAdmin();
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const blogPostsReady = await hasBlogPostsTable();
    if (!blogPostsReady) {
      return NextResponse.json(
        {
          error:
            'Blog is not initialized (table public.blog_posts is missing). Run `npx prisma db push` or `npx prisma migrate deploy` against your DATABASE_URL.',
        },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const newsId = typeof body?.newsId === 'string' ? body.newsId : undefined;
    const tone = typeof body?.tone === 'string' ? body.tone : undefined;
    const targetAudience =
      typeof body?.targetAudience === 'string' ? body.targetAudience : undefined;
    const extraInstruction =
      typeof body?.extraInstruction === 'string' ? body.extraInstruction : undefined;
    const forceRegenerate = Boolean(body?.forceRegenerate);
    const publish = body?.publish === undefined ? true : Boolean(body.publish);

    if (newsId) {
      const result = await generateBlogPostFromNews({
        newsId,
        tone,
        targetAudience,
        extraInstruction,
        forceRegenerate,
        publish,
      });

      return NextResponse.json({ success: true, mode: 'single', ...result });
    }

    const limit = Math.max(1, Math.min(Number(body?.limit || 5), 30));
    const result = await generateBlogPostsFromLatestNews({
      limit,
      tone,
      targetAudience,
      publish,
    });

    return NextResponse.json({ success: true, mode: 'batch', ...result });
  } catch (error) {
    console.error('Admin blog generation error:', error);
    return NextResponse.json({ error: 'Failed to generate blog posts' }, { status: 500 });
  }
}
