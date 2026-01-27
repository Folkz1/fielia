import { NextRequest, NextResponse } from 'next/server';
import { syncNewsFromFreshRSS } from '@/lib/news/sync';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const expected = process.env.NEWS_SYNC_SECRET;
    const provided = req.headers.get('x-news-sync-secret');
    if (expected && provided !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await syncNewsFromFreshRSS();
    return NextResponse.json(result);
  } catch (error) {
    console.error('News sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync news' },
      { status: 500 }
    );
  }
}
