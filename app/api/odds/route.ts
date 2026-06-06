import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getOddsProximoJogo, probabilidadesImplicitas } from '@/lib/odds/scrape';

// Odds + probabilidades do próximo jogo do Corinthians, para o dashboard do torcedor.
// Acesso: qualquer usuário logado (mesmo público do dashboard) — não exige premium nem admin.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const jogo = await getOddsProximoJogo('corinthians');
    const probabilidades = jogo && jogo.temOdds ? probabilidadesImplicitas(jogo) : null;
    return NextResponse.json({ jogo, probabilidades, fetchedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ jogo: null, probabilidades: null, fetchedAt: new Date().toISOString() });
  }
}
