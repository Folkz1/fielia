import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isPremium: true, subscriptionEnd: true, isAdmin: true },
    });

    const memesToday = await prisma.meme.count({
      where: { userId, createdAt: { gte: today } },
    });

    const now = new Date();
    const isPremiumActive =
      Boolean(user?.isPremium) &&
      (!user?.subscriptionEnd || user.subscriptionEnd > now);

    if (user?.isPremium && user.subscriptionEnd && user.subscriptionEnd <= now) {
      await prisma.user.update({
        where: { id: userId },
        data: { isPremium: false, subscriptionEnd: null },
      });
    }

    const dailyLimit = user?.isAdmin ? 999 : isPremiumActive ? 15 : 3;

    return NextResponse.json({
      memes,
      remaining: Math.max(0, dailyLimit - memesToday),
      dailyLimit,
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
