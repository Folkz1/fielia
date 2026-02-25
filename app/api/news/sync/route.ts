import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { syncNewsFromFreshRSS } from '@/lib/news/sync';

async function isAdminUser() {
  const session = await auth();
  if (!session?.user?.id) return false;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  return Boolean(user?.isAdmin);
}

async function isAuthorized(req: NextRequest) {
  const expected = process.env.NEWS_SYNC_SECRET;
  const secret = req.headers.get('x-news-sync-secret');

  if (!expected) return true;
  if (secret === expected) return true;
  return isAdminUser();
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAuthorized(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await syncNewsFromFreshRSS();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('News Sync Error:', error);
    return NextResponse.json(
      { error: 'Failed to sync news', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!(await isAuthorized(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await syncNewsFromFreshRSS();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('News Sync Error:', error);
    return NextResponse.json(
      { error: 'Failed to sync news', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
