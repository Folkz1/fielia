import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Stream audio do podcast
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT audio, title FROM podcasts WHERE id = $1 LIMIT 1
    `, id);

    if (!rows.length || !rows[0].audio) {
      return NextResponse.json({ error: 'Podcast nao encontrado' }, { status: 404 });
    }

    const audio: Buffer = rows[0].audio;
    const title = rows[0].title || 'podcast';
    const safeName = title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 50);
    return new NextResponse(audio as unknown as BodyInit, {
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': String(audio.length),
        'Content-Disposition': `inline; filename="${safeName}.wav"`,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('[Podcast Audio] Erro:', error);
    return NextResponse.json({ error: 'Erro ao buscar audio' }, { status: 500 });
  }
}
