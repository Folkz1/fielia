import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { evolutionAPI } from '@/lib/evolution-api';
import { normalizeBrazilianPhone } from '@/lib/identity';
import { buildFunnelMessage, FunnelStage, FunnelTemplateParams } from './templates';

const MAX_ATTEMPTS = 3;

type QueueMessageInput = {
  userId?: string | null;
  phone: string;
  stage: FunnelStage;
  body?: string;
  scheduledFor?: Date;
  dedupeKey?: string;
  metadata?: Prisma.InputJsonValue;
  templateParams?: FunnelTemplateParams;
};

export type FunnelProcessResult = {
  processed: number;
  sent: number;
  failed: number;
};

function retryAt(attempts: number) {
  const minutes = Math.min(30, Math.max(1, attempts) ** 2 * 2);
  return new Date(Date.now() + minutes * 60 * 1000);
}
export function isFunnelEnabled() {
  return (process.env.WHATSAPP_FUNNEL_ENABLED || 'false').toLowerCase() === 'true';
}

export async function enqueueFunnelMessage(input: QueueMessageInput) {
  const phone = normalizeBrazilianPhone(input.phone);
  const body = input.body || buildFunnelMessage(input.stage, input.templateParams);
  const dedupeKey =
    input.dedupeKey ||
    `${input.userId || phone}:${input.stage}:${input.scheduledFor?.toISOString().slice(0, 10) || 'now'}`;

  return prisma.whatsAppFunnelMessage.upsert({
    where: { dedupeKey },
    create: {
      userId: input.userId || null,
      phone,
      stage: input.stage,
      body,
      scheduledFor: input.scheduledFor || new Date(),
      dedupeKey,
      metadata: input.metadata,
    },
    update: {
      phone,
      body,
      scheduledFor: input.scheduledFor || new Date(),
      metadata: input.metadata,
      status: 'pending',
      lastError: null,
    },
  });
}

export async function enqueueRegistrationFunnel(input: {
  userId: string;
  phone: string;
  name?: string | null;
  registrationUrl: string;
  quizUrl?: string | null;
  quizOpen?: boolean;
}) {
  const now = Date.now();
  const baseParams = {
    name: input.name,
    registrationUrl: input.registrationUrl,
    quizUrl: input.quizUrl || input.registrationUrl,
  };

  await Promise.all([
    enqueueFunnelMessage({
      userId: input.userId,
      phone: input.phone,
      stage: 'welcome',
      scheduledFor: new Date(now),
      templateParams: baseParams,
    }),
    enqueueFunnelMessage({
      userId: input.userId,
      phone: input.phone,
      stage: 'why_register',
      scheduledFor: new Date(now + 10 * 60 * 1000),
      templateParams: baseParams,
    }),
    enqueueFunnelMessage({
      userId: input.userId,
      phone: input.phone,
      stage: input.quizOpen ? 'quiz_open' : 'quiz_reminder',
      scheduledFor: new Date(now + 30 * 60 * 1000),
      templateParams: baseParams,
    }),
  ]);
}

export async function enqueuePostQuizCta(input: {
  userId: string;
  phone: string;
  name?: string | null;
  registrationUrl: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
}) {
  return enqueueFunnelMessage({
    userId: input.userId,
    phone: input.phone,
    stage: 'post_quiz_cta',
    scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000),
    templateParams: input,
    metadata: {
      score: input.score,
      correctAnswers: input.correctAnswers,
      totalQuestions: input.totalQuestions,
    },
  });
}

export async function processDueFunnelMessages(limit = 20): Promise<FunnelProcessResult> {
  if (!isFunnelEnabled()) {
    return { processed: 0, sent: 0, failed: 0 };
  }

  const dueMessages = await prisma.whatsAppFunnelMessage.findMany({
    where: {
      status: 'pending',
      attempts: { lt: MAX_ATTEMPTS },
      scheduledFor: { lte: new Date() },
    },
    orderBy: { scheduledFor: 'asc' },
    take: limit,
  });

  const result = { processed: dueMessages.length, sent: 0, failed: 0 };

  for (const message of dueMessages) {
    try {
      await prisma.whatsAppFunnelMessage.update({
        where: { id: message.id },
        data: { status: 'processing' },
      });

      await evolutionAPI.sendTextMessage({
        number: message.phone,
        text: message.body,
        delay: 1000,
      });

      await prisma.whatsAppFunnelMessage.update({
        where: { id: message.id },
        data: {
          status: 'sent',
          sentAt: new Date(),
          attempts: { increment: 1 },
          lastError: null,
        },
      });
      result.sent++;
    } catch (error) {
      const attempts = message.attempts + 1;
      await prisma.whatsAppFunnelMessage.update({
        where: { id: message.id },
        data: {
          status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
          attempts,
          scheduledFor: attempts >= MAX_ATTEMPTS ? message.scheduledFor : retryAt(attempts),
          lastError: error instanceof Error ? error.message.slice(0, 1000) : 'Unknown error',
        },
      });
      result.failed++;
    }
  }

  return result;
}
