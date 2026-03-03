import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

async function checkAdmin() {
  const session = await auth();
  if (!session?.user?.id) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });
  return user?.isAdmin || false;
}

export async function GET() {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [total, active, clicksToday, clicksMonth] = await Promise.all([
    prisma.affiliate.count(),
    prisma.affiliate.count({ where: { isActive: true } }),
    prisma.affiliateClick.count({ where: { createdAt: { gte: today } } }),
    prisma.affiliateClick.count({ where: { createdAt: { gte: thisMonth } } }),
  ]);

  // Clicks by source
  const clicksBySource = await prisma.affiliateClick.groupBy({
    by: ['source'],
    _count: true,
    where: { createdAt: { gte: thisMonth } },
  });

  return NextResponse.json({
    total,
    active,
    clicksToday,
    clicksMonth,
    clicksBySource: clicksBySource.map((c) => ({
      source: c.source,
      count: c._count,
    })),
  });
}
