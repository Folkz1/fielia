import { NextRequest, NextResponse } from 'next/server';
import { runNewsCuration } from '@/lib/news/curation';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const expected = process.env.NEWS_CURATION_SECRET;
    const provided = req.headers.get('x-news-curation-secret');
    if (expected && provided !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await runNewsCuration();
    return NextResponse.json(result);
  } catch (error) {
    console.error('News curation error:', error);
    return NextResponse.json(
      { error: 'Failed to curate news' },
      { status: 500 }
    );
  }
}
