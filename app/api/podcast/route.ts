import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Listar podcasts publicos (sem audio binario)
export async function GET(req: NextRequest) {
  try {
    const limit = Math.min(20, Number(req.nextUrl.searchParams.get('limit') || '10'));

    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT id, title, script, news_ids, tts_voice,
             length(audio) as audio_size, created_at
      FROM podcasts
      ORDER BY created_at DESC
      LIMIT $1
    `, limit);

    const podcasts = rows.map(r => ({
      id: r.id,
      title: r.title,
      script: r.script,
      newsIds: r.news_ids,
      voice: r.tts_voice,
      audioSize: Number(r.audio_size),
      createdAt: r.created_at,
    }));

    return NextResponse.json({ podcasts });
  } catch (error) {
    if (String(error).includes('does not exist')) {
      return NextResponse.json({ podcasts: [] });
    }
    return NextResponse.json({ error: 'Erro ao listar podcasts' }, { status: 500 });
  }
}
