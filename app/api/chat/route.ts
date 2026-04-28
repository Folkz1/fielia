import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { routeMessage } from '@/lib/bot/router';
import { getPremiumAccess } from '@/lib/premium';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, platform = 'web' } = await req.json();
    const userId = session.user.id;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const premiumAccess = await getPremiumAccess(userId);
    if (!premiumAccess.isPremium) {
      return NextResponse.json(
        {
          response: 'Chat com IA no app e exclusivo para assinantes Fiel Premium.',
          type: 'premium_required',
          requiresPremium: true,
        },
        { status: 403 }
      );
    }

    let chat = await prisma.aIChat.findFirst({
      where: { userId, platform },
      orderBy: { createdAt: 'desc' },
    });

    if (!chat) {
      chat = await prisma.aIChat.create({
        data: {
          userId,
          platform,
          sessionId: `${platform}-${Date.now()}`,
        },
      });
    }

    await prisma.aIMessage.create({
      data: { chatId: chat.id, role: 'user', content: message },
    });

    const botResponse = await routeMessage(userId, message, platform);

    await prisma.aIMessage.create({
      data: { chatId: chat.id, role: 'assistant', content: botResponse.content },
    });

    return NextResponse.json({
      response: botResponse.content,
      type: botResponse.type,
      mediaUrl: botResponse.mediaUrl,
      options: botResponse.options,
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'Failed to process chat message' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chats = await prisma.aIChat.findMany({
      where: { userId: session.user.id, platform: 'web' },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    return NextResponse.json({ chats });
  } catch (error) {
    console.error('Get Chats Error:', error);
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 });
  }
}
