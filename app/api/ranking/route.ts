import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'weekly'; // weekly, monthly, alltime
    const limit = parseInt(searchParams.get('limit') || '10');

    // Calculate date range
    let startDate: Date | undefined;
    const now = new Date();

    if (period === 'weekly') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'monthly') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get top users by points
    const topUsers = await prisma.user.findMany({
      where: startDate
        ? {
            lastActive: {
              gte: startDate,
            },
          }
        : undefined,
      orderBy: {
        totalPoints: 'desc',
      },
      take: limit,
      select: {
        id: true,
        name: true,
        totalPoints: true,
        currentStreak: true,
        lastActive: true,
      },
    });

    // Add rank to each user
    const ranking = topUsers.map((user, index) => ({
      rank: index + 1,
      ...user,
    }));

    return NextResponse.json({ ranking, period });
  } catch (error) {
    console.error('Ranking API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ranking' },
      { status: 500 }
    );
  }
}
