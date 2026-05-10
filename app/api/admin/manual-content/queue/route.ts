import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { processDueManualContentMessages } from '@/lib/funnel/queue';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized', status: 401 as const };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    return { error: 'Admin access required', status: 403 as const };
  }

  return { userId: session.user.id };
}

export async function GET() {
  const admin = await requireAdmin();
  if ('error' in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const [pending, sent, failed, processing, next] = await Promise.all([
    prisma.whatsAppFunnelMessage.count({ where: { stage: 'manual_content', status: 'pending' } }),
    prisma.whatsAppFunnelMessage.count({ where: { stage: 'manual_content', status: 'sent' } }),
    prisma.whatsAppFunnelMessage.count({ where: { stage: 'manual_content', status: 'failed' } }),
    prisma.whatsAppFunnelMessage.count({ where: { stage: 'manual_content', status: 'processing' } }),
    prisma.whatsAppFunnelMessage.findFirst({
      where: { stage: 'manual_content', status: 'pending' },
      orderBy: { scheduledFor: 'asc' },
      select: { scheduledFor: true, kind: true },
    }),
  ]);

  return NextResponse.json({
    enabled: process.env.WHATSAPP_MANUAL_CONTENT_ENABLED === 'true',
    counts: { pending, sent, failed, processing },
    next,
    batch: {
      limit: Number.parseInt(process.env.WHATSAPP_MANUAL_CONTENT_BATCH_LIMIT || '10', 10) || 10,
      delayMs: Number.parseInt(process.env.WHATSAPP_QUEUE_DELAY_MS || '8000', 10) || 8000,
      jitterMs: Number.parseInt(process.env.WHATSAPP_QUEUE_JITTER_MS || '3000', 10) || 3000,
    },
  });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if ('error' in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const body = await req.json().catch(() => ({}));
  const limit = Math.max(1, Math.min(100, Number.parseInt(String(body.limit || '10'), 10) || 10));
  const result = await processDueManualContentMessages(limit);

  return NextResponse.json({
    success: true,
    ...result,
  });
}
