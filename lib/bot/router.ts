import { prisma } from '@/lib/prisma';
import { getCuratedNews, formatNewsMessage } from './services/news.service';
import { getTopUsers, formatRankingMessage } from './services/ranking.service';
import { getUserProfile, formatProfileMessage } from './services/user.service';
import { startQuiz, processQuizAnswer } from './services/quiz.service';

export interface BotResponse {
  content: string;
  type: 'text' | 'image' | 'video' | 'interactive';
  mediaUrl?: string;
  options?: any;
}

// Handlers
async function handleNews(): Promise<BotResponse> {
  const news = await getCuratedNews(3);
  return {
    content: formatNewsMessage(news),
    type: 'text'
  };
}

async function handleQuiz(userId: string): Promise<BotResponse> {
  return startQuiz(userId);
}

async function handleRanking(): Promise<BotResponse> {
  const users = await getTopUsers(10);
  return {
    content: formatRankingMessage(users),
    type: 'text'
  };
}

async function handleProfile(userId: string): Promise<BotResponse> {
  const user = await getUserProfile(userId);
  return {
    content: formatProfileMessage(user),
    type: 'text'
  };
}

async function handleSubscribe(): Promise<BotResponse> {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  const settingsUrl = appUrl ? `${appUrl}/dashboard/settings` : '';

  return {
    content:
      `*Fiel Premium*\n\n` +
      `Para assinar e liberar recursos premium:\n` +
      (settingsUrl ? `Acesse: ${settingsUrl}\n\n` : '') +
      `Digite */menu* para ver as opções.`,
    type: 'text',
  };
}

async function handleGame(userId: string): Promise<BotResponse> {
  return {
    content: "🎮 *Game Fiel*\n\nFuncionalidade de Jogo em breve! Jogue e ganhe pontos.",
    type: 'text'
  };
}

async function handleMeme(userId: string, message: string): Promise<BotResponse> {
  const { generateMeme } = await import('@/lib/bot/services/meme.service');
  return generateMeme(userId, message);
}

async function handleChat(userId: string, message: string): Promise<BotResponse> {
  try {
    // Dynamic import to avoid loading OpenRouter SDK on cold paths.
    const { generateCorinthiansResponse } = await import('@/lib/openrouter');
    const response = await generateCorinthiansResponse(message);
    const content = response.content?.trim();

    if (content) {
      return { content, type: 'text' };
    }
  } catch (error) {
    console.error('Bot chat error:', error);
  }

  return {
    content:
      `Estou com a IA temporariamente indisponível (limite/instabilidade).\n\n` +
      `Posso te ajudar com:\n` +
      `1) Notícias\n` +
      `2) Quiz\n` +
      `3) Meme\n` +
      `4) Ranking\n\n` +
      `Digite */menu* para ver as opções.`,
    type: 'text',
  };
}

export async function routeMessage(userId: string, message: string): Promise<BotResponse> {
  const lowerMsg = message.trim().toLowerCase();

  // 1. Check User State (Active Actions like Quiz)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentAction: true }
  });

  if (user?.currentAction?.startsWith('quiz:')) {
    // If it's a command to exit the quiz
    if (lowerMsg === 'sair' || lowerMsg === 'parar' || lowerMsg === 'cancelar') {
      await prisma.user.update({
        where: { id: userId },
        data: { currentAction: null }
      });
      return { content: "🚫 *Quiz cancelado.* O que deseja fazer agora? Digite /menu.", type: 'text' };
    }
    
    return processQuizAnswer(userId, user.currentAction, message.trim());
  }

  // Quick greetings (avoid unnecessary LLM calls)
  if (
    lowerMsg === 'oi' ||
    lowerMsg === 'olá' ||
    lowerMsg === 'ola' ||
    lowerMsg === 'bom dia' ||
    lowerMsg === 'boa tarde' ||
    lowerMsg === 'boa noite'
  ) {
    return {
      content: `Fala, Fiel! ⚽\n\nDigite */menu* para ver as opções e começar.`,
      type: 'text',
    };
  }

  // 2. Keyword Matching (Menu Options)
  if (
    lowerMsg === 'news' ||
    lowerMsg.includes('notícias') ||
    lowerMsg.includes('noticias') ||
    lowerMsg === '1'
  ) {
    return handleNews();
  }

  if (lowerMsg === 'quiz' || lowerMsg.includes('quiz') || lowerMsg === '2') {
    return handleQuiz(userId);
  }

  if (
    lowerMsg === 'subscribe' ||
    lowerMsg.includes('assinar') ||
    lowerMsg.includes('premium')
  ) {
    return handleSubscribe();
  }

  if (lowerMsg.includes('meme') || lowerMsg.includes('imagem') || lowerMsg.includes('figura')) {
    return handleMeme(userId, message);
  }

  if (lowerMsg.includes('ranking') || lowerMsg === '4') {
    return handleRanking();
  }

  if (lowerMsg.includes('perfil') || lowerMsg === '5') {
      return handleProfile(userId);
  }

  if (lowerMsg.includes('jogo') || lowerMsg.includes('game') || lowerMsg === '3') {
    return handleGame(userId);
  }

  if (lowerMsg === 'chat') {
    return handleChat(userId, message);
  }

  // 3. Fallback to LLM
  return handleChat(userId, message);
}
