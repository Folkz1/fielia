import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { sendMagicLinkEmail } from '@/lib/email';
import { evolutionAPI } from '@/lib/evolution-api';
import { addOneMonth, isPremiumActive, isSuccessPaymentStatus, parseAsaasDate } from '@/lib/billing';

export const runtime = 'nodejs';

function getWebhookToken(req: NextRequest) {
  return req.headers.get('asaas-access-token') || req.headers.get('asaas_access_token') || '';
}

function parseUserIdFromExternalReference(externalReference?: string | null) {
  if (!externalReference) return null;
  const match = externalReference.match(/^user:(.+)$/);
  return match?.[1] || null;
}

function getSubscriptionIdFromPayload(payload: Record<string, any>) {
  return payload?.subscription?.id || payload?.payment?.subscription || null;
}

async function syncSubscriptionLifecycleEvent(eventType: string, payload: Record<string, any>) {
  if (!['SUBSCRIPTION_DELETED', 'SUBSCRIPTION_INACTIVATED'].includes(eventType)) {
    return;
  }

  const subscriptionId = getSubscriptionIdFromPayload(payload);
  if (!subscriptionId) return;

  const user = await prisma.user.findFirst({
    where: { asaasSubscriptionId: subscriptionId },
    select: {
      id: true,
      isPremium: true,
      subscriptionEnd: true,
    },
  });

  if (!user) return;

  const keepAccessUntil = isPremiumActive(user) ? user.subscriptionEnd : null;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isPremium: Boolean(keepAccessUntil),
      subscriptionEnd: keepAccessUntil,
      asaasSubscriptionId: null,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
    if (expectedToken) {
      const receivedToken = getWebhookToken(req);
      if (!receivedToken || receivedToken !== expectedToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'ASAAS_WEBHOOK_TOKEN is not configured' },
        { status: 500 }
      );
    }

    const payload = (await req.json()) as Record<string, any>;
    const webhookEventId: string | undefined = payload?.id;
    const eventType = String(payload?.event || '');
    const payment = payload?.payment;
    const asaasPaymentId: string | undefined = payment?.id;

    if (webhookEventId) {
      try {
        await prisma.asaasWebhookEvent.create({
          data: {
            id: webhookEventId,
            event: eventType || 'UNKNOWN',
            asaasPaymentId: asaasPaymentId || null,
            payload,
          },
        });
      } catch (error: any) {
        if (error?.code === 'P2002') {
          return NextResponse.json({ ok: true });
        }
        throw error;
      }
    }

    await syncSubscriptionLifecycleEvent(eventType, payload);

    if (!asaasPaymentId) {
      return NextResponse.json({ ok: true });
    }

    const asaasCustomerId: string | undefined = payment?.customer;
    const asaasSubscriptionId: string | null = payment?.subscription || null;
    const externalReference: string | undefined = payment?.externalReference;
    const userIdFromRef = parseUserIdFromExternalReference(externalReference);

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(asaasSubscriptionId ? [{ asaasSubscriptionId }] : []),
          ...(asaasCustomerId ? [{ asaasCustomerId }] : []),
          ...(userIdFromRef ? [{ id: userIdFromRef }] : []),
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        isPremium: true,
        subscriptionEnd: true,
        asaasSubscriptionId: true,
      },
    });

    if (!user) {
      console.warn('Asaas webhook: user not found', {
        asaasPaymentId,
        asaasCustomerId,
        externalReference,
        asaasSubscriptionId,
      });
      return NextResponse.json({ ok: true });
    }

    const status = String(payment?.status || 'UNKNOWN');
    const billingType = String(payment?.billingType || 'UNKNOWN');
    const value = Number(payment?.value || 0);
    const amountCents = Math.round(value * 100);
    const dueDate = parseAsaasDate(payment?.dueDate);
    const paidAt =
      parseAsaasDate(payment?.paymentDate) ||
      parseAsaasDate(payment?.confirmedDate) ||
      parseAsaasDate(payment?.creditDate);
    const invoiceUrl: string | null = payment?.invoiceUrl || null;
    const description: string | null = payment?.description || null;
    const now = new Date();

    let shouldNotify = false;

    await prisma.$transaction(async (tx) => {
      const savedPayment = await tx.asaasPayment.upsert({
        where: { asaasPaymentId },
        create: {
          userId: user.id,
          asaasPaymentId,
          asaasCustomerId: asaasCustomerId || null,
          asaasSubscriptionId,
          status,
          billingType,
          amountCents,
          dueDate,
          paidAt,
          invoiceUrl,
          description,
          externalReference: externalReference || null,
          raw: payment,
        },
        update: {
          status,
          billingType,
          amountCents,
          dueDate,
          paidAt,
          invoiceUrl,
          description,
          externalReference: externalReference || undefined,
          asaasCustomerId: asaasCustomerId || undefined,
          asaasSubscriptionId: asaasSubscriptionId || undefined,
          raw: payment,
        },
      });

      if (!isSuccessPaymentStatus(status)) return;
      if (!asaasSubscriptionId) return;

      const currentUser = await tx.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          subscriptionEnd: true,
          asaasSubscriptionId: true,
        },
      });

      if (!currentUser?.asaasSubscriptionId) return;
      if (currentUser.asaasSubscriptionId !== asaasSubscriptionId) return;

      const grant = await tx.asaasPayment.updateMany({
        where: { id: savedPayment.id, premiumGrantedAt: null },
        data: { premiumGrantedAt: now },
      });

      if (grant.count === 0) return;

      const base =
        currentUser.subscriptionEnd && currentUser.subscriptionEnd > now
          ? currentUser.subscriptionEnd
          : now;
      const newEnd = addOneMonth(base);

      await tx.user.update({
        where: { id: user.id },
        data: {
          isPremium: true,
          subscriptionEnd: newEnd,
        },
      });

      shouldNotify = true;
    });

    if (shouldNotify) {
      try {
        const updatedUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { isPremium: true, email: true, name: true, phone: true },
        });
        if (!updatedUser?.isPremium) {
          console.warn('[Webhook] shouldNotify=true mas isPremium=false após transação — abortando notificações');
        } else {
          const magicToken = crypto.randomBytes(32).toString('hex');
          const magicTokenExp = new Date(Date.now() + 24 * 60 * 60 * 1000);
          await prisma.user.update({
            where: { id: user.id },
            data: { magicToken, magicTokenExp },
          });

          const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://fielchat.com/').replace(/\/$/, '');
          const magicUrl = `${appUrl}/api/auth/magic/${magicToken}`;

          console.log('[Webhook] Enviando email para', updatedUser.email);
          try {
            await sendMagicLinkEmail({
              to: updatedUser.email,
              name: updatedUser.name,
              magicUrl,
            });
            console.log('[Webhook] Email enviado OK');
          } catch (emailErr) {
            console.error('[Webhook] Email error:', emailErr instanceof Error ? emailErr.message : emailErr);
          }

          if (updatedUser.phone) {
            const number = updatedUser.phone.replace(/\D/g, '').replace(/^0/, '55');
            console.log('[Webhook] Enviando WhatsApp para', number);
            try {
              await evolutionAPI.sendTextMessage({
                number,
                text: `🎉 *Bem-vindo ao FIEL.IA Premium!*\n\nSua assinatura foi confirmada!\n\nAcesse agora: ${magicUrl}\n\n_Link válido por 24h_`,
              });
              console.log('[Webhook] WhatsApp enviado OK');
            } catch (waErr) {
              console.error('[Webhook] WhatsApp error:', waErr instanceof Error ? waErr.message : waErr);
            }
          } else {
            console.warn('[Webhook] Usuário sem telefone cadastrado — WhatsApp não enviado');
          }
        }
      } catch (notifyErr) {
        console.error('[Webhook] Erro ao enviar notificações:', notifyErr instanceof Error ? notifyErr.message : notifyErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Asaas Webhook Error:', error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}
