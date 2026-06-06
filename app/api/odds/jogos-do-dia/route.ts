import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getJogosDoDia } from '@/lib/odds/scrape';

// Próximos jogos com odds (bet365) + probabilidades das ligas acompanhadas, agrupados por liga.
// Acesso: qualquer usuário logado (mesmo público do dashboard).
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const ligas = await getJogosDoDia();
    return NextResponse.json({ ligas, fetchedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ligas: [], fetchedAt: new Date().toISOString() });
  }
}
