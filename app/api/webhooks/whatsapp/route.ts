import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { evolutionAPI } from '@/lib/evolution-api';
import { routeMessage } from '@/lib/bot/router';
import { WELCOME_MESSAGE } from '@/lib/bot/templates';
import { startScheduler } from '@/lib/scheduler';

export const runtime = 'nodejs';

function getWebhookDebugPayload(body: any) {
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
        fromMe: key?.fromMe,
        id: key?.id,
      },
      pushName: message?.pushName,
      messageType: message?.messageType,
      text:
        message?.message?.conversation ||
        message?.message?.extendedTextMessage?.text ||
        null,
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    startScheduler();
    const body = await req.json();
    
    // Evolution API webhook payload structure
    const { data, event } = body;

    if (!data || !event) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    // Handle different event types
    const normalizedEvent = String(event).toLowerCase();
    if (normalizedEvent === 'messages.upsert' || normalizedEvent === 'messages_upsert') {
      if (process.env.WHATSAPP_WEBHOOK_DEBUG === 'true') {
        console.log('WEBHOOK_DEBUG', JSON.stringify(getWebhookDebugPayload(body), null, 2));
      }

      // Evolution API variations handling
      let message;
      if (data?.key) {
        // v2 structure where data IS the message object containing key
        message = data;
      } else {
        // v1 structure or wrapper where message is nested
        message = data?.message || data;
      }
      
      const key = message?.key;
      const fromJid = key?.remoteJid;

      if (!fromJid) {
        console.error('Invalid message structure - Missing remoteJid. Message:', JSON.stringify(message, null, 2));
        return NextResponse.json({ status: 'ignored', reason: 'invalid_structure_no_from' });
      }

      // Ignore group messages for now
      if (String(fromJid).endsWith('@g.us')) {
        return NextResponse.json({ status: 'ignored', reason: 'group_message' });
      }

      const fromNumber = String(fromJid).includes('@') ? String(fromJid).split('@')[0] : String(fromJid);

      // Text message only (no interactive list)
      const messageText =
        message?.message?.conversation ||
        message?.message?.extendedTextMessage?.text ||
        '';

      if (!messageText) {
        return NextResponse.json({ status: 'ignored' });
      }

      // Find or create user by WhatsApp ID
      let user = await prisma.user.findUnique({
        where: { whatsappId: fromJid },
      });

      let isNewUser = false;

      if (!user) {
        // Create new user
        isNewUser = true;
        user = await prisma.user.create({
          data: {
            whatsappId: fromJid,
            name: message.pushName || 'Fiel Torcedor',
            email: `${fromNumber}@whatsapp.temp`,
            password: 'whatsapp-user',
          },
        });
      }

      // Handle New User or /menu command
      const normalizedText = messageText.trim().toLowerCase();
      if (isNewUser || normalizedText === '/menu' || normalizedText === 'menu') {
        if (isNewUser) {
            await evolutionAPI.sendTextMessage({
                number: fromNumber,
                text: WELCOME_MESSAGE,
                delay: 1000,
            });
        }
        
        const menuResponse = await routeMessage(user.id, '/menu');
        await evolutionAPI.sendTextMessage({
          number: fromNumber,
          text: menuResponse.content,
        });

        return NextResponse.json({ status: 'processed_menu' });
      }

      // Rate Limit Check
      const { checkUserLimit } = await import('@/lib/bot/limits');
      const limitResult = await checkUserLimit(fromJid);

      if (!limitResult.allowed) {
        await evolutionAPI.sendTextMessage({
          number: fromNumber,
          text: limitResult.message || 'Limite diário atingido.',
        });
        return NextResponse.json({ status: 'blocked', reason: 'daily_limit' });
      }

      // Process message through router
      const botResponse = await routeMessage(user.id, messageText);

      // Save chat history
      let chat = await prisma.aIChat.findFirst({
        where: {
          userId: user.id,
          platform: 'whatsapp',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!chat) {
        chat = await prisma.aIChat.create({
          data: {
            userId: user.id,
            platform: 'whatsapp',
            sessionId: `whatsapp-${fromJid}-${Date.now()}`,
          },
        });
      }

      // Save messages
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
            // Only track tokens if it was an LLM response (this is a simplified assumption for now)
            tokensUsed: 0, 
            model: 'fiel-ia-router',
          },
        ],
      });

      // Send response via WhatsApp
      if (botResponse.type === 'image' && botResponse.mediaUrl) {
        await evolutionAPI.sendMediaMessage({
          number: fromNumber,
          mediaUrl: botResponse.mediaUrl,
          caption: botResponse.content,
        });
      } else {
        await evolutionAPI.sendTextMessage({
          number: fromNumber,
          text: botResponse.content,
        });
      }

      // Update user activity
      await prisma.user.update({
        where: { id: user.id },
        data: { lastActive: new Date() },
      });

      return NextResponse.json({ status: 'processed' });
    }

    return NextResponse.json({ status: 'ignored' });
  } catch (error) {
    console.error('WhatsApp Webhook Error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}
