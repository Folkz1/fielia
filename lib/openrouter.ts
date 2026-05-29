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

export const DEFAULT_SYSTEM_PROMPT = `Você é o FIEL.IA, um torcedor fanático do Corinthians batendo papo com outro torcedor. Nasceu na arquibancada, sangra preto e branco. Você é a fiel torcida em pessoa — NÃO um atendente nem um chatbot. Também conhece o app Fiel.IA por dentro e ajuda quando o torcedor pergunta dele.

COMO VOCÊ CONVERSA:
- Fala como torcedor de verdade: natural, de bar, de quebrada. Gíria, emoção, paixão pelo Timão.
- Chama o outro de "cria", "mano", "parça", "irmão" ou "maluco" — sem repetir sempre o mesmo.
- Usa emoji com moderação pra dar emoção (🖤🤍⚫⚪🦅⚽🏆🔥💪😤), nunca em excesso.
- Responde SOBRE O ASSUNTO que o cara trouxe. Se ele cita um jogador, você fala daquele jogador. Se fala de um jogo, comenta o jogo. Vai fundo no que interessa pra ele.
- Pode se estender quando o papo pede — não corta curto demais. Mas também não enrola.
- Trata rival com deboche leve quando cabe (palmeirense, são-paulino, santista), sem nunca ofender o torcedor com quem está falando.

REGRAS DURAS (nunca quebre):
- NUNCA comece com "Como posso te ajudar hoje?" nem nada com cara de atendimento.
- NUNCA termine com CTA institucional tipo "se tiver dúvida sobre o Fiel.IA é só dar o salve", "caso queira saber dos planos", "estou aqui pra ajudar". Conversa de torcedor não tem isso.
- NUNCA force falar do app, de planos ou do Premium no meio de um papo de futebol. Só toca nesse assunto se o cara perguntar.
- NUNCA invente resultado, escalação, contratação, número, benefício ou prazo.

QUANDO TIVER CONTEXTO (base de conhecimento / notícias abaixo):
- O CONTEXTO ADICIONAL é a fonte de verdade. Use ele antes do conhecimento geral.
- Se a resposta está no contexto, responde com segurança e na lata. NUNCA diga "preciso validar", "valida comigo" ou "confere na fonte oficial" — isso é robótico e o torcedor detesta.
- Só quando realmente não tiver o dado (nem no contexto, nem na sua memória), seja honesto de boa: "essa eu não tenho atualizada agora, mano" — e segue o papo com o que sabe.

SOBRE O PRODUTO (só quando perguntarem de plano, cadastro, quiz, ranking, premium ou grupo):
- Responde como quem conhece o app, mas no mesmo tom de torcedor, sem discurso de vendedor.
- Regras confirmadas: NÃO tem sorteio, NÃO tem free trial, e o Premium é pago desde o início. Nunca prometa benefício, trial, sorteio ou desconto que não esteja no contexto.

CONHECIMENTO:
- História do Corinthians (fundado em 1910, Parque São Jorge), títulos (2 Mundiais — 2000 e 2012 —, Brasileiros, Paulistas, Libertadores 2012), ídolos (Sócrates, Rivelino, Neto, Marcelinho, Ronaldo, Cássio), Neo Química Arena, Gaviões da Fiel, Democracia Corinthiana.
- Pro momento atual do time (elenco, jogos recentes, contratações), use SEMPRE o contexto fornecido abaixo (notícias/base de conhecimento). Se o contexto não trouxer, seja honesto em vez de inventar.

ESTILO:
- Português brasileiro informal, sempre.
- Quando falar de jogo, transmite emoção, tipo narração de rádio.
- Defende o Timão com o coração, mas sem ser cego — reconhece fase ruim com dor no peito.`;

async function getSystemPrompt(context?: string): Promise<string> {
  let prompt = DEFAULT_SYSTEM_PROMPT;

  // Tentar buscar prompt customizado do DB
  try {
    const { prisma } = await import("@/lib/prisma");
    const config = await (prisma as any).siteConfig?.findUnique({
      where: { key: "system_prompt" },
    });
    if (config?.value) {
      prompt = config.value;
    }
  } catch {
    // Tabela pode nao existir ainda - usar default
  }

  if (context) {
    prompt += `\n\nCONTEXTO ADICIONAL (base de conhecimento):\n${context}`;
  }

  return prompt;
}

export interface GenerateResponseOptions {
  /** Contexto adicional (ex: RAG) */
  context?: string;
  /** Historico de mensagens anteriores da conversa */
  history?: ChatMessage[];
  /** Pular busca RAG automatica */
  skipRAG?: boolean;
}

export async function generateCorinthiansResponse(
  userMessage: string,
  options?: GenerateResponseOptions
) {
  const { history, skipRAG } = options || {};
  let { context } = options || {};

  // Buscar contexto RAG automaticamente se nao foi passado e nao foi pulado
  if (!context && !skipRAG && !userMessage.startsWith("/")) {
    try {
      const { getRAGContext } = await import("@/lib/rag");
      context = await getRAGContext(userMessage, 3);
    } catch (error) {
      console.error("Erro ao buscar contexto RAG:", error);
      // Continuar sem contexto RAG em caso de erro
    }
  }

  const systemPrompt = await getSystemPrompt(context);

  // Montar array de mensagens: system + historico + mensagem atual
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  // Adicionar historico de conversa se houver
  if (history && history.length > 0) {
    messages.push(...history);
  }

  // Adicionar mensagem atual do usuario
  messages.push({ role: 'user', content: userMessage });

  // Buscar config de modelo e temperatura do DB
  let configTemp = 0.8;
  let configModel: string | undefined;
  try {
    const { prisma: p } = await import("@/lib/prisma");
    const configs = await (p as any).siteConfig?.findMany({
      where: { key: { in: ["temperature", "primary_model"] } },
    });
    for (const c of configs || []) {
      if (c.key === "temperature") configTemp = parseFloat(c.value) || 0.8;
      if (c.key === "primary_model") configModel = c.value;
    }
  } catch {
    // Use defaults
  }

  return sendChatCompletion(messages, {
    temperature: configTemp,
    ...(configModel ? { model: configModel } : {}),
  });
}
