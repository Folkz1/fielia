import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Rate limiting: check daily meme count
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isPremium: true, subscriptionEnd: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const memesToday = await prisma.meme.count({
      where: {
        userId,
        createdAt: { gte: today },
      },
    });

    const now = new Date();
    const isPremiumActive =
      Boolean(user?.isPremium) &&
      (!user?.subscriptionEnd || user.subscriptionEnd > now);

    if (user?.isPremium && user.subscriptionEnd && user.subscriptionEnd <= now) {
      await prisma.user.update({
        where: { id: userId },
        data: { isPremium: false, subscriptionEnd: null },
      });
    }

    // Block non-premium users entirely
    if (!isPremiumActive) {
      return NextResponse.json(
        {
          error: 'Geração de imagens é exclusiva para assinantes Fiel Premium. Assine para desbloquear!',
          remaining: 0,
          requiresPremium: true,
        },
        { status: 403 }
      );
    }

    const dailyLimit = 15;
    if (memesToday >= dailyLimit) {
      return NextResponse.json(
        {
          error: `Limite diário atingido (${dailyLimit} memes/dia).`,
          remaining: 0,
        },
        { status: 429 }
      );
    }

    // Monthly limit: 20 memes/month for premium users
    const monthlyLimit = 20;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const memesThisMonth = await prisma.meme.count({
      where: {
        userId,
        createdAt: { gte: startOfMonth },
      },
    });

    if (memesThisMonth >= monthlyLimit) {
      return NextResponse.json(
        {
          error: `Limite mensal atingido (${monthlyLimit} memes/mês). Seu limite renova no próximo mês.`,
          remaining: 0,
          monthlyRemaining: 0,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { prompt, newsId } = body as { prompt?: string; newsId?: string };

    let memeContext = prompt || '';

    // If newsId provided, fetch news for context
    if (newsId) {
      const news = await prisma.news.findUnique({
        where: { id: newsId },
        select: { title: true, summary: true, category: true },
      });

      if (!news) {
        return NextResponse.json({ error: 'Noticia nao encontrada' }, { status: 404 });
      }

      memeContext = `Crie um meme engraçado do Corinthians baseado nesta notícia: "${news.title}". Resumo: ${news.summary}. Categoria: ${news.category}`;
    }

    if (!memeContext.trim()) {
      return NextResponse.json({ error: 'Envie um prompt ou newsId' }, { status: 400 });
    }

    // Dynamic import to avoid loading OpenRouter SDK on cold paths
    const { generateMeme } = await import('@/lib/bot/services/meme.service');
    const result = await generateMeme(userId, memeContext);

    if (result.type === 'image' && result.mediaUrl) {
      // Save meme to database
      const meme = await prisma.meme.create({
        data: {
          userId,
          prompt: memeContext,
          caption: result.content,
          imageUrl: result.mediaUrl,
          newsId: newsId || null,
        },
      });

      return NextResponse.json({
        meme: {
          id: meme.id,
          caption: meme.caption,
          imageUrl: meme.imageUrl,
          createdAt: meme.createdAt,
        },
        remaining: dailyLimit - memesToday - 1,
        monthlyRemaining: monthlyLimit - memesThisMonth - 1,
      });
    }

    // Text fallback (image generation failed)
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
