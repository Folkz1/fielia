import { NextRequest, NextResponse } from 'next/server';
import { sendNewsletterToPremiumUsers } from '@/lib/news/newsletter';

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-newsletter-secret');
    const expected = process.env.NEWSLETTER_SECRET;

    if (!expected || secret !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await sendNewsletterToPremiumUsers();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Newsletter Error:', error);
    return NextResponse.json(
      { error: 'Failed to send newsletter' },
      { status: 500 }
    );
  }
}
