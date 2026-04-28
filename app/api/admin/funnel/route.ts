import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isFunnelEnabled, processDueFunnelMessages } from '@/lib/funnel/queue';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized', status: 401 as const };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) return { error: 'Admin access required', status: 403 as const };
  return { userId: session.user.id };
}
export async function GET() {
  try {
    const admin = await requireAdmin();
    if ('error' in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const [pending, sent, failed, processing] = await Promise.all([
      prisma.whatsAppFunnelMessage.count({ where: { status: 'pending' } }),
      prisma.whatsAppFunnelMessage.count({ where: { status: 'sent' } }),
      prisma.whatsAppFunnelMessage.count({ where: { status: 'failed' } }),
      prisma.whatsAppFunnelMessage.count({ where: { status: 'processing' } }),
    ]);

    return NextResponse.json({
      enabled: isFunnelEnabled(),
      counts: { pending, sent, failed, processing },
    });
  } catch (error) {
    console.error('Funnel status error:', error);
    return NextResponse.json({ error: 'Failed to get funnel status' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const admin = await requireAdmin();
    if ('error' in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const result = await processDueFunnelMessages();
    return NextResponse.json({
      enabled: isFunnelEnabled(),
      ...result,
    });
  } catch (error) {
    console.error('Funnel process error:', error);
    return NextResponse.json({ error: 'Failed to process funnel queue' }, { status: 500 });
  }
}
