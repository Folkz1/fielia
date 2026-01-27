import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { routeMessage } from '@/lib/bot/router';

export async function POST(req: NextRequest) {
  try {
    const { message, userId, platform = 'web' } = await req.json();

    if (!message || !userId) {
      return NextResponse.json(
        { error: 'Message and userId are required' },
        { status: 400 }
      );
    }

    // Find or create chat session
    let chat = await prisma.aIChat.findFirst({
      where: {
        userId,
        platform,
      },
      orderBy: {
        createdAt: 'desc',
      },
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
      data: {
        chatId: chat.id,
        role: 'user',
        content: message,
      },
    });

    // Use the SAME router as WhatsApp bot
    const botResponse = await routeMessage(userId, message);

    // Save bot response
    await prisma.aIMessage.create({
      data: {
        chatId: chat.id,
        role: 'assistant',
        content: botResponse.content,
      },
    });

    return NextResponse.json({
      response: botResponse.content,
      type: botResponse.type,
      mediaUrl: botResponse.mediaUrl,
      options: botResponse.options,
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const chats = await prisma.aIChat.findMany({
      where: {
        userId,
        platform: 'web',
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1, // Only latest chat
    });

    return NextResponse.json({ chats });
  } catch (error) {
    console.error('Get Chats Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chats' },
      { status: 500 }
    );
  }
}
