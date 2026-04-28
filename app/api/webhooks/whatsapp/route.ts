import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { evolutionAPI } from '@/lib/evolution-api';
import { routeMessage, type BotResponse } from '@/lib/bot/router';
import { WELCOME_MESSAGE } from '@/lib/bot/templates';
import { startScheduler } from '@/lib/scheduler';

export const runtime = 'nodejs';

type WhatsAppPayload = Record<string, any>;

const DEFAULT_FIELIA_GROUP_ID = '120363422991914861@g.us';

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

function getMessageText(message: WhatsAppPayload) {
  return (
    message?.message?.conversation ||
    message?.message?.extendedTextMessage?.text ||
    message?.message?.imageMessage?.caption ||
    message?.message?.videoMessage?.caption ||
    ''
  );
}

function shouldAnswerGroupMessage(messageText: string) {
  const mode = String(process.env.WHATSAPP_GROUP_REPLY_MODE || 'mention').toLowerCase();
  if (mode === 'always') return true;

  const normalized = messageText.trim().toLowerCase();
  if (['menu', 'quiz', 'ranking', '1', '2', '4'].includes(normalized)) return true;

  return (
    normalized.startsWith('/menu') ||
    normalized.startsWith('/ia') ||
    normalized.startsWith('fielia') ||
    normalized.startsWith('fiel ia') ||
    normalized.includes('@fiel') ||
    normalized.includes('fiel.ia')
  );
}

function stripGroupTrigger(messageText: string) {
  return messageText
    .trim()
    .replace(/^\/ia\s*/i, '')
    .replace(/^fiel\.?ia[:,\s-]*/i, '')
    .replace(/^fiel ia[:,\s-]*/i, '')
    .trim();
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
  const normalized = stripped.toLowerCase();

  if (
    normalized === '/menu' ||
    normalized === 'menu' ||
    normalized === 'quiz' ||
    normalized === 'ranking' ||
    normalized === '1' ||
    normalized === '2' ||
    normalized === '4'
  ) {
    return routeMessage(userId, stripped || '/menu', 'whatsapp_group');
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
        'Estou com a IA instavel agora, Fiel. Posso ajudar com *menu*, *quiz* ou *ranking* enquanto isso.',
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

    if (Boolean(key?.fromMe)) {
      return NextResponse.json({ status: 'ignored', reason: 'from_me' });
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
