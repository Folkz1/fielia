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

export async function GET() {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const affiliates = await prisma.affiliate.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { clicks: true } },
    },
  });

  return NextResponse.json(affiliates);
}

export async function POST(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const slug = (body.slug || body.name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  if (!slug || !body.name || !body.baseUrl) {
    return NextResponse.json({ error: 'name, slug e baseUrl obrigatorios' }, { status: 400 });
  }

  const affiliate = await prisma.affiliate.create({
    data: {
      name: body.name,
      slug,
      description: body.description || null,
      logoUrl: body.logoUrl || null,
      baseUrl: body.baseUrl,
      trackingParam: body.trackingParam || null,
      trackingValue: body.trackingValue || null,
      ctaText: body.ctaText || 'Aposte agora',
      ctaDescription: body.ctaDescription || null,
      disclaimer: body.disclaimer || null,
      isActive: body.isActive ?? true,
      showInBlog: body.showInBlog ?? true,
      showInNews: body.showInNews ?? true,
      showInChat: body.showInChat ?? true,
      showInNewsletter: body.showInNewsletter ?? true,
      revenueModel: body.revenueModel || null,
      revenueDetails: body.revenueDetails || null,
    },
  });

  return NextResponse.json(affiliate);
}
