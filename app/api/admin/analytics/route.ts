import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Estatísticas de usuários
    const [
      totalUsers,
      premiumUsers,
      activeToday,
      activeThisWeek,
      newUsersThisWeek,
      newUsersThisMonth,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isPremium: true } }),
      prisma.user.count({ where: { lastActive: { gte: today } } }),
      prisma.user.count({ where: { lastActive: { gte: thisWeek } } }),
      prisma.user.count({ where: { createdAt: { gte: thisWeek } } }),
      prisma.user.count({ where: { createdAt: { gte: thisMonth } } }),
    ]);

    // Estatísticas de quiz
    const [
      totalQuizAttempts,
      quizAttemptsThisWeek,
      avgQuizScore,
    ] = await Promise.all([
      prisma.quizAttempt.count(),
      prisma.quizAttempt.count({ where: { startedAt: { gte: thisWeek } } }),
      prisma.quizAttempt.aggregate({
        _avg: { accuracy: true },
        where: { completedAt: { not: null } },
      }),
    ]);

    // Estatísticas de chat
    const [
      totalMessages,
      messagesThisWeek,
      totalChats,
    ] = await Promise.all([
      prisma.aIMessage.count(),
      prisma.aIMessage.count({ where: { createdAt: { gte: thisWeek } } }),
      prisma.aIChat.count(),
    ]);

    // Estatísticas de notícias
    const [
      totalNews,
      newsThisWeek,
    ] = await Promise.all([
      prisma.news.count(),
      prisma.news.count({ where: { publishedAt: { gte: thisWeek } } }),
    ]);

    // Top 5 usuários por pontos
    const topUsers = await prisma.user.findMany({
      orderBy: { totalPoints: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        totalPoints: true,
        isPremium: true,
        currentStreak: true,
      },
    });

    // Usuários com assinatura expirando em 7 dias
    const expiringSubscriptions = await prisma.user.count({
      where: {
        isPremium: true,
        subscriptionEnd: {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    // Últimos 5 usuários cadastrados
    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        isPremium: true,
        createdAt: true,
      },
    });

    // Quizzes ativos
    const activeQuizzes = await prisma.quiz.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        _count: { select: { questions: true, attempts: true } },
      },
    });

    // Próximos quizzes
    const upcomingQuizzes = await prisma.quiz.findMany({
      where: {
        isActive: true,
        startDate: { gt: now },
      },
      orderBy: { startDate: 'asc' },
      take: 3,
      include: {
        _count: { select: { questions: true } },
      },
    });

    return NextResponse.json({
      users: {
        total: totalUsers,
        premium: premiumUsers,
        activeToday,
        activeThisWeek,
        newThisWeek: newUsersThisWeek,
        newThisMonth: newUsersThisMonth,
        expiringSubscriptions,
        conversionRate: totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(1) : 0,
      },
      quiz: {
        totalAttempts: totalQuizAttempts,
        attemptsThisWeek: quizAttemptsThisWeek,
        avgAccuracy: avgQuizScore._avg.accuracy?.toFixed(1) || 0,
        activeQuizzes,
        upcomingQuizzes,
      },
      chat: {
        totalMessages,
        messagesThisWeek,
        totalChats,
        avgMessagesPerChat: totalChats > 0 ? (totalMessages / totalChats).toFixed(1) : 0,
      },
      news: {
        total: totalNews,
        thisWeek: newsThisWeek,
      },
      topUsers,
      recentUsers,
    });
  } catch (error) {
    console.error('Analytics Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
