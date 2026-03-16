import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { routeMessage } from '@/lib/bot/router';

const FREE_DAILY_LIMIT = 10;

async function checkWebChatLimit(userId: string): Promise<{ allowed: boolean; message?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPremium: true, subscriptionEnd: true, dailyMessageCount: true, lastMessageDate: true },
  });

  if (!user) return { allowed: false, message: 'Usuário não encontrado.' };

  const now = new Date();
  const isPremiumActive = user.isPremium && (!user.subscriptionEnd || user.subscriptionEnd > now);
  if (isPremiumActive) return { allowed: true };

  // Daily reset
  const lastMessage = new Date(user.lastMessageDate);
  const isDifferentDay = now.toDateString() !== lastMessage.toDateString();

  if (isDifferentDay) {
    await prisma.user.update({
      where: { id: userId },
      data: { dailyMessageCount: 1, lastMessageDate: now },
    });
    return { allowed: true };
  }

  if (user.dailyMessageCount >= FREE_DAILY_LIMIT) {
    return {
      allowed: false,
      message: `Você atingiu o limite de ${FREE_DAILY_LIMIT} mensagens diárias. Assine o plano premium para conversas ilimitadas!`,
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { dailyMessageCount: { increment: 1 }, lastMessageDate: now },
  });

  return { allowed: true };
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, platform = 'web' } = await req.json();
    const userId = session.user.id;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Check usage limit for free users
    const limitCheck = await checkWebChatLimit(userId);
    if (!limitCheck.allowed) {
      return NextResponse.json({
        response: limitCheck.message,
        type: 'limit',
        limitReached: true,
      });
    }

    // Find or create chat session
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

    // Save user message
    await prisma.aIMessage.create({
      data: { chatId: chat.id, role: 'user', content: message },
    });

    // Use the SAME router as WhatsApp bot
    const botResponse = await routeMessage(userId, message);

    // Save bot response
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
