#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true, quiet: true });

const baseUrl = stripTrailingSlash(
  process.env.PLAYWRIGHT_BASE_URL ||
    process.env.FRONTEND_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://fielchat.com',
);
const connectionString = process.env.DATABASE_URL;
const imagePath = process.env.MANUAL_SMOKE_IMAGE_PATH || path.resolve(process.cwd(), 'tmp/fielia-media/3EB0DED4ED91419F178644.jpg');
const audioPath = process.env.MANUAL_SMOKE_AUDIO_PATH || path.resolve(process.cwd(), 'tmp/fielia-media/tanaka-reference.ogg');
const shouldSend = process.env.MANUAL_SMOKE_SEND === 'true';

if (!connectionString) throw new Error('Missing DATABASE_URL');

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const runId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const title = `Codex smoke envio manual ${runId}`;
const caption = [
  '[FIEL.IA teste tecnico]',
  'Validacao de envio manual seguro: imagem, audio e agendamento.',
  'Pode ignorar esta mensagem; e um smoke controlado.',
].join('\n');
const evidence = {
  ok: false,
  baseUrl,
  shouldSend,
  title,
  steps: {},
};

try {
  if (!shouldSend) {
    evidence.steps.dryRun = {
      planned: [
        'admin magic login',
        'POST /api/admin/manual-content with safeSend=true',
        'POST /api/admin/manual-content/queue twice',
        'Evolution history verification',
      ],
      note: 'Set MANUAL_SMOKE_SEND=true to run the controlled production send.',
    };
    console.log(JSON.stringify(evidence, null, 2));
    process.exit(2);
  }

  const cookie = await createAdminCookie();
  const adminCheck = await getJson('/api/admin/check', cookie);
  assert(adminCheck.status === 200 && adminCheck.json?.isAdmin === true, 'admin auth failed');
  evidence.steps.adminAuth = { status: adminCheck.status, isAdmin: adminCheck.json.isAdmin };

  const beforeQueue = await getJson('/api/admin/manual-content/queue', cookie);
  assert(beforeQueue.status === 200, `manual queue GET returned ${beforeQueue.status}`);
  evidence.steps.queueBefore = {
    status: beforeQueue.status,
    enabled: beforeQueue.json.enabled,
    counts: beforeQueue.json.counts,
    batch: beforeQueue.json.batch,
  };

  const form = new FormData();
  form.set('title', title);
  form.set('caption', caption);
  form.set('sendToGroup', 'true');
  form.set('sendToPremium', 'false');
  form.set('safeSend', 'true');
  form.set('scheduledFor', new Date().toISOString());
  form.set('image', await fileAsBlob(imagePath, 'image/jpeg'), `${slugify(title)}.jpg`);
  form.set('audio', await fileAsBlob(audioPath, 'audio/ogg'), `${slugify(title)}.ogg`);

  const saveResponse = await fetch(`${baseUrl}/api/admin/manual-content`, {
    method: 'POST',
    headers: { cookie },
    body: form,
  });
  const saveJson = await saveResponse.json().catch(() => null);
  assert(saveResponse.status === 200, `manual content POST returned ${saveResponse.status}`);
  assert(saveJson?.success === true, 'manual content POST did not return success=true');
  assert(saveJson?.deliveryMode === 'queued', 'manual content should use queued delivery');
  assert(saveJson?.queued?.queued >= 2, 'manual content should queue image and audio');

  evidence.steps.saveManualContent = {
    status: saveResponse.status,
    success: saveJson.success,
    deliveryMode: saveJson.deliveryMode,
    queued: saveJson.queued,
    created: {
      image: Boolean(saveJson.created?.image?.id),
      podcast: Boolean(saveJson.created?.podcast?.id),
    },
  };

  await sleep(2500);
  const firstProcess = await postJson('/api/admin/manual-content/queue', { limit: 5 }, cookie);
  assert(firstProcess.status === 200, `manual queue first POST returned ${firstProcess.status}`);
  assert(firstProcess.json?.sent >= 1, 'first manual queue process should send at least one item');
  evidence.steps.firstQueueProcess = {
    status: firstProcess.status,
    processed: firstProcess.json.processed,
    sent: firstProcess.json.sent,
    failed: firstProcess.json.failed,
  };

  await sleep(18_000);
  const secondProcess = await postJson('/api/admin/manual-content/queue', { limit: 5 }, cookie);
  assert(secondProcess.status === 200, `manual queue second POST returned ${secondProcess.status}`);
  assert(secondProcess.json?.sent >= 1, 'second manual queue process should send the delayed audio item');
  evidence.steps.secondQueueProcess = {
    status: secondProcess.status,
    processed: secondProcess.json.processed,
    sent: secondProcess.json.sent,
    failed: secondProcess.json.failed,
  };

  const afterQueue = await getJson('/api/admin/manual-content/queue', cookie);
  assert(afterQueue.status === 200, `manual queue final GET returned ${afterQueue.status}`);
  evidence.steps.queueAfter = {
    status: afterQueue.status,
    enabled: afterQueue.json.enabled,
    counts: afterQueue.json.counts,
  };

  const queuedRows = await prisma.whatsAppFunnelMessage.findMany({
    where: { stage: 'manual_content', metadata: { path: ['contentTitle'], equals: title } },
    orderBy: { scheduledFor: 'asc' },
    select: {
      kind: true,
      status: true,
      attempts: true,
      sentAt: true,
      phone: true,
      lastError: true,
    },
  });
  assert(queuedRows.length >= 2, 'manual content queue rows not found in database');
  assert(queuedRows.every((row) => row.status === 'sent'), 'manual content queue rows should be sent');
  evidence.steps.databaseRows = queuedRows.map((row) => ({
    kind: row.kind,
    status: row.status,
    attempts: row.attempts,
    hasSentAt: Boolean(row.sentAt),
    targetKind: row.phone.endsWith('@g.us') ? 'group' : 'private',
    lastError: row.lastError,
  }));

  const evolution = await getProductionEvolutionEnv();
  const history = await evolutionRequest(evolution, `/chat/findMessages/${encodeURIComponent(evolution.instance)}`, {
    method: 'POST',
    body: {
      where: { key: { remoteJid: evolution.groupJid } },
      limit: 20,
    },
  });
  const messages = unwrapArray(history).map(summarizeMessage);
  const recentFromMe = messages.filter((message) => message.fromMe).slice(0, 10);
  const foundImage = recentFromMe.some((message) =>
    message.messageTypes.includes('imageMessage') && (message.textPreview || '').includes('Validacao de envio manual seguro'),
  );
  const foundAudio = recentFromMe.some((message) => message.messageTypes.includes('audioMessage'));
  assert(foundImage, 'Evolution history did not show the manual image caption');
  assert(foundAudio, 'Evolution history did not show a recent manual audio message');

  evidence.steps.evolutionHistory = {
    instance: evolution.instance,
    groupJid: evolution.groupJid,
    recentFromMe: recentFromMe.slice(0, 6),
    foundImage,
    foundAudio,
  };

  evidence.ok = true;
} catch (error) {
  evidence.ok = false;
  evidence.error = error instanceof Error ? error.message : String(error);
  process.exitCode = 1;
} finally {
  console.log(JSON.stringify(evidence, null, 2));
  await prisma.$disconnect();
  await pool.end();
}

async function createAdminCookie() {
  const admin = await prisma.user.findFirst({
    where: { isAdmin: true },
    select: { id: true },
  });
  assert(admin, 'no admin user found');

  const token = crypto.randomBytes(32).toString('hex');
  await prisma.user.update({
    where: { id: admin.id },
    data: {
      magicToken: token,
      magicTokenExp: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  const response = await fetch(`${baseUrl}/api/auth/magic/${token}?next=/admin/envio-manual`, {
    redirect: 'manual',
  });
  const setCookie =
    typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [response.headers.get('set-cookie')].filter(Boolean);
  const cookie = setCookie.map((item) => item.split(';')[0]).join('; ');
  assert(/authjs\.session-token=/.test(cookie), 'admin magic link did not set auth cookie');
  return cookie;
}

async function getProductionEvolutionEnv() {
  const domain = process.env.EASYPANEL_DOMAIN;
  const apiKey = process.env.EASYPANEL_API_KEY;
  const projectName = process.env.EASYPANEL_PROJECT || 'scrapers';
  const serviceName = process.env.EASYPANEL_SERVICE || 'fielia';
  assert(domain && apiKey, 'missing EasyPanel env for production inspection');

  const input = encodeURIComponent(JSON.stringify({ json: { projectName, serviceName } }));
  const response = await fetch(`https://${domain}/api/trpc/services.app.inspectService?input=${input}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const text = await response.text();
  assert(response.ok, `EasyPanel inspect returned ${response.status}`);

  const payload = JSON.parse(text);
  const env = parseEnvString(payload?.result?.data?.json?.env || '');
  assert(env.EVOLUTION_API_URL, 'production EVOLUTION_API_URL missing');
  assert(env.EVOLUTION_API_KEY, 'production EVOLUTION_API_KEY missing');
  assert(env.EVOLUTION_INSTANCE_NAME, 'production EVOLUTION_INSTANCE_NAME missing');
  assert(env.FIELIA_WHATSAPP_GROUP_ID, 'production FIELIA_WHATSAPP_GROUP_ID missing');

  return {
    baseUrl: stripTrailingSlash(env.EVOLUTION_API_URL),
    apiKey: env.EVOLUTION_API_KEY,
    instance: env.EVOLUTION_INSTANCE_NAME,
    groupJid: env.FIELIA_WHATSAPP_GROUP_ID,
  };
}

function parseEnvString(value) {
  const result = {};
  for (const line of String(value).split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    result[match[1]] = match[2].replace(/^"|"$/g, '');
  }
  return result;
}

async function evolutionRequest(config, endpoint, options = {}) {
  const response = await fetch(`${config.baseUrl}${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.apiKey,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  assert(response.ok, `Evolution returned ${response.status}: ${text.slice(0, 160)}`);
  return text ? JSON.parse(text) : null;
}

async function fileAsBlob(filePath, type) {
  const buffer = await fs.readFile(filePath);
  return new Blob([buffer], { type });
}

async function getJson(pathname, cookie) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: { accept: 'application/json', cookie },
  });
  return { status: response.status, json: await response.json().catch(() => null) };
}

async function postJson(pathname, body, cookie) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      cookie,
    },
    body: JSON.stringify(body),
  });
  return { status: response.status, json: await response.json().catch(() => null) };
}

function unwrapArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.messages)) return payload.messages;
  if (Array.isArray(payload?.messages?.records)) return payload.messages.records;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function summarizeMessage(payload) {
  const message = payload?.message ?? payload;
  const key = message?.key ?? payload?.key ?? {};
  const content = message?.message ?? payload?.message ?? {};
  const messageTypes = Object.keys(content || {}).filter((keyName) => keyName !== 'messageContextInfo');
  const textPreview =
    content?.conversation ??
    content?.extendedTextMessage?.text ??
    content?.imageMessage?.caption ??
    content?.documentMessage?.caption ??
    null;

  return {
    fromMe: Boolean(key.fromMe),
    messageTypes,
    textPreview: textPreview ? String(textPreview).slice(0, 140) : null,
  };
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function stripTrailingSlash(value) {
  return value ? value.replace(/\/+$/, '') : value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
