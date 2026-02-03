import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { startScheduler } from '@/lib/scheduler';

export async function GET() {
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
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    return NextResponse.json({
      cronEnabled: process.env.CRON_ENABLED === 'true',
      nodeEnv: process.env.NODE_ENV,
      schedules: {
        newsSync: process.env.CRON_NEWS_SYNC_SCHEDULE || '0 */6 * * *',
        newsCuration: process.env.CRON_NEWS_CURATION_SCHEDULE || '30 7 * * *',
        newsletter: process.env.CRON_NEWSLETTER_SCHEDULE || '0 9 * * *',
        weeklyQuiz: process.env.CRON_WEEKLY_QUIZ_SCHEDULE || '0 8 * * 1',
      },
      freshRss: {
        url: process.env.FRESHRSS_URL ? 'configured' : 'missing',
        categoryId: process.env.FRESHRSS_CATEGORY_ID || 'not set',
      },
    });
  } catch (error) {
    console.error('Scheduler status error:', error);
    return NextResponse.json(
      { error: 'Failed to get scheduler status' },
      { status: 500 }
    );
  }
}

export async function POST() {
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
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Forçar início do scheduler (ignora NODE_ENV check temporariamente)
    startScheduler();

    return NextResponse.json({
      success: true,
      message: 'Scheduler start requested',
      note: 'Scheduler only runs in production mode (NODE_ENV=production)',
    });
  } catch (error) {
    console.error('Scheduler start error:', error);
    return NextResponse.json(
      { error: 'Failed to start scheduler' },
      { status: 500 }
    );
  }
}
