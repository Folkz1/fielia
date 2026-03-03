import { NextRequest, NextResponse } from 'next/server';
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

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();

  const affiliate = await prisma.affiliate.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      logoUrl: body.logoUrl,
      baseUrl: body.baseUrl,
      trackingParam: body.trackingParam,
      trackingValue: body.trackingValue,
      ctaText: body.ctaText,
      ctaDescription: body.ctaDescription,
      disclaimer: body.disclaimer,
      isActive: body.isActive,
      showInBlog: body.showInBlog,
      showInNews: body.showInNews,
      showInChat: body.showInChat,
      showInNewsletter: body.showInNewsletter,
      revenueModel: body.revenueModel,
      revenueDetails: body.revenueDetails,
    },
  });

  return NextResponse.json(affiliate);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  await prisma.affiliate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
