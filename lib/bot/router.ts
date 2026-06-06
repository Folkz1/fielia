import { prisma } from '@/lib/prisma';
import { getCuratedNews, formatNewsMessage } from './services/news.service';
import { getTopUsers, formatRankingMessage } from './services/ranking.service';
import { getUserProfile, formatProfileMessage } from './services/user.service';
import { startQuiz, processQuizAnswer } from './services/quiz.service';
import { getChatHistory } from './services/chat-history.service';
import { isPremiumUser } from '@/lib/premium';
import { detectLiveIntent } from '@/lib/chat/live-data';

async function getAffiliateCTA(source: string): Promise<string> {
  try {
    const where: Record<string, boolean> = { isActive: true };
    if (source === 'chat') where.showInChat = true;
    else where.showInNews = true;

    const aff = await prisma.affiliate.findFirst({
      where,
      select: { slug: true, ctaText: true, ctaDescription: true, disclaimer: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!aff) return '';
    const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
    const url = `${base}/go/${aff.slug}?src=${source}`;
    let text = `\n\n---\n${aff.ctaDescription || aff.ctaText}: ${url}`;
    if (aff.disclaimer) text += `\n_${aff.disclaimer}_`;
    return text;
  } catch {
    return '';
  }
}

export interface BotResponse {
  content: string;
  type: 'text' | 'image' | 'video' | 'interactive';
  mediaUrl?: string;
  options?: unknown;
  /** Raw image filename for sticker conversion (memes) */
  imageFilename?: string;
}

// Handlers
async function handleNews(): Promise<BotResponse> {
  const news = await getCuratedNews(3);
  const cta = await getAffiliateCTA('news');
  return {
    content: formatNewsMessage(news) + cta,
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
      `Para assinar com *cartao de credito* e liberar recursos premium:\n` +
      (settingsUrl ? `Acesse: ${settingsUrl}\n\n` : '') +
      `Digite */menu* para ver as opções.`,
    type: 'text',
  };
}

async function handleGame(): Promise<BotResponse> {
  return {
    content: "🎮 *Game Fiel*\n\nEstamos desenvolvendo um jogo exclusivo para torcedores do Timão! Em breve você vai poder jogar e acumular pontos na plataforma.\n\nDigite */menu* para ver o que já está disponível.",
    type: 'text'
  };
}

async function handleMenu(): Promise<BotResponse> {
  return {
    content:
      `⚫⚪ *MENU FIEL IA* ⚫⚪\n\n` +
      `Escolha uma opção:\n\n` +
      `*1* - 📰 Últimas Notícias\n` +
      `*2* - ❓ Quiz do Timão\n` +
      `*3* - 🎮 Game Fiel\n` +
      `*4* - 👑 Ranking\n` +
      `*5* - 👤 Meu Perfil\n\n` +
      `Ou digite sua pergunta sobre o Corinthians! 🦅`,
    type: 'text'
  };
}

async function handleMeme(userId: string, message: string): Promise<BotResponse> {
  const { generateMeme } = await import('@/lib/bot/services/meme.service');
  return generateMeme(userId, message);
}

async function handleChat(userId: string, message: string, platform: string = 'whatsapp'): Promise<BotResponse> {
  try {
    // Buscar historico de conversa para manter contexto
    const history = await getChatHistory(userId, platform);

    // Dynamic import to avoid loading OpenRouter SDK on cold paths.
    const { generateCorinthiansResponse } = await import('@/lib/openrouter');
    const response = await generateCorinthiansResponse(message, {
      history,
    });
    const content = response.content?.trim();

    if (content) {
      const cta = await getAffiliateCTA('chat');
      return { content: content + cta, type: 'text' };
    }
  } catch (error) {
    console.error('Bot chat error:', error);
  }

  return {
    content:
      `Estou com a IA temporariamente indisponivel (limite/instabilidade).\n\n` +
      `Posso te ajudar com:\n` +
      `1) Noticias\n` +
      `2) Quiz\n` +
      `3) Meme\n` +
      `4) Ranking\n\n` +
      `Digite */menu* para ver as opcoes.`,
    type: 'text',
  };
}

function premiumRequiredMessage(feature: string): BotResponse {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  return {
    content:
      `🔒 *${feature}* é um recurso exclusivo para assinantes *Fiel Premium*.\n\n` +
      `Com o Premium você tem:\n` +
      `• Chat ilimitado com a IA\n` +
      `• Geração de memes e imagens\n` +
      `• Quiz semanal e ranking completo\n` +
      `• Newsletter exclusiva\n\n` +
      (appUrl ? `Assine agora: ${appUrl}/dashboard/settings\n\n` : '') +
      `Digite */menu* para ver as opções gratuitas.`,
    type: 'text',
  };
}

export async function routeMessage(userId: string, message: string, platform: string = 'whatsapp'): Promise<BotResponse> {
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

  // 2. Menu Command
  if (lowerMsg === '/menu' || lowerMsg === 'menu') {
    return handleMenu();
  }

  // 3. Keyword Matching (Menu Options)
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
    const isPremium = await isPremiumUser(userId);
    if (!isPremium) return premiumRequiredMessage('Geração de Imagens');
    return handleMeme(userId, message);
  }

  if (lowerMsg.includes('ranking') || lowerMsg === '4') {
    return handleRanking();
  }

  if (lowerMsg.includes('perfil') || lowerMsg === '5') {
      return handleProfile(userId);
  }

  // Pergunta sobre jogos do time (próximo jogo, último resultado, placar, classificação)
  // vai pro chat com IA (dados ao vivo via web search), não pro Game Fiel da plataforma.
  // "game", "3" e "jogo" genérico continuam indo pro Game Fiel.
  const liveIntent = detectLiveIntent(message);
  if (
    !(liveIntent === 'jogos' || liveIntent === 'jogos_dia' || liveIntent === 'odds') &&
    (lowerMsg.includes('jogo') || lowerMsg.includes('game') || lowerMsg === '3')
  ) {
    return handleGame();
  }

  if (lowerMsg === 'chat') {
    return handleChat(userId, message, platform);
  }

  // 3. Fallback to LLM (premium only)
  const isPremium = await isPremiumUser(userId);
  if (!isPremium) {
    return {
      content:
        `🔒 *Chat com IA* é exclusivo para assinantes *Fiel Premium*.\n\n` +
        `Mas você pode usar gratuitamente:\n` +
        `*1* - 📰 Notícias\n` +
        `*2* - ❓ Quiz do Timão\n` +
        `*4* - 👑 Ranking\n` +
        `*5* - 👤 Meu Perfil\n\n` +
        `Assine Premium para conversar com a IA! Digite *assinar* para saber mais.`,
      type: 'text',
    };
  }
  return handleChat(userId, message, platform);
}
