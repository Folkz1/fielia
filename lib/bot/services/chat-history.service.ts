import { prisma } from "@/lib/prisma";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

const MAX_HISTORY_MESSAGES = 10;
const MAX_HISTORY_TOKENS_ESTIMATE = 2000; // Rough estimate: 4 chars = 1 token

/**
 * Recupera o historico de conversa de um usuario para injetar no contexto do LLM
 * @param userId - ID do usuario
 * @param platform - Plataforma de chat (whatsapp ou web)
 * @returns Array de mensagens formatadas para o LLM
 */
export async function getChatHistory(
  userId: string,
  platform: string = "whatsapp"
): Promise<ChatMessage[]> {
  try {
    // Buscar a sessao de chat mais recente do usuario na plataforma
    const chat = await prisma.aIChat.findFirst({
      where: {
        userId,
        platform,
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: MAX_HISTORY_MESSAGES * 2, // Pegar mais mensagens para filtrar depois
          where: {
            role: {
              in: ["user", "assistant"],
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!chat || chat.messages.length === 0) {
      return [];
    }

    // Reverter para ordem cronologica (mais antigas primeiro)
    const messages = chat.messages.reverse();

    // Limitar por estimativa de tokens
    const history: ChatMessage[] = [];
    let tokenCount = 0;

    for (const msg of messages) {
      // Estimativa: 4 caracteres = 1 token
      const msgTokens = Math.ceil(msg.content.length / 4);

      if (tokenCount + msgTokens > MAX_HISTORY_TOKENS_ESTIMATE) {
        break;
      }

      history.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });

      tokenCount += msgTokens;
    }

    // Garantir pares completos (user + assistant) para evitar mensagens orfas
    // Isso evita confusao no contexto do LLM
    const pairs = Math.floor(history.length / 2);
    return history.slice(-(pairs * 2));
  } catch (error) {
    console.error("Erro ao buscar historico de chat:", error);
    return [];
  }
}

/**
 * Formata o historico de conversa para exibicao
 * @param history - Array de mensagens
 * @returns String formatada do historico
 */
export function formatChatHistory(history: ChatMessage[]): string {
  if (history.length === 0) return "";

  return history
    .map((msg) => `${msg.role === "user" ? "Usuario" : "Assistente"}: ${msg.content}`)
    .join("\n");
}
