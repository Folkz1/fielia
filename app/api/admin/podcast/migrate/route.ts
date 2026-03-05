import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS podcasts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        script TEXT NOT NULL,
        audio BYTEA,
        news_ids TEXT[] DEFAULT '{}',
        tts_model TEXT DEFAULT 'tts-1',
        tts_voice TEXT DEFAULT 'nova',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_podcasts_created_at ON podcasts (created_at DESC)
    `);

    return NextResponse.json({ success: true, message: 'Tabela podcasts criada' });
  } catch (error) {
    console.error('[Podcast Migration]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Migration failed' },
      { status: 500 }
    );
  }
}
