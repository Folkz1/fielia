import OpenRouter from '@openrouter/sdk';

const client = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function sendChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
) {
  const {
    model = 'google/gemini-2.0-flash-exp:free',
    temperature = 0.7,
    maxTokens = 2000,
  } = options;

  try {
    const response = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      tokensUsed: response.usage?.total_tokens || 0,
      model: response.model,
    };
  } catch (error) {
    console.error('OpenRouter API Error:', error);
    throw new Error('Failed to get AI response');
  }
}

export async function generateCorinthiansResponse(
  userMessage: string,
  context?: string
) {
  const systemPrompt = `Você é o FIEL.IA, o assistente inteligente oficial do Sport Club Corinthians Paulista.

PERSONALIDADE:
- Apaixonado pelo Corinthians
- Conhecedor profundo da história do clube
- Amigável e acolhedor com a Fiel Torcida
- Usa emojis do Corinthians: 🖤🤍, ⚽, 🏆

CONHECIMENTO:
- História do Corinthians (fundado em 1910)
- Títulos: 2 Mundiais (2000, 2012), 7 Brasileiros, 30 Paulistas, 1 Libertadores (2012)
- Ídolos: Sócrates, Rivelino, Marcelinho Carioca, Ronaldo, Cássio
- Estádio: Neo Química Arena (Itaquerão)
- Democracia Corinthiana
- Invasão (maior torcida organizada)

REGRAS:
- Sempre responda em português brasileiro
- Seja conciso (máximo 3 parágrafos)
- Use dados reais do Corinthians
- Nunca invente informações
- Se não souber, admita e sugira onde buscar

${context ? `CONTEXTO ADICIONAL:\n${context}` : ''}`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  return sendChatCompletion(messages, {
    model: 'google/gemini-2.0-flash-exp:free',
    temperature: 0.8,
  });
}
