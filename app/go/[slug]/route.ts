import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;

  const affiliate = await prisma.affiliate.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true,
      baseUrl: true,
      trackingParam: true,
      trackingValue: true,
    },
  });

  if (!affiliate) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Track click
  const source = request.nextUrl.searchParams.get('src') || 'direct';
  const referrer = request.nextUrl.searchParams.get('ref') || null;

  await prisma.affiliateClick.create({
    data: {
      affiliateId: affiliate.id,
      source,
      referrer,
      userAgent: request.headers.get('user-agent') || null,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
    },
  });

  // Build redirect URL with tracking
  const url = new URL(affiliate.baseUrl);
  if (affiliate.trackingParam && affiliate.trackingValue) {
    url.searchParams.set(affiliate.trackingParam, affiliate.trackingValue);
  }

  return NextResponse.redirect(url.toString());
}
