import { NextRequest, NextResponse } from 'next/server';
import {
  extractVideoId,
  transcribeAndIngest,
  getVideoInfo,
} from '@/lib/youtube/transcript';

// POST /api/bot/youtube
// Ingerir videos do YouTube no RAG via secret header (para automacao)
// Body: { urls: string[], category?: string }
// Header: x-news-sync-secret
export async function POST(req: NextRequest) {
  const expected = process.env.NEWS_SYNC_SECRET;
  const secret = req.headers.get('x-news-sync-secret');

  if (expected && secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const urls: string[] = body.urls || [];
    const category = body.category || 'general';

    if (!urls.length) {
      return NextResponse.json({ error: 'urls[] obrigatorio' }, { status: 400 });
    }

    const results: { url: string; videoId: string | null; success: boolean; chunks: number; error?: string }[] = [];

    for (const url of urls) {
      const videoId = extractVideoId(url);
      if (!videoId) {
        results.push({ url, videoId: null, success: false, chunks: 0, error: 'URL invalida' });
        continue;
      }

      try {
        const vInfo = await getVideoInfo(videoId);
        const result = await transcribeAndIngest(videoId, vInfo.title, category);
        results.push({ url, videoId, success: result.success, chunks: result.chunks });
      } catch (error) {
        results.push({
          url,
          videoId,
          success: false,
          chunks: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalChunks = results.reduce((sum, r) => sum + r.chunks, 0);

    return NextResponse.json({
      videosReceived: urls.length,
      videosTranscribed: successCount,
      totalChunks,
      results,
    });
  } catch (error) {
    console.error('[YouTube Bot] Erro:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    );
  }
}
