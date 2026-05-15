import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { evolutionAPI } from '@/lib/evolution-api';
import { routeMessage, type BotResponse } from '@/lib/bot/router';
import { WELCOME_MESSAGE } from '@/lib/bot/templates';
import { startScheduler } from '@/lib/scheduler';

export const runtime = 'nodejs';

type WhatsAppPayload = Record<string, any>;

const DEFAULT_FIELIA_GROUP_ID = '120363422991914861@g.us';
const MESSAGE_DEDUPE_TTL_MS = 10 * 60 * 1000;
const MAX_DEDUPE_KEYS = 500;

const globalForWebhook = globalThis as unknown as {
  fieliaWebhookMessageKeys?: Map<string, number>;
};

const processedMessageKeys =
  globalForWebhook.fieliaWebhookMessageKeys ?? new Map<string, number>();
globalForWebhook.fieliaWebhookMessageKeys = processedMessageKeys;

function getAllowedGroupIds() {
  return String(
    process.env.FIELIA_WHATSAPP_GROUP_ID ||
    process.env.WHATSAPP_ALLOWED_GROUP_IDS ||
    DEFAULT_FIELIA_GROUP_ID
  )
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getBotScope() {
  return String(process.env.WHATSAPP_BOT_SCOPE || 'group').toLowerCase();
}

function getAppUrl() {
  return String(
    process.env.NEXT_PUBLIC_APP_URL ||
      process.env.FRONTEND_URL ||
      'https://fielchat.com'
  ).replace(/\/$/, '');
}

function normalizeTriggerText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isAllowedGroup(fromJid: string) {
  const allowedGroups = getAllowedGroupIds();
  return allowedGroups.length > 0 && allowedGroups.includes(fromJid);
}

function getParticipantNumber(message: WhatsAppPayload, fallback: string) {
  const participant =
    message?.key?.participant ||
    message?.participant ||
    message?.sender ||
    fallback;

  return String(participant).includes('@')
    ? String(participant).split('@')[0]
    : String(participant);
}

function getOwnWhatsAppIdentifiers() {
  return String(
    [
      process.env.FIELIA_WHATSAPP_SENDER_JID,
      process.env.FIELIA_WHATSAPP_OWN_PARTICIPANT_IDS,
      process.env.EVOLUTION_OWNER_JID,
    ]
      .filter(Boolean)
      .join(',')
  )
    .split(',')
    .flatMap((item) => {
      const normalized = String(item).trim().toLowerCase();
      if (!normalized) return [];
      const digits = normalized.replace(/\D/g, '');
      return digits ? [normalized, digits] : [normalized];
    })
    .filter(Boolean);
}

function isOwnParticipant(message: WhatsAppPayload) {
  const ownIdentifiers = getOwnWhatsAppIdentifiers();
  if (ownIdentifiers.length === 0) return false;

  const candidates = [
    message?.key?.participant,
    message?.participant,
    message?.sender,
    message?.participantPn,
    message?.key?.participantPn,
  ].flatMap((value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return [];
    const digits = normalized.replace(/\D/g, '');
    return digits ? [normalized, digits] : [normalized];
  });

  return candidates.some((candidate) => ownIdentifiers.includes(candidate));
}

function getMessageText(message: WhatsAppPayload) {
  return (
    message?.message?.conversation ||
    message?.message?.extendedTextMessage?.text ||
    message?.message?.imageMessage?.caption ||
    message?.message?.videoMessage?.caption ||
    ''
  );
}

function getMessageDedupeKey(body: WhatsAppPayload, message: WhatsAppPayload) {
  const id = message?.key?.id;
  const remoteJid = message?.key?.remoteJid;
  if (!id || !remoteJid) return null;

  const participant =
    message?.key?.participant ||
    message?.participant ||
    message?.sender ||
    'direct';

  return [body?.instance || 'unknown', remoteJid, participant, id].join(':');
}

function isDuplicateMessage(dedupeKey: string | null) {
  if (!dedupeKey) return false;

  const now = Date.now();
  for (const [key, expiresAt] of processedMessageKeys) {
    if (expiresAt <= now || processedMessageKeys.size > MAX_DEDUPE_KEYS) {
      processedMessageKeys.delete(key);
    }
  }

  const existing = processedMessageKeys.get(dedupeKey);
  if (existing && existing > now) return true;

  processedMessageKeys.set(dedupeKey, now + MESSAGE_DEDUPE_TTL_MS);
  return false;
}

function isDirectGroupCommand(normalized: string) {
  const commands = ['menu', 'ajuda', 'noticia', 'noticias', 'news', 'quiz', 'ranking', 'premium', 'assinar'];
  return commands.some((command) => normalized === command || normalized.startsWith(`${command} `));
}

function shouldAnswerGroupMessage(messageText: string) {
  const mode = String(process.env.WHATSAPP_GROUP_REPLY_MODE || 'mention').toLowerCase();
  if (mode === 'always') return true;

  const normalized = normalizeTriggerText(messageText);
  if (isDirectGroupCommand(normalized)) return true;

  const triggerAliases = [
    'fielia',
    'fiel ia',
    'fiel.ia',
    'fanatico',
    ...String(process.env.WHATSAPP_GROUP_TRIGGER_ALIASES || '')
      .split(',')
      .map((item) => normalizeTriggerText(item))
      .filter(Boolean),
  ];

  const calledByAlias = triggerAliases.some((alias) => {
    const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return (
      normalized === alias ||
      new RegExp(`^${escapedAlias}([\\s:,.!?-]|$)`).test(normalized) ||
      normalized.includes(`@${alias}`)
    );
  });

  if (calledByAlias) return true;

  const mentionsAlias = triggerAliases.some((alias) => normalized.includes(alias));
  const hasGroupAction = ['noticia', 'news', 'quiz', 'ranking', 'premium', 'assinar', 'menu', 'ajuda'].some(
    (keyword) => normalized.includes(keyword)
  );
  if (mentionsAlias && hasGroupAction) return true;

  return (
    normalized.startsWith('/menu') ||
    normalized.startsWith('/ia') ||
    normalized.includes('@fiel') ||
    normalized.includes('@fanatico')
  );
}

function stripGroupTrigger(messageText: string) {
  return messageText
    .trim()
    .replace(/^\/ia\s*/i, '')
    .replace(/^fiel\.?ia[:,\s-]*/i, '')
    .replace(/^fiel ia[:,\s-]*/i, '')
    .replace(/^fan[aá]tico[:,\s-]*/i, '')
    .trim();
}

function groupHelpResponse(): BotResponse {
  return {
    content:
      'No grupo eu respondo pedido direto, sem menu individual.\n\n' +
      'Pode chamar assim:\n' +
      '*fanatico noticias*\n' +
      '*fanatico quiz*\n' +
      '*fanatico ranking*\n' +
      '*fanatico premium*\n\n' +
      'Perfil e conta ficam no app: ' + `${getAppUrl()}/dashboard/account`,
    type: 'text',
  };
}

function groupQuizResponse(): BotResponse {
  return {
    content:
      'Quiz da Fiel:\n' +
      `${getAppUrl()}/quiz-free\n\n` +
      'Responde pelo app para salvar seus pontos no ranking.',
    type: 'text',
  };
}

function groupSubscribeResponse(): BotResponse {
  return {
    content:
      'Premium e pago desde o inicio, sem free trial e sem sorteio.\n\n' +
      'Para assinar: ' + `${getAppUrl()}/assinar`,
    type: 'text',
  };
}

function groupProfileResponse(): BotResponse {
  return {
    content:
      'Perfil e dado individual, entao nao exponho isso no grupo.\n\n' +
      'Acesse sua conta aqui: ' + `${getAppUrl()}/dashboard/account`,
    type: 'text',
  };
}

async function groupRankingResponse(): Promise<BotResponse> {
  const { getFreeQuizRanking, formatFreeQuizRankingMessage } = await import('@/lib/bot/services/ranking.service');
  const ranking = await getFreeQuizRanking(10);

  return {
    content: formatFreeQuizRankingMessage(ranking),
    type: 'text',
  };
}

function getWebhookDebugPayload(body: WhatsAppPayload) {
  const data = body?.data;
  const message = data?.key ? data : data?.message || data;
  const key = message?.key;

  return {
    event: body?.event,
    instance: body?.instance,
    destination: body?.destination,
    data: {
      key: {
        remoteJid: key?.remoteJid,
        participant: key?.participant,
        fromMe: key?.fromMe,
        id: key?.id,
      },
      pushName: message?.pushName,
      messageType: message?.messageType,
      text: getMessageText(message) || null,
    },
  };
}

async function trySend(fn: () => Promise<unknown>, context: string): Promise<boolean> {
  if (process.env.WHATSAPP_WEBHOOK_DRY_RUN === 'true') {
    console.info(`[Webhook] Dry run send skipped (${context})`);
    return true;
  }

  try {
    await fn();
    return true;
  } catch (error) {
    console.error(`[Webhook] Evolution send failed (${context}):`, error instanceof Error ? error.message : error);
    return false;
  }
}

async function routeGroupMessage(userId: string, messageText: string): Promise<BotResponse> {
  const stripped = stripGroupTrigger(messageText);
  const normalized = normalizeTriggerText(stripped);

  if (!normalized || normalized === '/menu' || normalized === 'menu' || normalized === 'ajuda') {
    return groupHelpResponse();
  }

  if (
    normalized.includes('noticia') ||
    normalized.includes('news')
  ) {
    return routeMessage(userId, 'noticias', 'whatsapp_group');
  }

  if (normalized === 'quiz' || normalized.startsWith('quiz ') || normalized.includes(' quiz')) {
    return groupQuizResponse();
  }

  if (normalized === 'ranking' || normalized.startsWith('ranking ') || normalized.includes('ranking')) {
    return groupRankingResponse();
  }

  if (
    normalized === 'premium' ||
    normalized === 'assinar' ||
    normalized.includes('premium') ||
    normalized.includes('assinar')
  ) {
    return groupSubscribeResponse();
  }

  if (normalized === 'perfil' || normalized.includes('meu perfil') || normalized.includes('minha conta')) {
    return groupProfileResponse();
  }

  try {
    const { generateCorinthiansResponse } = await import('@/lib/openrouter');
    const response = await generateCorinthiansResponse(stripped || messageText, {
      skipRAG: false,
    });

    return {
      content: response.content?.trim() || 'Nao consegui montar uma resposta agora. Tenta de novo em instantes.',
      type: 'text',
    };
  } catch (error) {
    console.error('[Webhook] Group AI fallback:', error instanceof Error ? error.message : error);
    return {
      content:
        'Estou com a IA instavel agora. Me pede direto: *fanatico noticias*, *fanatico quiz* ou *fanatico ranking*.',
      type: 'text',
    };
  }
}

async function sendBotResponse(toJidOrNumber: string, botResponse: BotResponse) {
  if (botResponse.type === 'image' && botResponse.mediaUrl) {
    await trySend(
      () => evolutionAPI.sendTextMessage({ number: toJidOrNumber, text: botResponse.content }),
      'meme_caption'
    );

    const imageFilename = botResponse.imageFilename;
    if (imageFilename) {
      try {
        const fsP = await import('fs').then((m) => m.promises);
        const pathMod = await import('path');
        const { convertToStickerBase64 } = await import('@/lib/sticker');
        const filepath = pathMod.join(process.cwd(), 'public', 'memes', imageFilename);
        const imageBuffer = await fsP.readFile(filepath);
        const stickerBase64 = await convertToStickerBase64(imageBuffer);
        await trySend(
          () => evolutionAPI.sendSticker({ number: toJidOrNumber, sticker: stickerBase64 }),
          'sticker_response'
        );
      } catch (stickerErr) {
        console.error('[Webhook] Sticker conversion failed, sending as media:', stickerErr instanceof Error ? stickerErr.message : stickerErr);
        await trySend(
          () => evolutionAPI.sendMediaMessage({ number: toJidOrNumber, mediaUrl: botResponse.mediaUrl! }),
          'image_fallback'
        );
      }
    } else {
      await trySend(
        () => evolutionAPI.sendMediaMessage({ number: toJidOrNumber, mediaUrl: botResponse.mediaUrl! }),
        'image_response'
      );
    }

    return;
  }

  await trySend(
    () => evolutionAPI.sendTextMessage({ number: toJidOrNumber, text: botResponse.content }),
    'text_response'
  );
}

export async function POST(req: NextRequest) {
  try {
    startScheduler();
    const body = await req.json();
    const { data, event } = body;

    if (!data || !event) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    const normalizedEvent = String(event).toLowerCase();
    if (normalizedEvent !== 'messages.upsert' && normalizedEvent !== 'messages_upsert') {
      return NextResponse.json({ status: 'ignored' });
    }

    if (process.env.WHATSAPP_WEBHOOK_DEBUG === 'true') {
      console.log('WEBHOOK_DEBUG', JSON.stringify(getWebhookDebugPayload(body), null, 2));
    }

    const message = data?.key ? data : data?.message || data;
    const key = message?.key;
    const fromJid = String(key?.remoteJid || '');

    if (!fromJid) {
      console.error('Invalid message structure - Missing remoteJid. Message:', JSON.stringify(message, null, 2));
      return NextResponse.json({ status: 'ignored', reason: 'invalid_structure_no_from' });
    }

    if (Boolean(key?.fromMe) || isOwnParticipant(message)) {
      return NextResponse.json({ status: 'ignored', reason: Boolean(key?.fromMe) ? 'from_me' : 'own_participant' });
    }

    const isGroup = fromJid.endsWith('@g.us');
    const botScope = getBotScope();

    if (isGroup && !isAllowedGroup(fromJid)) {
      return NextResponse.json({ status: 'ignored', reason: 'group_not_allowed' });
    }

    if (!isGroup && botScope === 'group') {
      return NextResponse.json({ status: 'ignored', reason: 'direct_disabled' });
    }

    if (isGroup && botScope === 'direct') {
      return NextResponse.json({ status: 'ignored', reason: 'group_disabled' });
    }

    const fromNumber = fromJid.includes('@') ? fromJid.split('@')[0] : fromJid;
    const participantNumber = isGroup ? getParticipantNumber(message, fromNumber) : fromNumber;
    const sendTarget = isGroup ? fromJid : fromNumber;
    const messageText = getMessageText(message);

    if (!messageText) {
      return NextResponse.json({ status: 'ignored', reason: 'empty_text' });
    }

    if (isGroup && !shouldAnswerGroupMessage(messageText)) {
      return NextResponse.json({ status: 'ignored', reason: 'group_not_triggered' });
    }

    const dedupeKey = getMessageDedupeKey(body, message);
    if (isDuplicateMessage(dedupeKey)) {
      return NextResponse.json({ status: 'ignored', reason: 'duplicate_message' });
    }

    const userWhatsappId = isGroup ? `${fromJid}:${participantNumber}` : fromJid;
    let user = await prisma.user.findUnique({
      where: { whatsappId: userWhatsappId },
    });

    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      const groupSuffix = isGroup ? `.${fromJid.replace(/\D/g, '').slice(-8)}` : '';
      user = await prisma.user.create({
        data: {
          whatsappId: userWhatsappId,
          name: message.pushName || 'Fiel Torcedor',
          email: `${participantNumber}${groupSuffix}@whatsapp.temp`,
          password: 'whatsapp-user',
        },
      });
    }

    const normalizedText = messageText.trim().toLowerCase();
    if (!isGroup && (isNewUser || normalizedText === '/menu' || normalizedText === 'menu')) {
      if (isNewUser) {
        await trySend(
          () => evolutionAPI.sendTextMessage({ number: sendTarget, text: WELCOME_MESSAGE, delay: 1000 }),
          'welcome'
        );
      }

      const menuResponse = await routeMessage(user.id, '/menu');
      await sendBotResponse(sendTarget, menuResponse);
      return NextResponse.json({ status: 'processed_menu' });
    }

    const { checkUserLimit } = await import('@/lib/bot/limits');
    const limitResult = await checkUserLimit(userWhatsappId);
    if (!limitResult.allowed) {
      await trySend(
        () => evolutionAPI.sendTextMessage({ number: sendTarget, text: limitResult.message || 'Limite diario atingido.' }),
        'rate_limit'
      );
      return NextResponse.json({ status: 'blocked', reason: 'daily_limit' });
    }

    const botResponse = isGroup
      ? await routeGroupMessage(user.id, messageText)
      : await routeMessage(user.id, messageText);

    try {
      let chat = await prisma.aIChat.findFirst({
        where: {
          userId: user.id,
          platform: isGroup ? 'whatsapp_group' : 'whatsapp',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!chat) {
        chat = await prisma.aIChat.create({
          data: {
            userId: user.id,
            platform: isGroup ? 'whatsapp_group' : 'whatsapp',
            sessionId: `${isGroup ? 'whatsapp-group' : 'whatsapp'}-${userWhatsappId}-${Date.now()}`,
          },
        });
      }

      await prisma.aIMessage.createMany({
        data: [
          {
            chatId: chat.id,
            role: 'user',
            content: messageText,
          },
          {
            chatId: chat.id,
            role: 'assistant',
            content: botResponse.content,
            tokensUsed: 0,
            model: isGroup ? 'fiel-ia-group-router' : 'fiel-ia-router',
          },
        ],
      });
    } catch (historyError) {
      console.error('[Webhook] Failed to save chat history:', historyError instanceof Error ? historyError.message : historyError);
    }

    await sendBotResponse(sendTarget, botResponse);

    prisma.user.update({
      where: { id: user.id },
      data: { lastActive: new Date() },
    }).catch((err) => console.error('[Webhook] Failed to update lastActive:', err instanceof Error ? err.message : err));

    return NextResponse.json({ status: isGroup ? 'processed_group' : 'processed' });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    console.error('WhatsApp Webhook Error:', errMsg, errStack || '');
    return NextResponse.json(
      { error: 'Failed to process webhook', detail: errMsg },
      { status: 500 }
    );
  }
}
