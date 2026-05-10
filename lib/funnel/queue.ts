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
  kind?: 'text' | 'image' | 'audio' | 'document';
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

type ManualTarget = {
  phone: string;
  targetKind?: 'group' | 'premium' | 'test';
  userId?: string | null;
};

type QueueMetadata = {
  mediaUrl?: string;
  mediatype?: 'image' | 'audio' | 'video' | 'document';
  mimetype?: string;
  fileName?: string;
  contentTitle?: string;
  targetKind?: string;
  manualContent?: boolean;
};

function retryAt(attempts: number) {
  const minutes = Math.min(30, Math.max(1, attempts) ** 2 * 2);
  return new Date(Date.now() + minutes * 60 * 1000);
}
export function isFunnelEnabled() {
  return (process.env.WHATSAPP_FUNNEL_ENABLED || 'false').toLowerCase() === 'true';
}

export function isManualContentSendEnabled() {
  return (process.env.WHATSAPP_MANUAL_CONTENT_ENABLED || 'false').toLowerCase() === 'true';
}

function queueBatchDelayMs() {
  return Math.max(0, Number.parseInt(process.env.WHATSAPP_QUEUE_DELAY_MS || '8000', 10) || 8000);
}

function queueBatchJitterMs() {
  return Math.max(0, Number.parseInt(process.env.WHATSAPP_QUEUE_JITTER_MS || '3000', 10) || 3000);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function metadataObject(value: Prisma.JsonValue | null): QueueMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as QueueMetadata;
}

function stableDateKey(date: Date) {
  return date.toISOString().replace(/[:.]/g, '-');
}

export async function enqueueFunnelMessage(input: QueueMessageInput) {
  const phone = input.phone.includes('@')
    ? input.phone.trim()
    : normalizeBrazilianPhone(input.phone);
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
      kind: input.kind || 'text',
      body,
      scheduledFor: input.scheduledFor || new Date(),
      dedupeKey,
      metadata: input.metadata,
    },
    update: {
      phone,
      body,
      scheduledFor: input.scheduledFor || new Date(),
      kind: input.kind || 'text',
      metadata: input.metadata,
      status: 'pending',
      lastError: null,
    },
  });
}

export async function enqueueManualContentNotifications(input: {
  title: string;
  caption: string;
  targets: ManualTarget[];
  scheduledFor?: Date;
  imageUrl?: string;
  imageMimetype?: string;
  imageFileName?: string;
  imageId?: string;
  audioUrl?: string;
  audioMimetype?: string;
  audioFileName?: string;
  podcastId?: string;
}) {
  const scheduledFor = input.scheduledFor || new Date();
  const contentKey = input.imageId || input.podcastId || simpleQueueKey(input.title);
  const normalizedTargets = Array.from(
    new Map(
      input.targets
        .map((target) => ({
          ...target,
          phone: target.phone.includes('@')
            ? target.phone.trim()
            : normalizeBrazilianPhone(target.phone),
        }))
        .filter((target) => target.phone)
        .map((target) => [target.phone, target])
    ).values()
  );

  let queued = 0;

  for (const target of normalizedTargets) {
    const baseKey = `manual-content:${contentKey}:${target.phone}:${stableDateKey(scheduledFor)}`;
    const metadataBase = {
      manualContent: true,
      contentTitle: input.title,
      targetKind: target.targetKind,
    };

    if (input.imageUrl) {
      await enqueueFunnelMessage({
        userId: target.userId || null,
        phone: target.phone,
        stage: 'manual_content',
        kind: 'image',
        body: input.caption,
        scheduledFor,
        dedupeKey: `${baseKey}:image`,
        metadata: {
          ...metadataBase,
          mediaUrl: input.imageUrl,
          mediatype: 'image',
          mimetype: input.imageMimetype,
          fileName: input.imageFileName || `${input.title}.jpg`,
        },
      });
      queued++;
    }

    if (input.audioUrl) {
      await enqueueFunnelMessage({
        userId: target.userId || null,
        phone: target.phone,
        stage: 'manual_content',
        kind: 'audio',
        body: input.caption,
        scheduledFor: new Date(scheduledFor.getTime() + 15_000),
        dedupeKey: `${baseKey}:audio`,
        metadata: {
          ...metadataBase,
          mediaUrl: input.audioUrl,
          mediatype: 'audio',
          mimetype: input.audioMimetype,
          fileName: input.audioFileName || `${input.title}.mp3`,
        },
      });
      queued++;
    }

    if (!input.imageUrl && !input.audioUrl) {
      await enqueueFunnelMessage({
        userId: target.userId || null,
        phone: target.phone,
        stage: 'manual_content',
        kind: 'text',
        body: input.caption,
        scheduledFor,
        dedupeKey: `${baseKey}:text`,
        metadata: metadataBase,
      });
      queued++;
    }
  }

  return { targets: normalizedTargets.length, queued };
}

function simpleQueueKey(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'manual';
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

async function processDueMessages(input: {
  limit: number;
  manualContentOnly?: boolean;
}): Promise<FunnelProcessResult> {
  const dueMessages = await prisma.whatsAppFunnelMessage.findMany({
    where: {
      status: 'pending',
      attempts: { lt: MAX_ATTEMPTS },
      scheduledFor: { lte: new Date() },
      stage: input.manualContentOnly ? 'manual_content' : { not: 'manual_content' },
    },
    orderBy: { scheduledFor: 'asc' },
    take: input.limit,
  });

  const result = { processed: dueMessages.length, sent: 0, failed: 0 };

  for (let index = 0; index < dueMessages.length; index++) {
    const message = dueMessages[index];
    try {
      await prisma.whatsAppFunnelMessage.update({
        where: { id: message.id },
        data: { status: 'processing' },
      });

      const metadata = metadataObject(message.metadata);
      if (metadata.mediaUrl && message.kind === 'audio') {
        await evolutionAPI.sendWhatsAppAudio({
          number: message.phone,
          audioUrl: metadata.mediaUrl,
        });
      } else if (metadata.mediaUrl) {
        await evolutionAPI.sendMediaMessage({
          number: message.phone,
          mediaUrl: metadata.mediaUrl,
          caption: message.body,
          mediatype: metadata.mediatype || (message.kind === 'image' ? 'image' : 'document'),
          mimetype: metadata.mimetype,
          fileName: metadata.fileName,
        });
      } else {
        await evolutionAPI.sendTextMessage({
          number: message.phone,
          text: message.body,
          delay: 1000,
        });
      }

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

    if (index < dueMessages.length - 1) {
      const jitter = Math.floor(Math.random() * queueBatchJitterMs());
      await sleep(queueBatchDelayMs() + jitter);
    }
  }

  return result;
}

export async function processDueFunnelMessages(limit = 20): Promise<FunnelProcessResult> {
  if (!isFunnelEnabled()) {
    return { processed: 0, sent: 0, failed: 0 };
  }

  return processDueMessages({ limit, manualContentOnly: false });
}

export async function processDueManualContentMessages(limit?: number): Promise<FunnelProcessResult> {
  const resolvedLimit = Math.max(
    1,
    Math.min(100, limit || Number.parseInt(process.env.WHATSAPP_MANUAL_CONTENT_BATCH_LIMIT || '10', 10) || 10)
  );

  return processDueMessages({ limit: resolvedLimit, manualContentOnly: true });
}
