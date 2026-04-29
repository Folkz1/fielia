import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import {
  hashCpf,
  isValidBrazilianMobilePhone,
  isValidCpf,
  isValidEmail,
  normalizeEmail,
  normalizeBrazilianPhone,
  normalizeCpf,
} from '@/lib/identity';
import { enqueueRegistrationFunnel } from '@/lib/funnel/queue';

export const runtime = 'nodejs';

const TERMS_VERSION = '2026-04-28';

function cleanName(value?: string | null) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 120);
}

function getSafeSource(value?: string | null) {
  const source = String(value || '').trim().slice(0, 80);
  return source || 'whatsapp';
}

function buildMagicUrl(req: NextRequest, token: string, next = '/quiz-free') {
  const base = (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).replace(/\/$/, '');
  return `${base}/api/auth/magic/${token}?next=${encodeURIComponent(next)}`;
}

function buildPostRegistrationNext(quizUrl: string | null, hasPassword: boolean) {
  const destination = quizUrl || '/dashboard';
  if (hasPassword) return destination;
  return `/auth/criar-senha?from=free&next=${encodeURIComponent(destination)}`;
}

async function getActiveQuizUrl() {
  const now = new Date();
  const activeQuiz = await prisma.quiz.findFirst({
    where: {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    select: { id: true },
    orderBy: { createdAt: 'desc' },
  });

  return activeQuiz ? '/quiz-free' : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = cleanName(body?.name);
    const email = normalizeEmail(body?.email);
    const phone = normalizeBrazilianPhone(body?.phone);
    const cpf = normalizeCpf(body?.cpf);
    const acceptedTerms = body?.acceptedTerms === true;
    const source = getSafeSource(body?.source);

    if (name.length < 3) {
      return NextResponse.json({ error: 'Informe seu nome completo.' }, { status: 400 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Informe um email valido para login.' }, { status: 400 });
    }

    if (!isValidBrazilianMobilePhone(phone)) {
      return NextResponse.json({ error: 'Informe um WhatsApp brasileiro valido com DDD.' }, { status: 400 });
    }

    if (!isValidCpf(cpf)) {
      return NextResponse.json({ error: 'CPF invalido.' }, { status: 400 });
    }

    if (!acceptedTerms) {
      return NextResponse.json({ error: 'Aceite os termos para continuar.' }, { status: 400 });
    }

    const cpfHash = hashCpf(cpf);
    const now = new Date();

    const [phoneOwner, cpfOwner, emailOwner] = await Promise.all([
      prisma.user.findFirst({
        where: { phone },
        select: { id: true, email: true, phone: true, cpfHash: true, freeRegisteredAt: true, password: true },
      }),
      prisma.user.findFirst({
        where: { OR: [{ cpfHash }, { cpfCnpj: cpf }] },
        select: { id: true, email: true, phone: true, cpfHash: true, freeRegisteredAt: true, password: true },
      }),
      prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, phone: true, cpfHash: true, freeRegisteredAt: true, password: true },
      }),
    ]);

    const owners = [phoneOwner, cpfOwner, emailOwner].filter(Boolean);
    const ownerIds = new Set(owners.map((owner) => owner!.id));
    if (ownerIds.size > 1) {
      return NextResponse.json(
        { error: 'Email, telefone ou CPF ja estao vinculados a cadastros diferentes.' },
        { status: 409 }
      );
    }

    if (phoneOwner?.cpfHash && phoneOwner.cpfHash !== cpfHash) {
      return NextResponse.json(
        { error: 'Este WhatsApp ja esta vinculado a outro CPF.' },
        { status: 409 }
      );
    }

    if (cpfOwner?.phone && cpfOwner.phone !== phone) {
      return NextResponse.json(
        { error: 'Este CPF ja esta cadastrado com outro WhatsApp.' },
        { status: 409 }
      );
    }

    if (emailOwner?.phone && emailOwner.phone !== phone) {
      return NextResponse.json(
        { error: 'Este email ja esta vinculado a outro WhatsApp.' },
        { status: 409 }
      );
    }

    if (emailOwner?.cpfHash && emailOwner.cpfHash !== cpfHash) {
      return NextResponse.json(
        { error: 'Este email ja esta vinculado a outro CPF.' },
        { status: 409 }
      );
    }

    const existingUser = phoneOwner || cpfOwner || emailOwner;
    const magicToken = crypto.randomBytes(32).toString('hex');
    const magicTokenExp = new Date(Date.now() + 15 * 60 * 1000);

    const user = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name,
            email,
            phone,
            cpfHash,
            freeRegisteredAt: existingUser.freeRegisteredAt || now,
            termsAcceptedAt: now,
            termsVersion: TERMS_VERSION,
            funnelSource: source,
            funnelStage: 'registered',
            magicToken,
            magicTokenExp,
          },
          select: { id: true, name: true, password: true },
        })
      : await prisma.user.create({
          data: {
            name,
            email,
            password: '',
            phone,
            cpfHash,
            freeRegisteredAt: now,
            termsAcceptedAt: now,
            termsVersion: TERMS_VERSION,
            funnelSource: source,
            funnelStage: 'registered',
            magicToken,
            magicTokenExp,
          },
          select: { id: true, name: true, password: true },
        });

    const quizUrl = await getActiveQuizUrl();
    const nextUrl = buildPostRegistrationNext(quizUrl, Boolean(user.password));
    const redirectUrl = buildMagicUrl(req, magicToken, nextUrl);

    await enqueueRegistrationFunnel({
      userId: user.id,
      phone,
      name: user.name,
      registrationUrl: redirectUrl,
      quizUrl: quizUrl ? redirectUrl : null,
      quizOpen: Boolean(quizUrl),
    }).catch((error) => {
      console.error('[Cadastro Free] Failed to enqueue funnel:', error instanceof Error ? error.message : error);
    });

    return NextResponse.json({
      ok: true,
      userId: user.id,
      name: user.name,
      quizOpen: Boolean(quizUrl),
      redirectUrl,
      message: quizUrl
        ? 'Cadastro confirmado. Crie sua senha para liberar o quiz.'
        : 'Cadastro confirmado. Crie sua senha para acessar sua conta.',
    });
  } catch (error) {
    console.error('[Cadastro Free] Error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Falha ao concluir cadastro.' }, { status: 500 });
  }
}
