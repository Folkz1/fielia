import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const SUCCESS_STATUSES = new Set(['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH']);

function getWebhookToken(req: NextRequest) {
  return (
    req.headers.get('asaas-access-token') ||
    req.headers.get('asaas_access_token') ||
    ''
  );
}

function parseUserIdFromExternalReference(externalReference?: string | null) {
  if (!externalReference) return null;
  const match = externalReference.match(/^user:(.+)$/);
  return match?.[1] || null;
}

function parseAsaasDate(date?: string | null) {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function addOneMonth(from: Date) {
  const next = new Date(from);
  next.setMonth(next.getMonth() + 1);
  return next;
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

    const payload = (await req.json()) as any;
    const webhookEventId: string | undefined = payload?.id;
    const eventType: string = String(payload?.event || '');

    const payment = payload?.payment;
    const asaasPaymentId: string | undefined = payment?.id;

    // Store webhook event for idempotence (when id is provided)
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
        // Duplicate webhook event: treat as OK
        if (error?.code === 'P2002') {
          return NextResponse.json({ ok: true });
        }
        throw error;
      }
    }

    if (!asaasPaymentId) {
      return NextResponse.json({ ok: true });
    }

    const asaasCustomerId: string | undefined = payment?.customer;
    const externalReference: string | undefined = payment?.externalReference;
    const userIdFromRef = parseUserIdFromExternalReference(externalReference);

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(asaasCustomerId ? [{ asaasCustomerId }] : []),
          ...(userIdFromRef ? [{ id: userIdFromRef }] : []),
        ],
      },
      select: {
        id: true,
        subscriptionEnd: true,
      },
    });

    if (!user) {
      console.warn('Asaas webhook: user not found', {
        asaasPaymentId,
        asaasCustomerId,
        externalReference,
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

    await prisma.$transaction(async (tx) => {
      const savedPayment = await tx.asaasPayment.upsert({
        where: { asaasPaymentId },
        create: {
          userId: user.id,
          asaasPaymentId,
          asaasCustomerId: asaasCustomerId || null,
          asaasSubscriptionId: payment?.subscription || null,
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
          asaasSubscriptionId: payment?.subscription || undefined,
          raw: payment,
        },
      });

      if (!SUCCESS_STATUSES.has(status)) return;

      // Idempotent grant: only the first successful processing sets premiumGrantedAt
      const grant = await tx.asaasPayment.updateMany({
        where: { id: savedPayment.id, premiumGrantedAt: null },
        data: { premiumGrantedAt: now },
      });

      if (grant.count === 0) return;

      const currentUser = await tx.user.findUnique({
        where: { id: user.id },
        select: { subscriptionEnd: true },
      });

      const base =
        currentUser?.subscriptionEnd && currentUser.subscriptionEnd > now
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
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Asaas Webhook Error:', error);
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}
