import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getOddsProximoJogo } from '@/lib/odds/scrape';

// Monitor do scraper de odds (Academia das Apostas). Protegido por isAdmin no servidor.
// GET ?time=corinthians&fresh=1 -> status + odds 1x2 do próximo jogo do time.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const url = new URL(req.url);
  const time = (url.searchParams.get('time') || 'corinthians').toLowerCase().trim().slice(0, 40);
  const fresh = url.searchParams.get('fresh') === '1';

  const startedAt = Date.now();
  try {
    const jogo = await getOddsProximoJogo(time, fresh);
    return NextResponse.json({
      ok: true,
      time,
      encontrouJogo: !!jogo,
      jogo, // OddsJogo | null. temOdds=false => mercado ainda fechado
      latencyMs: Date.now() - startedAt,
      fetchedAt: new Date().toISOString(),
      fonte: 'academiadasapostas.com',
    });
  } catch {
    return NextResponse.json(
      { ok: false, time, error: 'scrape_failed', latencyMs: Date.now() - startedAt, fetchedAt: new Date().toISOString() },
      { status: 200 },
    );
  }
}
