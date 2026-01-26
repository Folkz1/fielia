import { OpenRouter } from '@openrouter/sdk';

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

function parseEnvList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    result.push(item);
  }
  return result;
}

function getStatusCode(error: unknown): number | undefined {
  const statusCode = (error as { statusCode?: unknown } | null)?.statusCode;
  return typeof statusCode === 'number' ? statusCode : undefined;
}

function isRetriableStatus(statusCode: number): boolean {
  return statusCode === 429 || (statusCode >= 500 && statusCode <= 599);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
) {
  const temperature = options.temperature ?? 0.7;
  const maxTokens = options.maxTokens ?? 2000;

  const envPrimaryModel = process.env.OPENROUTER_MODEL?.trim();
  const primaryModel =
    options.model?.trim() || envPrimaryModel || 'google/gemini-2.0-flash-exp:free';
  const fallbackModels = parseEnvList(process.env.OPENROUTER_FALLBACK_MODELS);

  const modelsToTry = uniqueStrings([primaryModel, ...fallbackModels]);
  const maxAttemptsPerModel = Math.max(
    1,
    Number.parseInt(process.env.OPENROUTER_MAX_ATTEMPTS_PER_MODEL || '1', 10) || 1
  );
  const retryDelayMs = Math.max(
    0,
    Number.parseInt(process.env.OPENROUTER_RETRY_DELAY_MS || '1500', 10) || 0
  );

  let lastError: unknown;

  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt++) {
      try {
        const response = await client.chat.send({
          model,
          messages: messages as any,
          temperature,
          maxTokens: maxTokens,
        });

        // Handle OpenRouter's flexible content format (string or array of parts)
        const choice = response.choices[0];
        let content = '';

        if (choice?.message?.content) {
          if (typeof choice.message.content === 'string') {
            content = choice.message.content;
          } else if (Array.isArray(choice.message.content)) {
            content = choice.message.content
              .filter((c: any) => c.type === 'output_text')
              .map((c: any) => c.text)
              .join('');
          }
        }

        return {
          content,
          tokensUsed: response.usage?.totalTokens || 0,
          model: response.model,
        };
      } catch (error) {
        lastError = error;
        const statusCode = getStatusCode(error);

        // Non-retriable error: stop trying other models to reduce noise.
        if (!statusCode || !isRetriableStatus(statusCode)) {
          break;
        }

        if (attempt < maxAttemptsPerModel && retryDelayMs > 0) {
          await sleep(retryDelayMs * attempt);
        }
      }
    }
  }

  console.error('OpenRouter API Error:', lastError);
  throw new Error('Failed to get AI response');
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
    temperature: 0.8,
  });
}
