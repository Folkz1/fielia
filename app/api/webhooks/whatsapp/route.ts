import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { evolutionAPI } from '@/lib/evolution-api';
import { routeMessage } from '@/lib/bot/router';
import { WELCOME_MESSAGE, MAIN_MENU } from '@/lib/bot/templates';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Evolution API webhook payload structure
    const { data, event } = body;

    if (!data || !event) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    // Handle different event types
    if (event === 'messages.upsert') {
      console.log('WEBHOOK_V2_DEBUG Start');
      console.log('Webhook Body:', JSON.stringify(body, null, 2));

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
      const from = key?.remoteJid;

      if (!from) {
        console.error('Invalid message structure - Missing remoteJid. Message:', JSON.stringify(message, null, 2));
        return NextResponse.json({ status: 'ignored', reason: 'invalid_structure_no_from' });
      }

      const messageText = message?.message?.conversation || 
                         message?.message?.extendedTextMessage?.text || '';

      if (!messageText) {
        return NextResponse.json({ status: 'ignored' });
      }

      // Find or create user by WhatsApp ID
      let user = await prisma.user.findUnique({
        where: { whatsappId: from },
      });

      let isNewUser = false;

      if (!user) {
        // Create new user
        isNewUser = true;
        user = await prisma.user.create({
          data: {
            whatsappId: from,
            name: message.pushName || 'Fiel Torcedor',
            email: `${from}@whatsapp.temp`,
            password: 'whatsapp-user',
          },
        });
      }

      // Handle New User or /menu command
      if (isNewUser || messageText.toLowerCase() === '/menu') {
        if (isNewUser) {
            await evolutionAPI.sendTextMessage({
                number: from,
                text: WELCOME_MESSAGE,
                delay: 1000,
            });
        }
        
        await evolutionAPI.sendListMessage({
            number: from,
            ...MAIN_MENU
        });

        return NextResponse.json({ status: 'processed_menu' });
      }

      // Rate Limit Check
      const { checkUserLimit } = await import('@/lib/bot/limits');
      const limitResult = await checkUserLimit(from);

      if (!limitResult.allowed) {
        await evolutionAPI.sendTextMessage({
          number: from,
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
            sessionId: `whatsapp-${from}-${Date.now()}`,
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
      await evolutionAPI.sendTextMessage({
        number: from,
        text: botResponse.content,
      });

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
