import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { generatePodcast } from '@/lib/podcast/generate';
import { getCuratedNews } from '@/lib/bot/services/news.service';

function checkSecret(req: NextRequest): boolean {
  const secret = req.headers.get('x-news-sync-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
  return secret === process.env.NEWS_SYNC_SECRET;
}

async function checkAdminOrSecret(req: NextRequest): Promise<boolean> {
  if (checkSecret(req)) return true;
  const session = await auth();
  if (!session?.user?.id) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  return user?.isAdmin === true;
}

// GET - Listar podcasts
export async function GET(req: NextRequest) {
  if (!(await checkAdminOrSecret(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT id::text, title, script, news_ids, tts_model, tts_voice,
             length(audio) as audio_size, created_at
      FROM podcasts
      ORDER BY created_at DESC
      LIMIT 20
    `);

    const podcasts = rows.map(r => ({
      id: r.id,
      title: r.title,
      script: r.script,
      newsIds: r.news_ids,
      ttsModel: r.tts_model,
      ttsVoice: r.tts_voice,
      audioSize: Number(r.audio_size),
      createdAt: r.created_at,
    }));

    return NextResponse.json({ podcasts });
  } catch (error) {
    if (String(error).includes('does not exist')) {
      return NextResponse.json({ podcasts: [], needsMigration: true });
    }
    console.error('[Podcast] Erro ao listar:', error);
    return NextResponse.json({ error: 'Erro ao listar podcasts' }, { status: 500 });
  }
}

// POST - Gerar novo podcast
export async function POST(req: NextRequest) {
  if (!(await checkAdminOrSecret(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Buscar noticias curadas do dia
    const news = await getCuratedNews(5, 48);

    if (!news.length) {
      return NextResponse.json({ error: 'Nenhuma noticia curada encontrada' }, { status: 404 });
    }

    // Buscar conteudo completo das noticias
    const fullNews = await prisma.news.findMany({
      where: { id: { in: news.map(n => n.id) } },
      select: { id: true, title: true, summary: true, content: true, category: true },
    });

    const result = await generatePodcast(fullNews);

    return NextResponse.json({
      success: true,
      podcast: {
        id: result.id,
        title: result.title,
        script: result.script,
        newsIds: result.newsIds,
        model: result.model,
        ttsModel: result.ttsModel,
        estimatedCostUsd: result.estimatedCostUsd,
      },
    });
  } catch (error) {
    console.error('[Podcast] Erro ao gerar:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao gerar podcast' },
      { status: 500 }
    );
  }
}
