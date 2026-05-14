#!/usr/bin/env node

import dotenv from 'dotenv';
import path from 'node:path';
import process from 'node:process';
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
const keepUser = process.argv.includes('--keep');

if (!connectionString) {
  throw new Error('Missing DATABASE_URL');
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const runId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const testUser = {
  name: `Codex Smoke ${runId}`,
  email: `codex-production-smoke+${runId}@fielia.local`,
  phone: generateBrazilianMobilePhone(runId),
  cpf: generateValidCpf(runId),
  password: `Fielia${runId}!`,
};

const evidence = {
  ok: false,
  baseUrl,
  keepUser,
  user: {
    email: testUser.email,
    phoneMasked: maskPhone(testUser.phone),
  },
  steps: {},
  cleanup: null,
};

try {
  const registration = await postJson('/api/cadastro-free', {
    name: testUser.name,
    email: testUser.email,
    phone: testUser.phone,
    cpf: testUser.cpf,
    acceptedTerms: true,
    source: 'codex-production-smoke',
  });

  assert(registration.status === 200, `cadastro-free returned ${registration.status}`);
  assert(registration.json?.ok === true, 'cadastro-free did not return ok=true');
  assert(registration.json?.redirectUrl, 'cadastro-free did not return redirectUrl');

  evidence.steps.registration = {
    status: registration.status,
    ok: registration.json.ok,
    quizOpen: registration.json.quizOpen,
    hasRedirectUrl: Boolean(registration.json.redirectUrl),
  };

  const createdUser = await prisma.user.findUnique({
    where: { email: testUser.email },
    select: {
      id: true,
      cpfHash: true,
      cpfCnpj: true,
      isPremium: true,
      freeRegisteredAt: true,
      termsAcceptedAt: true,
      termsVersion: true,
      funnelStage: true,
      magicToken: true,
      magicTokenExp: true,
    },
  });

  assert(createdUser, 'created user not found in database');
  assert(Boolean(createdUser.cpfHash), 'cpfHash was not stored');
  assert(!createdUser.cpfCnpj, 'cpfCnpj should not store plaintext CPF for new free user');
  assert(createdUser.isPremium === false, 'free user should not be premium');

  evidence.steps.databaseAfterRegistration = {
    hasCpfHash: Boolean(createdUser.cpfHash),
    hasPlainCpf: Boolean(createdUser.cpfCnpj),
    isPremium: createdUser.isPremium,
    hasFreeRegisteredAt: Boolean(createdUser.freeRegisteredAt),
    hasTermsAcceptedAt: Boolean(createdUser.termsAcceptedAt),
    termsVersion: createdUser.termsVersion,
    funnelStage: createdUser.funnelStage,
    hasMagicToken: Boolean(createdUser.magicToken),
  };

  const funnelAfterRegistration = await prisma.whatsAppFunnelMessage.groupBy({
    by: ['stage', 'status'],
    where: { userId: createdUser.id },
    _count: { _all: true },
    orderBy: [{ stage: 'asc' }, { status: 'asc' }],
  });

  evidence.steps.registrationFunnel = summarizeGroups(funnelAfterRegistration);
  assert(
    countStatus(funnelAfterRegistration, 'pending') >= 3,
    'expected registration funnel messages to be queued as pending',
  );
  assert(countStatus(funnelAfterRegistration, 'sent') === 0, 'registration funnel should not send while disabled');

  const magic = await fetch(registration.json.redirectUrl, {
    method: 'GET',
    redirect: 'manual',
    headers: { accept: 'text/html' },
  });

  const cookie = extractCookie(magic.headers);
  assert(cookie, 'magic link did not set auth cookie');
  assert(magic.status >= 300 && magic.status < 400, `magic link returned ${magic.status}`);

  evidence.steps.magicLogin = {
    status: magic.status,
    hasAuthCookie: Boolean(cookie),
    location: sanitizeLocation(magic.headers.get('location')),
  };

  const afterMagicUser = await prisma.user.findUnique({
    where: { id: createdUser.id },
    select: { magicToken: true, magicTokenExp: true },
  });
  assert(afterMagicUser?.magicToken === null, 'magic token should be invalidated after first use');

  evidence.steps.magicTokenInvalidated = {
    magicTokenCleared: afterMagicUser?.magicToken === null,
    magicTokenExpCleared: afterMagicUser?.magicTokenExp === null,
  };

  const password = await postJson('/api/user/criar-senha', { password: testUser.password }, cookie);
  assert(password.status === 200, `criar-senha returned ${password.status}`);
  assert(password.json?.success === true, 'criar-senha did not return success=true');

  evidence.steps.password = {
    status: password.status,
    success: password.json.success,
  };

  const quizResponse = await getJson('/api/quiz?audience=free', cookie);
  assert(quizResponse.status === 200, `quiz GET returned ${quizResponse.status}`);
  const activeQuiz = quizResponse.json?.activeQuiz;
  assert(activeQuiz?.id, 'no active free quiz found');
  assert(Array.isArray(activeQuiz.questions), 'active quiz questions missing');
  assert(
    activeQuiz.questions.every((question) => !Object.prototype.hasOwnProperty.call(question, 'correctAnswer')),
    'public quiz payload leaked correctAnswer',
  );

  evidence.steps.quizGet = {
    status: quizResponse.status,
    audience: quizResponse.json.audience,
    isPremium: quizResponse.json.isPremium,
    activeQuizId: activeQuiz.id,
    questions: activeQuiz.questions.length,
    leaksCorrectAnswer: activeQuiz.questions.some((question) =>
      Object.prototype.hasOwnProperty.call(question, 'correctAnswer'),
    ),
  };

  const dbQuiz = await prisma.quiz.findUnique({
    where: { id: activeQuiz.id },
    include: { questions: { orderBy: { order: 'asc' } } },
  });
  assert(dbQuiz?.questions?.length, 'active quiz not found in database with questions');

  const answers = dbQuiz.questions.map((question) => ({
    questionId: question.id,
    answer: question.correctAnswer,
    timeTaken: 3,
  }));

  const submit = await postJson(
    '/api/quiz/submit',
    {
      quizId: activeQuiz.id,
      answers,
    },
    cookie,
  );
  assert(submit.status === 200, `quiz submit returned ${submit.status}`);
  assert(submit.json?.attemptId, 'quiz submit missing attemptId');

  evidence.steps.quizSubmit = {
    status: submit.status,
    audience: submit.json.audience,
    score: submit.json.score,
    accuracy: submit.json.accuracy,
    correctAnswers: submit.json.correctAnswers,
    totalQuestions: submit.json.totalQuestions,
  };

  const duplicateSubmit = await postJson(
    '/api/quiz/submit',
    {
      quizId: activeQuiz.id,
      answers,
    },
    cookie,
  );
  assert(duplicateSubmit.status === 409, `duplicate quiz submit should return 409, got ${duplicateSubmit.status}`);

  evidence.steps.quizDuplicateGuard = {
    status: duplicateSubmit.status,
    error: duplicateSubmit.json?.error,
  };

  const ranking = await getJson(`/api/ranking?period=weekly&limit=100&quizId=${activeQuiz.id}`, cookie);
  assert(ranking.status === 200, `ranking returned ${ranking.status}`);
  assert(ranking.json?.isPremium === false, 'free ranking should report isPremium=false');
  assert(ranking.json?.requiresPremium === true, 'free ranking should require premium for full view');
  assert(ranking.json?.maxVisible === 10, `free ranking maxVisible should be 10, got ${ranking.json?.maxVisible}`);
  assert(ranking.json?.ranking?.length <= 10, 'free ranking returned more than 10 rows');
  assert(ranking.json?.viewer?.id === createdUser.id, 'ranking viewer missing current smoke user');

  evidence.steps.ranking = {
    status: ranking.status,
    rows: ranking.json.ranking.length,
    maxVisible: ranking.json.maxVisible,
    requiresPremium: ranking.json.requiresPremium,
    viewerRank: ranking.json.viewer.rank,
    viewerPoints: ranking.json.viewer.totalPoints,
  };

  const funnelAfterQuiz = await prisma.whatsAppFunnelMessage.groupBy({
    by: ['stage', 'status'],
    where: { userId: createdUser.id },
    _count: { _all: true },
    orderBy: [{ stage: 'asc' }, { status: 'asc' }],
  });
  assert(
    funnelAfterQuiz.some((item) => item.stage === 'post_quiz_cta' && item.status === 'pending'),
    'post_quiz_cta should be queued after free quiz submit',
  );
  assert(countStatus(funnelAfterQuiz, 'sent') === 0, 'funnel should not send private messages while disabled');

  evidence.steps.funnelAfterQuiz = {
    groups: summarizeGroups(funnelAfterQuiz),
    sentCount: countStatus(funnelAfterQuiz, 'sent'),
    privateSendDisabled: process.env.WHATSAPP_FUNNEL_ENABLED !== 'true',
  };

  evidence.ok = true;
} catch (error) {
  evidence.ok = false;
  evidence.error = error instanceof Error ? error.message : String(error);
  process.exitCode = 1;
} finally {
  if (!keepUser) {
    evidence.cleanup = await cleanupSmokeUser(testUser.email).catch((error) => ({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }));
  }

  console.log(JSON.stringify(evidence, null, 2));
  await prisma.$disconnect();
  await pool.end();
}

async function cleanupSmokeUser(email) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!user) return { ok: true, deletedUser: false };

  const attempts = await prisma.quizAttempt.findMany({
    where: { userId: user.id },
    select: { id: true },
  });
  const attemptIds = attempts.map((attempt) => attempt.id);

  const [answers, attemptsDeleted, funnel, userDeleted] = await prisma.$transaction([
    prisma.quizAnswer.deleteMany({ where: { attemptId: { in: attemptIds } } }),
    prisma.quizAttempt.deleteMany({ where: { id: { in: attemptIds } } }),
    prisma.whatsAppFunnelMessage.deleteMany({ where: { userId: user.id } }),
    prisma.user.delete({ where: { id: user.id }, select: { id: true } }),
  ]);

  return {
    ok: true,
    deletedUser: Boolean(userDeleted?.id),
    deletedQuizAnswers: answers.count,
    deletedQuizAttempts: attemptsDeleted.count,
    deletedFunnelMessages: funnel.count,
  };
}

async function postJson(pathname, body, cookie) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
  return {
    status: response.status,
    json: await response.json().catch(() => null),
  };
}

async function getJson(pathname, cookie) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      ...(cookie ? { cookie } : {}),
    },
  });
  return {
    status: response.status,
    json: await response.json().catch(() => null),
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function extractCookie(headers) {
  const setCookie =
    typeof headers.getSetCookie === 'function' ? headers.getSetCookie() : [headers.get('set-cookie')].filter(Boolean);
  const authCookie = setCookie.find((cookie) => /authjs\.session-token=/.test(cookie));
  return authCookie ? authCookie.split(';')[0] : null;
}

function summarizeGroups(groups) {
  return groups.map((item) => ({
    stage: item.stage,
    status: item.status,
    count: item._count?._all || 0,
  }));
}

function countStatus(groups, status) {
  return groups
    .filter((item) => item.status === status)
    .reduce((sum, item) => sum + (item._count?._all || 0), 0);
}

function sanitizeLocation(value) {
  if (!value) return null;
  return value.replace(/\/api\/auth\/magic\/[a-f0-9]{64}/i, '/api/auth/magic/[redacted]');
}

function stripTrailingSlash(value) {
  return value ? value.replace(/\/+$/, '') : value;
}

function maskPhone(value) {
  const digits = String(value).replace(/\D/g, '');
  return `${digits.slice(0, 4)}*****${digits.slice(-2)}`;
}

function generateBrazilianMobilePhone(seed) {
  const numeric = String(seed).replace(/\D/g, '').slice(-8).padStart(8, '0');
  return `1199${numeric.slice(0, 7)}`.slice(0, 11);
}

function generateValidCpf(seed) {
  const digits = String(seed)
    .replace(/\D/g, '')
    .padEnd(9, '7')
    .slice(0, 9)
    .split('')
    .map((digit) => Number.parseInt(digit, 10));

  if (digits.every((digit) => digit === digits[0])) {
    digits[0] = (digits[0] + 1) % 10;
  }

  const first = cpfCheckDigit(digits, 10);
  const second = cpfCheckDigit([...digits, first], 11);
  return [...digits, first, second].join('');
}

function cpfCheckDigit(digits, weightStart) {
  const sum = digits.reduce((total, digit, index) => total + digit * (weightStart - index), 0);
  const mod = (sum * 10) % 11;
  return mod === 10 ? 0 : mod;
}
