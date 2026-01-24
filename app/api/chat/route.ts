import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateCorinthiansResponse } from '@/lib/openrouter';

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
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
          take: 10, // Last 10 messages for context
        },
      },
    });

    if (!chat) {
      chat = await prisma.aIChat.create({
        data: {
          userId,
          platform,
          sessionId: `${platform}-${Date.now()}`,
          messages: {
            create: {
              role: 'user',
              content: message,
            },
          },
        },
        include: {
          messages: true,
        },
      });
    } else {
      // Add user message to existing chat
      await prisma.aIMessage.create({
        data: {
          chatId: chat.id,
          role: 'user',
          content: message,
        },
      });
    }

    // Generate AI response
    const aiResponse = await generateCorinthiansResponse(message);

    // Save AI response
    await prisma.aIMessage.create({
      data: {
        chatId: chat.id,
        role: 'assistant',
        content: aiResponse.content,
        tokensUsed: aiResponse.tokensUsed,
        model: aiResponse.model,
      },
    });

    return NextResponse.json({
      response: aiResponse.content,
      tokensUsed: aiResponse.tokensUsed,
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
      take: 5,
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
