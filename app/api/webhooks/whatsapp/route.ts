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
const MESSAGE_FINGERPRINT_BUCKET_MS = 60 * 1000;
const MAX_DEDUPE_KEYS = 500;
const GROUP_JOIN_WELCOME_COOLDOWN_HOURS = 6;

const globalForWebhook = globalThis as unknown as {
  fieliaWebhookMessageKeys?: Map<string, number>;
  fieliaWebhookDedupeTablePromise?: Promise<void>;
  fieliaWebhookDedupeCleanupAt?: number;
};

const processedMessageKeys =
  globalForWebhook.fieliaWebhookMessageKeys ?? new Map<string, number>();
globalForWebhook.fieliaWebhookMessageKeys = processedMessageKeys;

async function ensureWebhookDedupeTable() {
  if (!globalForWebhook.fieliaWebhookDedupeTablePromise) {
    globalForWebhook.fieliaWebhookDedupeTablePromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "whatsapp_webhook_events" (
          "dedupe_key" TEXT PRIMARY KEY,
          "remote_jid" TEXT NOT NULL,
          "participant" TEXT,
          "message_id" TEXT,
          "event" TEXT,
          "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "whatsapp_webhook_events_created_at_idx"
        ON "whatsapp_webhook_events" ("created_at")
      `);
    })();
  }

  await globalForWebhook.fieliaWebhookDedupeTablePromise;
}

async function cleanupOldWebhookDedupeRows() {
  const now = Date.now();
  const lastCleanupAt = globalForWebhook.fieliaWebhookDedupeCleanupAt ?? 0;
  if (now - lastCleanupAt < 60 * 60 * 1000) return;

  globalForWebhook.fieliaWebhookDedupeCleanupAt = now;
  await prisma.$executeRawUnsafe(`
    DELETE FROM "whatsapp_webhook_events"
    WHERE "created_at" < NOW() - INTERVAL '2 days'
  `);
}

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

function isGroupScopeEnabled(scope: string) {
  return ['group', 'both', 'all'].includes(scope);
}

function isDirectScopeEnabled(scope: string) {
  return ['direct', 'both', 'all'].includes(scope);
}

function getDirectReplyMode() {
  return String(process.env.WHATSAPP_DIRECT_REPLY_MODE || 'premium').toLowerCase();
}

function isDirectPremiumOnly() {
  const mode = getDirectReplyMode();
  return mode !== 'all' && mode !== 'free';
}

function isAllowedWebhookInstance(body: WhatsAppPayload) {
  const incomingInstance = String(body?.instance || '').trim().toLowerCase();
  const expectedInstance = String(process.env.EVOLUTION_INSTANCE_NAME || '').trim().toLowerCase();

  if (!incomingInstance || !expectedInstance) return true;

  const allowedInstances = String(process.env.WHATSAPP_ALLOWED_WEBHOOK_INSTANCES || expectedInstance)
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return allowedInstances.includes(incomingInstance);
}

function isGroupParticipantsUpdateEvent(event: string) {
  const normalized = normalizeTriggerText(event).replace(/[._-]+/g, '_');
  return normalized === 'group_participants_update';
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

function getJidDigits(value: unknown) {
  return String(value || '')
    .split('@')[0]
    .replace(/\D/g, '');
}

function getBrazilianPhoneLookupVariants(value: unknown) {
  const digits = getJidDigits(value);
  const variants = new Set<string>();
  if (!digits) return [];

  variants.add(digits);

  const addLocalVariants = (local: string) => {
    if (!local) return;
    variants.add(local);
    variants.add(`55${local}`);

    if (local.length === 10) {
      const withNinthDigit = `${local.slice(0, 2)}9${local.slice(2)}`;
      variants.add(withNinthDigit);
      variants.add(`55${withNinthDigit}`);
    }
  };

  if (digits.startsWith('55')) {
    addLocalVariants(digits.slice(2));
  } else {
    addLocalVariants(digits);
  }

  return Array.from(variants).filter(Boolean);
}

function getParticipantPhoneCandidate(message: WhatsAppPayload, fallback: string) {
  const participantAlt =
    message?.key?.participantAlt ||
    message?.participantAlt ||
    message?.key?.participantPn ||
    message?.participantPn;

  return getJidDigits(participantAlt || fallback);
}

function getParticipantNumber(message: WhatsAppPayload, fallback: string) {
  const participant =
    getParticipantPhoneCandidate(message, '') ||
    message?.key?.participant ||
    message?.participant ||
    message?.sender ||
    fallback;

  return getJidDigits(participant);
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
    message?.key?.participantAlt,
    message?.participant,
    message?.participantAlt,
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

function isGroupJoinWelcomeEnabled() {
  return (process.env.WHATSAPP_GROUP_JOIN_WELCOME_ENABLED || 'false').toLowerCase() === 'true';
}

function getGroupJoinWelcomeCooldownHours() {
  const parsed = Number.parseInt(
    process.env.WHATSAPP_GROUP_JOIN_WELCOME_COOLDOWN_HOURS || '',
    10
  );
  return Number.isFinite(parsed) && parsed > 0 ? parsed : GROUP_JOIN_WELCOME_COOLDOWN_HOURS;
}

function getGroupJoinWelcomeMessage() {
  return (
    'Bem-vindo ao grupo free da FIEL IA.\n\n' +
    'Como funciona:\n' +
    `- Cadastro e quiz free: ${getAppUrl()}/cadastro-free\n` +
    `- Link direto do quiz: ${getAppUrl()}/quiz-free\n` +
    '- Ranking free mostra o Top 10 do quiz mensal.\n' +
    '- Premium e pago desde o inicio: quiz semanal, ranking completo e IA no privado.\n\n' +
    'Sem sorteio e sem free trial.\n\n' +
    'No grupo, chame o bot assim:\n' +
    '*fanatico noticias*\n' +
    '*fanatico quiz*\n' +
    '*fanatico ranking*\n' +
    '*fanatico premium*'
  );
}

function getGroupParticipantsUpdateData(body: WhatsAppPayload) {
  const data = body?.data || {};
  const nested = data?.participantsUpdate || data?.groupParticipantsUpdate || data?.update || {};
  const groupJid = String(
    data?.jid ||
      data?.id ||
      data?.groupJid ||
      data?.remoteJid ||
      nested?.jid ||
      nested?.id ||
      nested?.groupJid ||
      nested?.remoteJid ||
      ''
  );
  const action = normalizeTriggerText(String(data?.action || nested?.action || ''));
  const rawParticipants =
    data?.participants ||
    nested?.participants ||
    data?.participant ||
    nested?.participant ||
    data?.users ||
    nested?.users ||
    [];
  const participants = Array.isArray(rawParticipants)
    ? rawParticipants.map((item) => String(item)).filter(Boolean)
    : [String(rawParticipants)].filter(Boolean);

  return { groupJid, action, participants };
}

async function claimWebhookEventKey({
  key,
  remoteJid,
  participant,
  eventName,
}: {
  key: string;
  remoteJid: string;
  participant?: string | null;
  eventName: string;
}) {
  try {
    await ensureWebhookDedupeTable();
    await cleanupOldWebhookDedupeRows();

    const inserted = await prisma.$executeRaw`
      INSERT INTO "whatsapp_webhook_events" ("dedupe_key", "remote_jid", "participant", "message_id", "event")
      VALUES (${key}, ${remoteJid}, ${participant || null}, ${null}, ${eventName})
      ON CONFLICT ("dedupe_key") DO NOTHING
    `;

    return inserted > 0;
  } catch (error) {
    console.error('[Webhook] Event dedupe failed, blocking event for safety:', error instanceof Error ? error.message : error);
    return false;
  }
}

async function handleGroupParticipantsUpdateEvent(body: WhatsAppPayload) {
  if (!isGroupJoinWelcomeEnabled()) {
    return NextResponse.json({ status: 'ignored', reason: 'group_join_welcome_disabled' });
  }

  const { groupJid, action, participants } = getGroupParticipantsUpdateData(body);
  if (!groupJid.endsWith('@g.us')) {
    return NextResponse.json({ status: 'ignored', reason: 'invalid_group_participants_payload' });
  }

  if (!isAllowedGroup(groupJid)) {
    return NextResponse.json({ status: 'ignored', reason: 'group_not_allowed' });
  }

  if (action !== 'add') {
    return NextResponse.json({ status: 'ignored', reason: `group_participant_${action || 'unknown'}` });
  }

  const cooldownMs = getGroupJoinWelcomeCooldownHours() * 60 * 60 * 1000;
  const bucket = Math.floor(Date.now() / cooldownMs);
  const claimed = await claimWebhookEventKey({
    key: `group_join_welcome:${groupJid}:${bucket}`,
    remoteJid: groupJid,
    participant: participants.join(',').slice(0, 500),
    eventName: 'group_participants_update',
  });

  if (!claimed) {
    return NextResponse.json({ status: 'ignored', reason: 'group_join_welcome_rate_limited' });
  }

  const sent = await trySend(
    () => evolutionAPI.sendTextMessage({ number: groupJid, text: getGroupJoinWelcomeMessage(), delay: 1000 }),
    'group_join_welcome'
  );

  return NextResponse.json({
    status: sent ? 'processed_group_join_welcome' : 'failed_group_join_welcome',
    participants: participants.length,
    cooldownHours: getGroupJoinWelcomeCooldownHours(),
  });
}

function getMessageDedupeKey(message: WhatsAppPayload) {
  const id = message?.key?.id;
  const remoteJid = message?.key?.remoteJid;
  if (!id || !remoteJid) return null;

  const participant =
    message?.key?.participant ||
    message?.participant ||
    message?.sender ||
    'direct';

  return ['message', remoteJid, participant, id].join(':');
}

function getMessageFingerprintKey(message: WhatsAppPayload, messageText: string) {
  const remoteJid = message?.key?.remoteJid;
  if (!remoteJid || !messageText) return null;

  const participant =
    message?.key?.participant ||
    message?.participant ||
    message?.sender ||
    'direct';

  const normalizedText = normalizeTriggerText(messageText).replace(/\s+/g, ' ').slice(0, 240);
  if (!normalizedText) return null;

  const bucket = Math.floor(Date.now() / MESSAGE_FINGERPRINT_BUCKET_MS);
  return ['text', remoteJid, participant, normalizedText, bucket].join(':');
}

async function claimWebhookMessage({
  dedupeKey,
  fingerprintKey,
  body,
  message,
}: {
  dedupeKey: string | null;
  fingerprintKey: string | null;
  body: WhatsAppPayload;
  message: WhatsAppPayload;
}) {
  const keys = [dedupeKey, fingerprintKey].filter((key): key is string => Boolean(key));
  if (keys.length === 0) return true;

  try {
    await ensureWebhookDedupeTable();
    await cleanupOldWebhookDedupeRows();

    const remoteJid = String(message?.key?.remoteJid || '');
    const participant = String(
      message?.key?.participant ||
        message?.participant ||
        message?.sender ||
        'direct'
    );
    const messageId = message?.key?.id ? String(message.key.id) : null;
    const eventName = body?.event ? String(body.event) : null;

    for (const key of keys) {
      const inserted = await prisma.$executeRaw`
        INSERT INTO "whatsapp_webhook_events" ("dedupe_key", "remote_jid", "participant", "message_id", "event")
        VALUES (${key}, ${remoteJid}, ${participant}, ${messageId}, ${eventName})
        ON CONFLICT ("dedupe_key") DO NOTHING
      `;

      if (inserted === 0) return false;
    }

    return true;
  } catch (error) {
    console.error('[Webhook] Persistent dedupe failed, continuing with memory dedupe:', error instanceof Error ? error.message : error);
    return true;
  }
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

function directPremiumRequiredResponse(): BotResponse {
  return {
    content:
      'No privado eu sou exclusivo para assinantes Premium.\n\n' +
      `No plano free, participe pelo grupo: ${getAppUrl()}/grupo\n` +
      `Para assinar Premium: ${getAppUrl()}/assinar`,
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

    if (!isAllowedWebhookInstance(body)) {
      return NextResponse.json({ status: 'ignored', reason: 'instance_not_allowed' });
    }

    const normalizedEvent = String(event).toLowerCase();
    if (isGroupParticipantsUpdateEvent(normalizedEvent)) {
      return handleGroupParticipantsUpdateEvent(body);
    }

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

    if (!isGroup && !isDirectScopeEnabled(botScope)) {
      return NextResponse.json({ status: 'ignored', reason: 'direct_disabled' });
    }

    if (isGroup && !isGroupScopeEnabled(botScope)) {
      return NextResponse.json({ status: 'ignored', reason: 'group_disabled' });
    }

    const fromNumber = fromJid.includes('@') ? fromJid.split('@')[0] : fromJid;
    const participantNumber = isGroup ? getParticipantNumber(message, fromNumber) : fromNumber;
    const participantPhoneCandidates = isGroup
      ? getBrazilianPhoneLookupVariants(getParticipantPhoneCandidate(message, participantNumber))
      : getBrazilianPhoneLookupVariants(fromNumber);
    const sendTarget = isGroup ? fromJid : fromNumber;
    const messageText = getMessageText(message);

    if (!messageText) {
      return NextResponse.json({ status: 'ignored', reason: 'empty_text' });
    }

    if (isGroup && !shouldAnswerGroupMessage(messageText)) {
      return NextResponse.json({ status: 'ignored', reason: 'group_not_triggered' });
    }

    const dedupeKey = getMessageDedupeKey(message);
    if (isDuplicateMessage(dedupeKey)) {
      return NextResponse.json({ status: 'ignored', reason: 'duplicate_message' });
    }

    const fingerprintKey = getMessageFingerprintKey(message, messageText);
    const claimed = await claimWebhookMessage({
      dedupeKey,
      fingerprintKey,
      body,
      message,
    });
    if (!claimed) {
      return NextResponse.json({ status: 'ignored', reason: 'duplicate_message' });
    }

    const userWhatsappId = isGroup ? `${fromJid}:${participantNumber}` : fromJid;
    let user = participantPhoneCandidates.length > 0
      ? await prisma.user.findFirst({
          where: { phone: { in: participantPhoneCandidates } },
          orderBy: { updatedAt: 'desc' },
        })
      : null;

    if (!user) {
      user = await prisma.user.findUnique({
        where: { whatsappId: userWhatsappId },
      });
    }

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

    if (user && !user.whatsappId) {
      try {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { whatsappId: userWhatsappId },
        });
      } catch {
        // Another historical temporary WhatsApp user may already own this group id.
        // Keep the registered app user for routing and history; rate-limit can use the temp id.
      }
    }

    const { getPremiumAccess } = await import('@/lib/premium');
    const premiumAccess = await getPremiumAccess(user.id);

    if (!isGroup && isDirectPremiumOnly() && !premiumAccess.isPremium) {
      await sendBotResponse(sendTarget, directPremiumRequiredResponse());
      return NextResponse.json({ status: 'blocked', reason: 'direct_premium_required' });
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
    if (!premiumAccess.isPremium) {
      const limitResult = await checkUserLimit(user.whatsappId || userWhatsappId);
      if (!limitResult.allowed) {
        await trySend(
          () => evolutionAPI.sendTextMessage({ number: sendTarget, text: limitResult.message || 'Limite diario atingido.' }),
          'rate_limit'
        );
        return NextResponse.json({ status: 'blocked', reason: 'daily_limit' });
      }
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
