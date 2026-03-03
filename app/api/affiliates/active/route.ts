import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const source = request.nextUrl.searchParams.get('source') || 'blog';

    let where: Prisma.AffiliateWhereInput;
    switch (source) {
      case 'blog':
        where = { isActive: true, showInBlog: true };
        break;
      case 'news':
        where = { isActive: true, showInNews: true };
        break;
      case 'chat':
        where = { isActive: true, showInChat: true };
        break;
      case 'newsletter':
        where = { isActive: true, showInNewsletter: true };
        break;
      default:
        return NextResponse.json(null, { status: 400 });
    }

    const affiliate = await prisma.affiliate.findFirst({
      where,
      select: {
        slug: true,
        name: true,
        ctaText: true,
        ctaDescription: true,
        disclaimer: true,
        logoUrl: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!affiliate) {
      return NextResponse.json(null, { status: 404 });
    }

    return NextResponse.json(affiliate);
  } catch (error) {
    console.error('Affiliate active error:', error);
    return NextResponse.json(null, { status: 500 });
  }
}
