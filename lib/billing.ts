import { prisma } from '@/lib/prisma';
import { asaasClient } from '@/lib/asaas';

export const SUCCESS_STATUSES = new Set(['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH']);
export const OPEN_PAYMENT_STATUSES = new Set(['PENDING', 'AWAITING_RISK_ANALYSIS', 'OVERDUE']);
export const ACTIVE_ASAAS_SUBSCRIPTION_STATUSES = new Set(['ACTIVE', 'OVERDUE']);

export type SubscriptionState =
  | 'free'
  | 'pending_payment'
  | 'active'
  | 'cancelled_pending_end'
  | 'overdue';

export type AsaasPaymentData = {
  id?: string;
  status?: string;
  billingType?: string;
  value?: number | string;
  dueDate?: string;
  paymentDate?: string;
  confirmedDate?: string;
  creditDate?: string;
  invoiceUrl?: string | null;
  description?: string | null;
  externalReference?: string | null;
  subscription?: string | null;
};

type BillingUserLike = {
  isPremium: boolean;
  subscriptionEnd: Date | null;
  asaasSubscriptionId: string | null;
};

type BillingPaymentLike = {
  asaasPaymentId: string;
  status: string;
  dueDate: Date | null;
  paidAt: Date | null;
  invoiceUrl: string | null;
  asaasSubscriptionId: string | null;
  createdAt?: Date | null;
};

export type BillingOverview = {
  subscriptionState: SubscriptionState;
  paymentStatus: string | null;
  invoiceUrl: string | null;
  dueDate: Date | null;
  subscriptionEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  isPremiumActive: boolean;
  relevantPaymentId: string | null;
  lastSubscriptionId: string | null;
  hasSuccessfulSubscriptionPayment: boolean;
};

export function formatAsaasDate(date: Date) {
  return date.toISOString().split('T')[0];
}

export function parseAsaasDate(value?: string | Date | null) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function addOneMonth(from: Date) {
  const next = new Date(from);
  next.setMonth(next.getMonth() + 1);
  return next;
}

export function resolvePlanValue() {
  const parsed = Number(process.env.ASAAS_SUBSCRIPTION_VALUE || '56.90');
  if (!Number.isFinite(parsed) || parsed <= 0) return 56.9;
  return parsed;
}

export function isSuccessPaymentStatus(status?: string | null) {
  return SUCCESS_STATUSES.has(String(status || '').toUpperCase());
}

export function isOpenPaymentStatus(status?: string | null) {
  return OPEN_PAYMENT_STATUSES.has(String(status || '').toUpperCase());
}

export function isOverduePaymentStatus(status?: string | null) {
  return String(status || '').toUpperCase() === 'OVERDUE';
}

export function isPremiumActive(user: { isPremium: boolean; subscriptionEnd: Date | null }, now = new Date()) {
  return Boolean(user.isPremium && (!user.subscriptionEnd || user.subscriptionEnd > now));
}

function paymentTimestamp(payment: BillingPaymentLike) {
  return (
    payment.paidAt?.getTime() ||
    payment.dueDate?.getTime() ||
    payment.createdAt?.getTime() ||
    0
  );
}

function pickNewestPayment(payments: BillingPaymentLike[]) {
  return [...payments].sort((a, b) => paymentTimestamp(b) - paymentTimestamp(a))[0] || null;
}

function pickOpenPayment(payments: BillingPaymentLike[]) {
  return [...payments]
    .sort((a, b) => {
      const dueA = a.dueDate?.getTime() || Number.MAX_SAFE_INTEGER;
      const dueB = b.dueDate?.getTime() || Number.MAX_SAFE_INTEGER;
      if (isOverduePaymentStatus(a.status) && !isOverduePaymentStatus(b.status)) return -1;
      if (!isOverduePaymentStatus(a.status) && isOverduePaymentStatus(b.status)) return 1;
      return dueA - dueB;
    })[0] || null;
}

export function deriveBillingOverview(params: {
  user: BillingUserLike;
  payments: BillingPaymentLike[];
  now?: Date;
}) {
  const { user, payments, now = new Date() } = params;
  const subscriptionPayments = payments.filter((payment) => payment.asaasSubscriptionId);
  const currentSubscriptionPayments = user.asaasSubscriptionId
    ? subscriptionPayments.filter(
        (payment) => payment.asaasSubscriptionId === user.asaasSubscriptionId
      )
    : [];
  const scopedPayments = currentSubscriptionPayments.length > 0 ? currentSubscriptionPayments : subscriptionPayments;

  const overduePayment = user.asaasSubscriptionId
    ? pickOpenPayment(
        currentSubscriptionPayments.filter((payment) => isOverduePaymentStatus(payment.status))
      )
    : null;

  const pendingPayment = user.asaasSubscriptionId
    ? pickOpenPayment(
        currentSubscriptionPayments.filter(
          (payment) => isOpenPaymentStatus(payment.status) && !isOverduePaymentStatus(payment.status)
        )
      )
    : null;

  const latestSuccessfulPayment =
    pickNewestPayment(scopedPayments.filter((payment) => isSuccessPaymentStatus(payment.status))) ||
    pickNewestPayment(subscriptionPayments.filter((payment) => isSuccessPaymentStatus(payment.status)));

  const latestPayment = pickNewestPayment(scopedPayments.length > 0 ? scopedPayments : payments);
  const hasSuccessfulSubscriptionPayment = subscriptionPayments.some((payment) =>
    isSuccessPaymentStatus(payment.status)
  );
  const premiumActive = isPremiumActive(user, now);
  const cancelAtPeriodEnd = Boolean(
    premiumActive && !user.asaasSubscriptionId && hasSuccessfulSubscriptionPayment
  );

  let subscriptionState: SubscriptionState = 'free';
  let relevantPayment: BillingPaymentLike | null = null;

  if (overduePayment) {
    subscriptionState = 'overdue';
    relevantPayment = overduePayment;
  } else if (cancelAtPeriodEnd) {
    subscriptionState = 'cancelled_pending_end';
    relevantPayment = latestSuccessfulPayment || latestPayment;
  } else if (premiumActive) {
    subscriptionState = 'active';
    relevantPayment = latestSuccessfulPayment || latestPayment;
  } else if (pendingPayment) {
    subscriptionState = 'pending_payment';
    relevantPayment = pendingPayment;
  } else {
    relevantPayment = latestPayment;
  }

  return {
    subscriptionState,
    paymentStatus: relevantPayment?.status || null,
    invoiceUrl: relevantPayment?.invoiceUrl || null,
    dueDate: relevantPayment?.dueDate || null,
    subscriptionEnd: user.subscriptionEnd,
    cancelAtPeriodEnd,
    isPremiumActive: premiumActive,
    relevantPaymentId: relevantPayment?.asaasPaymentId || null,
    lastSubscriptionId:
      user.asaasSubscriptionId ||
      latestSuccessfulPayment?.asaasSubscriptionId ||
      latestPayment?.asaasSubscriptionId ||
      null,
    hasSuccessfulSubscriptionPayment,
  } satisfies BillingOverview;
}

export function serializeBillingOverview(overview: BillingOverview) {
  return {
    subscriptionState: overview.subscriptionState,
    paymentStatus: overview.paymentStatus,
    invoiceUrl: overview.invoiceUrl,
    dueDate: overview.dueDate?.toISOString() || null,
    subscriptionEnd: overview.subscriptionEnd?.toISOString() || null,
    cancelAtPeriodEnd: overview.cancelAtPeriodEnd,
    relevantPaymentId: overview.relevantPaymentId,
    lastSubscriptionId: overview.lastSubscriptionId,
  };
}

export async function upsertAsaasPaymentRecord(params: {
  userId: string;
  asaasCustomerId: string;
  asaasSubscriptionId: string;
  payment: AsaasPaymentData;
  fallbackBillingType: string;
  fallbackValue: number;
}) {
  const { userId, asaasCustomerId, asaasSubscriptionId, payment, fallbackBillingType, fallbackValue } =
    params;

  if (!payment?.id) return;

  const status = String(payment.status || 'PENDING');
  const billingType = String(payment.billingType || fallbackBillingType);
  const amountCents = Math.round(Number(payment.value || fallbackValue) * 100);
  const dueDate = parseAsaasDate(payment.dueDate);
  const paidAt =
    parseAsaasDate(payment.paymentDate) ||
    parseAsaasDate(payment.confirmedDate) ||
    parseAsaasDate(payment.creditDate);

  await prisma.asaasPayment.upsert({
    where: { asaasPaymentId: payment.id },
    create: {
      userId,
      asaasPaymentId: payment.id,
      asaasCustomerId,
      asaasSubscriptionId,
      status,
      billingType,
      amountCents,
      dueDate,
      paidAt,
      invoiceUrl: payment.invoiceUrl || null,
      description: payment.description || 'FIEL.IA - Plano Premium Mensal',
      externalReference: payment.externalReference || `user:${userId}`,
      raw: payment,
    },
    update: {
      status,
      billingType,
      amountCents,
      dueDate,
      paidAt,
      invoiceUrl: payment.invoiceUrl || null,
      description: payment.description || undefined,
      externalReference: payment.externalReference || undefined,
      asaasCustomerId,
      asaasSubscriptionId,
      raw: payment,
    },
  });
}

export async function getOpenPaymentForSubscription(subscriptionId: string) {
  const subscription = await asaasClient.getSubscription(subscriptionId);
  const status = String(subscription?.status || '').toUpperCase();

  if (!ACTIVE_ASAAS_SUBSCRIPTION_STATUSES.has(status)) {
    return { subscription, payment: null };
  }

  const paymentsResponse = await asaasClient.listSubscriptionPayments(subscriptionId);
  const payments: AsaasPaymentData[] = Array.isArray(paymentsResponse?.data)
    ? (paymentsResponse.data as AsaasPaymentData[])
    : [];

  const pendingPayments = payments
    .filter((payment) => isOpenPaymentStatus(payment?.status))
    .sort((a, b) => {
      const dueA = parseAsaasDate(a?.dueDate)?.getTime() || Number.MAX_SAFE_INTEGER;
      const dueB = parseAsaasDate(b?.dueDate)?.getTime() || Number.MAX_SAFE_INTEGER;
      return dueA - dueB;
    });

  return {
    subscription,
    payment: pendingPayments[0] || null,
  };
}

export async function createLocalSubscriptionEvent(params: {
  event: 'SUBSCRIPTION_DELETED' | 'SUBSCRIPTION_INACTIVATED';
  subscriptionId: string;
  userId: string;
  payload?: Record<string, unknown>;
}) {
  const { event, subscriptionId, userId, payload } = params;
  const localId = `local_${event}_${subscriptionId}_${Date.now()}`;
  await prisma.asaasWebhookEvent.create({
    data: {
      id: localId,
      event,
      payload: {
        id: localId,
        event,
        source: 'local_app_action',
        userId,
        subscription: { id: subscriptionId },
        ...payload,
      },
    },
  });
}
