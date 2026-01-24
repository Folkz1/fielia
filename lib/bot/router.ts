// import { generateCorinthiansResponse } from '@/lib/openrouter'; // Removed top-level import

export interface BotResponse {
  content: string;
  type: 'text' | 'image' | 'video' | 'interactive';
  options?: any;
}

// Handler Stubs
async function handleNews(userId: string): Promise<BotResponse> {
  return {
    content: "📰 *Notícias do Timão*\n\nFuncionalidade de Notícias em breve! Aqui você verá as últimas do Coringão.",
    type: 'text'
  };
}

async function handleQuiz(userId: string): Promise<BotResponse> {
  return {
    content: "❓ *Quiz do Timão*\n\nFuncionalidade de Quiz em breve! Teste seus conhecimentos sobre o Todo Poderoso.",
    type: 'text'
  };
}

async function handleGame(userId: string): Promise<BotResponse> {
  return {
    content: "🎮 *Game Fiel*\n\nFuncionalidade de Jogo em breve! Jogue e ganhe pontos.",
    type: 'text'
  };
}

async function handleRanking(userId: string): Promise<BotResponse> {
  return {
    content: "🏆 *Ranking Fiel*\n\nFuncionalidade de Ranking em breve! Veja quem são os maiores torcedores.",
    type: 'text'
  };
}

async function handleChat(userId: string, message: string): Promise<BotResponse> {
  // Dynamic import to avoid loading OpenRouter SDK text match
  const { generateCorinthiansResponse } = await import('@/lib/openrouter');
  const response = await generateCorinthiansResponse(message);
  return {
    content: response.content,
    type: 'text'
  };
}

export async function routeMessage(userId: string, message: string): Promise<BotResponse> {
  const lowerMsg = message.trim().toLowerCase();

  // Keyword Matching
  if (lowerMsg.includes('notícias') || lowerMsg.includes('noticias') || lowerMsg === '1') {
    return handleNews(userId);
  }

  if (lowerMsg.includes('quiz') || lowerMsg === '2') {
    return handleQuiz(userId);
  }

  if (lowerMsg.includes('jogo') || lowerMsg.includes('game') || lowerMsg === '3') {
    return handleGame(userId);
  }

  if (lowerMsg.includes('ranking') || lowerMsg === '4') {
    return handleRanking(userId);
  }

  // Fallback to LLM
  return handleChat(userId, message);
}
