import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getPremiumAccess } from '@/lib/premium';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const cursor = searchParams.get('cursor') || undefined;

    const memes = await prisma.meme.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        news: {
          select: { title: true, category: true },
        },
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const memesToday = await prisma.meme.count({
      where: { userId, createdAt: { gte: today } },
    });

    const premiumAccess = await getPremiumAccess(userId);
    const dailyLimit = premiumAccess.isAdmin ? 999 : premiumAccess.isPremium ? 15 : 0;

    return NextResponse.json({
      memes,
      remaining: Math.max(0, dailyLimit - memesToday),
      dailyLimit,
      isPremium: premiumAccess.isPremium,
      nextCursor: memes.length === limit ? memes[memes.length - 1]?.id : null,
    });
  } catch (error) {
    console.error('Memes list error:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar memes' },
      { status: 500 }
    );
  }
}
