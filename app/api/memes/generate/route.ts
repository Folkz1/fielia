import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getPremiumAccess } from '@/lib/premium';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const premiumAccess = await getPremiumAccess(userId);

    if (!premiumAccess.isPremium) {
      return NextResponse.json(
        {
          error: 'Geracao de imagens e exclusiva para assinantes Fiel Premium. Assine para desbloquear.',
          remaining: 0,
          requiresPremium: true,
        },
        { status: 403 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const memesToday = await prisma.meme.count({
      where: {
        userId,
        createdAt: { gte: today },
      },
    });

    const dailyLimit = premiumAccess.isAdmin ? 999 : 15;
    if (!premiumAccess.isAdmin && memesToday >= dailyLimit) {
      return NextResponse.json(
        {
          error: `Limite diario atingido (${dailyLimit} memes/dia).`,
          remaining: 0,
        },
        { status: 429 }
      );
    }

    const monthlyLimit = premiumAccess.isAdmin ? 9999 : 20;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const memesThisMonth = await prisma.meme.count({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
      },
    });

    if (!premiumAccess.isAdmin && memesThisMonth >= monthlyLimit) {
      return NextResponse.json(
        {
          error: `Limite mensal atingido (${monthlyLimit} memes/mes). Seu limite renova no proximo mes.`,
          remaining: 0,
          monthlyRemaining: 0,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { prompt, newsId } = body as { prompt?: string; newsId?: string };

    let memeContext = prompt || '';

    if (newsId) {
      const news = await prisma.news.findUnique({
        where: { id: newsId },
        select: { title: true, summary: true, category: true },
      });

      if (!news) {
        return NextResponse.json({ error: 'Noticia nao encontrada' }, { status: 404 });
      }

      memeContext = `Crie um meme engracado do Corinthians baseado nesta noticia: "${news.title}". Resumo: ${news.summary}. Categoria: ${news.category}`;
    }

    if (!memeContext.trim()) {
      return NextResponse.json({ error: 'Envie um prompt ou newsId' }, { status: 400 });
    }

    const { generateMeme } = await import('@/lib/bot/services/meme.service');
    const result = await generateMeme(userId, memeContext);

    if (result.type === 'image' && result.mediaUrl) {
      const meme = await prisma.meme.create({
        data: {
          userId,
          prompt: memeContext,
          caption: result.content,
          imageUrl: result.mediaUrl,
          newsId: newsId || null,
          imageData: result.imageBytes ? new Uint8Array(result.imageBytes) : null,
        },
      });

      return NextResponse.json({
        meme: {
          id: meme.id,
          caption: meme.caption,
          imageUrl: meme.imageUrl,
          createdAt: meme.createdAt,
        },
        remaining: Math.max(0, dailyLimit - memesToday - 1),
        monthlyRemaining: Math.max(0, monthlyLimit - memesThisMonth - 1),
      });
    }

    return NextResponse.json(
      { error: result.content || 'Erro ao gerar meme. Tente novamente.' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Meme generate error:', error);
    return NextResponse.json(
      { error: 'Erro interno ao gerar meme' },
      { status: 500 }
    );
  }
}
