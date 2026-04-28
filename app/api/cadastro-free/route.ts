import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import {
  hashCpf,
  isValidBrazilianMobilePhone,
  isValidCpf,
  makeFreeLeadEmail,
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
    const phone = normalizeBrazilianPhone(body?.phone);
    const cpf = normalizeCpf(body?.cpf);
    const acceptedTerms = body?.acceptedTerms === true;
    const source = getSafeSource(body?.source);

    if (name.length < 3) {
      return NextResponse.json({ error: 'Informe seu nome completo.' }, { status: 400 });
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

    const [phoneOwner, cpfOwner] = await Promise.all([
      prisma.user.findFirst({
        where: { phone },
        select: { id: true, phone: true, cpfHash: true, freeRegisteredAt: true },
      }),
      prisma.user.findFirst({
        where: { OR: [{ cpfHash }, { cpfCnpj: cpf }] },
        select: { id: true, phone: true, cpfHash: true, freeRegisteredAt: true },
      }),
    ]);

    if (phoneOwner && cpfOwner && phoneOwner.id !== cpfOwner.id) {
      return NextResponse.json(
        { error: 'Telefone e CPF ja estao vinculados a cadastros diferentes.' },
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

    const existingUser = phoneOwner || cpfOwner;
    const magicToken = crypto.randomBytes(32).toString('hex');
    const magicTokenExp = new Date(Date.now() + 15 * 60 * 1000);

    const user = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name,
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
          select: { id: true, name: true },
        })
      : await prisma.user.create({
          data: {
            name,
            email: makeFreeLeadEmail(phone),
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
          select: { id: true, name: true },
        });

    const quizUrl = await getActiveQuizUrl();
    const redirectUrl = quizUrl ? buildMagicUrl(req, magicToken, quizUrl) : null;

    await enqueueRegistrationFunnel({
      userId: user.id,
      phone,
      name: user.name,
      registrationUrl: redirectUrl || `${(process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).replace(/\/$/, '')}/cadastro-free`,
      quizUrl: redirectUrl,
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
        ? 'Cadastro confirmado. Vamos liberar seu quiz.'
        : 'Cadastro confirmado. Avisaremos no WhatsApp quando o proximo quiz abrir.',
    });
  } catch (error) {
    console.error('[Cadastro Free] Error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Falha ao concluir cadastro.' }, { status: 500 });
  }
}
