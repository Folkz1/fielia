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
        podcast: process.env.CRON_PODCAST_SCHEDULE || '0 8 * * *',
        newsletter: process.env.CRON_NEWSLETTER_SCHEDULE || '0 9 * * *',
        weeklyQuiz: process.env.CRON_WEEKLY_QUIZ_SCHEDULE || '0 8 * * 1',
        whatsappFunnel: process.env.CRON_WHATSAPP_FUNNEL_SCHEDULE || '* * * * *',
        manualContentSend: process.env.CRON_MANUAL_CONTENT_SEND_SCHEDULE || '* * * * *',
      },
      whatsappFunnel: {
        enabled: process.env.WHATSAPP_FUNNEL_ENABLED === 'true',
      },
      manualContentSend: {
        enabled: process.env.WHATSAPP_MANUAL_CONTENT_ENABLED === 'true',
        batchLimit: Number.parseInt(process.env.WHATSAPP_MANUAL_CONTENT_BATCH_LIMIT || '10', 10) || 10,
        queueDelayMs: Number.parseInt(process.env.WHATSAPP_QUEUE_DELAY_MS || '8000', 10) || 8000,
        queueJitterMs: Number.parseInt(process.env.WHATSAPP_QUEUE_JITTER_MS || '3000', 10) || 3000,
      },
      recurringAi: {
        newsCurationUseAI: process.env.NEWS_CURATION_USE_AI === 'true',
        newsRewriteEnabled: process.env.NEWS_REWRITE_ENABLED !== 'false',
        blogAutoGenerate: process.env.BLOG_AUTO_GENERATE === 'true',
        podcastCronEnabled: process.env.PODCAST_CRON_ENABLED === 'true',
      },
      whatsappGroupJoinWelcome: {
        enabled: process.env.WHATSAPP_GROUP_JOIN_WELCOME_ENABLED === 'true',
        cooldownHours:
          Number.parseInt(process.env.WHATSAPP_GROUP_JOIN_WELCOME_COOLDOWN_HOURS || '6', 10) || 6,
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
