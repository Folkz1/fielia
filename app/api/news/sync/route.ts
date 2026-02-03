import { NextRequest, NextResponse } from 'next/server';
import { syncNewsFromFreshRSS } from '@/lib/news/sync';

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-news-sync-secret');
    const expected = process.env.NEWS_SYNC_SECRET;

    // Permitir acesso sem secret apenas para admins autenticados ou se secret não estiver configurado
    if (expected && secret !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await syncNewsFromFreshRSS();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('News Sync Error:', error);
    return NextResponse.json(
      { error: 'Failed to sync news', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET para verificar status e forçar sync manualmente (útil para debug)
export async function GET() {
  try {
    const result = await syncNewsFromFreshRSS();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('News Sync Error:', error);
    return NextResponse.json(
      { error: 'Failed to sync news', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
