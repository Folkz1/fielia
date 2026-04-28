import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getPremiumAccess } from '@/lib/premium';

type RankingPeriod = 'weekly' | 'monthly' | 'alltime';

function resolvePeriod(value: string | null): RankingPeriod {
  if (value === 'monthly' || value === 'alltime') return value;
  return 'weekly';
}

function periodWhere(period: RankingPeriod) {
  const now = new Date();

  if (period === 'weekly') {
    return { lastActive: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } };
  }

  if (period === 'monthly') {
    return { lastActive: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } };
  }

  return undefined;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const period = resolvePeriod(searchParams.get('period'));
    const quizId = searchParams.get('quizId');
    const requestedLimit = Number.parseInt(searchParams.get('limit') || '10', 10);
    const safeRequestedLimit = Number.isFinite(requestedLimit) ? requestedLimit : 10;

    const premiumAccess = session?.user?.id
      ? await getPremiumAccess(session.user.id)
      : { isPremium: false, isAdmin: false, subscriptionEnd: null };

    const maxLimit = premiumAccess.isPremium ? 100 : 10;
    const limit = Math.max(1, Math.min(safeRequestedLimit, maxLimit));
    const where = periodWhere(period);

    if (quizId) {
      const attempts = await prisma.quizAttempt.findMany({
        where: { quizId, completedAt: { not: null } },
        orderBy: [{ totalPoints: 'desc' }, { completedAt: 'asc' }],
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              currentStreak: true,
              lastActive: true,
            },
          },
        },
      });

      const ranking = attempts.map((attempt, index) => ({
        rank: index + 1,
        id: attempt.user.id,
        name: attempt.user.name,
        totalPoints: attempt.totalPoints,
        currentStreak: attempt.user.currentStreak,
        lastActive: attempt.user.lastActive,
        accuracy: attempt.accuracy,
        attemptId: attempt.id,
      }));

      let viewer = null;
      if (session?.user?.id) {
        const viewerAttempt = await prisma.quizAttempt.findFirst({
          where: {
            quizId,
            userId: session.user.id,
            completedAt: { not: null },
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                currentStreak: true,
                lastActive: true,
              },
            },
          },
        });

        if (viewerAttempt) {
          const attemptsAbove = await prisma.quizAttempt.count({
            where: {
              quizId,
              completedAt: { not: null },
              totalPoints: { gt: viewerAttempt.totalPoints },
            },
          });

          viewer = {
            rank: attemptsAbove + 1,
            id: viewerAttempt.user.id,
            name: viewerAttempt.user.name,
            totalPoints: viewerAttempt.totalPoints,
            currentStreak: viewerAttempt.user.currentStreak,
            lastActive: viewerAttempt.user.lastActive,
            accuracy: viewerAttempt.accuracy,
            attemptId: viewerAttempt.id,
          };
        }
      }

      const response = NextResponse.json({
        ranking,
        period,
        quizId,
        viewer,
        isPremium: premiumAccess.isPremium,
        requiresPremium: !premiumAccess.isPremium,
        maxVisible: maxLimit,
      });
      response.headers.set('Cache-Control', 'private, no-store');
      return response;
    }

    const topUsers = await prisma.user.findMany({
      where,
      orderBy: [{ totalPoints: 'desc' }, { updatedAt: 'asc' }],
      take: limit,
      select: {
        id: true,
        name: true,
        totalPoints: true,
        currentStreak: true,
        lastActive: true,
      },
    });

    const ranking = topUsers.map((user, index) => ({
      rank: index + 1,
      ...user,
    }));

    let viewer = null;
    if (session?.user?.id) {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          totalPoints: true,
          currentStreak: true,
          lastActive: true,
        },
      });

      if (currentUser) {
        const usersAbove = await prisma.user.count({
          where: {
            ...(where || {}),
            totalPoints: { gt: currentUser.totalPoints },
          },
        });

        viewer = {
          rank: usersAbove + 1,
          ...currentUser,
        };
      }
    }

    const response = NextResponse.json({
      ranking,
      period,
      viewer,
      isPremium: premiumAccess.isPremium,
      requiresPremium: !premiumAccess.isPremium,
      maxVisible: maxLimit,
    });
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    console.error('Ranking API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ranking' },
      { status: 500 }
    );
  }
}
