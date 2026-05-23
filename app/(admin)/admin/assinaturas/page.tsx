"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  Crown,
  Users,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  UserPlus,
  Ban,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Edit3,
  Save,
  X,
  Activity,
} from "lucide-react";

type SubscriptionState =
  | "free"
  | "pending_payment"
  | "active"
  | "cancelled_pending_end"
  | "overdue";

interface UserSub {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cpfCnpj: string | null;
  isPremium: boolean;
  subscriptionEnd: string | null;
  asaasCustomerId: string | null;
  asaasSubscriptionId: string | null;
  createdAt: string;
  subscriptionState: SubscriptionState;
  paymentStatus: string | null;
  invoiceUrl: string | null;
  dueDate: string | null;
  cancelAtPeriodEnd: boolean;
  relevantPaymentId: string | null;
  lastSubscriptionId: string | null;
  lastWebhookEvent: string | null;
  lastWebhookEventAt: string | null;
  lastWebhookEventId: string | null;
  lastWebhookPaymentId: string | null;
}

interface Payment {
  id: string;
  userId: string;
  asaasPaymentId: string;
  asaasSubscriptionId?: string | null;
  status: string;
  billingType: string;
  amountCents: number;
  dueDate: string | null;
  paidAt: string | null;
  invoiceUrl: string | null;
  createdAt: string;
}

interface Stats {
  totalUsers: number;
  activeSubscribers: number;
  totalRevenue: number;
  mrr: number;
  overdueCount: number;
  pendingCount: number;
  churnedCount: number;
}

type Filter = "all" | "active" | "pending" | "cancelled" | "overdue";

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "border border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
  RECEIVED: "border border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
  RECEIVED_IN_CASH: "border border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
  PENDING: "border border-amber-500/25 bg-amber-500/15 text-amber-300",
  AWAITING_RISK_ANALYSIS: "border border-amber-500/25 bg-amber-500/15 text-amber-300",
  OVERDUE: "border border-red-500/25 bg-red-500/15 text-red-300",
  REFUNDED: "border border-slate-500/25 bg-slate-500/15 text-slate-300",
  REFUND_REQUESTED: "border border-orange-500/25 bg-orange-500/15 text-orange-300",
};

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmado",
  RECEIVED: "Recebido",
  RECEIVED_IN_CASH: "Recebido",
  PENDING: "Pendente",
  AWAITING_RISK_ANALYSIS: "Analisando",
  OVERDUE: "Vencido",
  REFUNDED: "Reembolsado",
  REFUND_REQUESTED: "Reembolso solicitado",
};

const SUBSCRIPTION_STATE_LABELS: Record<SubscriptionState, string> = {
  free: "Free",
  pending_payment: "Pendente",
  active: "Ativo",
  cancelled_pending_end: "Cancelado até o fim",
  overdue: "Em atraso",
};

const SUBSCRIPTION_STATE_COLORS: Record<SubscriptionState, string> = {
  free: "border border-slate-500/25 bg-slate-500/15 text-slate-300",
  pending_payment: "border border-sky-500/25 bg-sky-500/15 text-sky-300",
  active: "border border-emerald-500/25 bg-emerald-500/15 text-emerald-300",
  cancelled_pending_end: "border border-amber-500/25 bg-amber-500/15 text-amber-300",
  overdue: "border border-red-500/25 bg-red-500/15 text-red-300",
};

function formatCurrency(cents: number) {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 30) return `${days}d atrás`;
  const months = Math.floor(days / 30);
  return `${months}m atrás`;
}

function getActionSuccessText(action: string, data: Record<string, unknown>) {
  if (action === "cancel") {
    return data.cancelAtPeriodEnd
      ? "Recorrência cancelada. O acesso segue até o fim do período pago."
      : "Assinatura cancelada com sucesso.";
  }
  if (action === "create") {
    return data.reusedSubscription
      ? "Cobrança existente reaproveitada com sucesso."
      : "Assinatura criada com sucesso.";
  }
  if (action === "grant-premium") return "Premium concedido com sucesso.";
  if (action === "revoke-premium") return "Premium revogado com sucesso.";
  if (action === "update-value") return "Valor da assinatura atualizado com sucesso.";
  return "Ação realizada com sucesso.";
}

export default function AssinaturasPage() {
  const [users, setUsers] = useState<UserSub[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<{ subId: string; value: string } | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("filter", filter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/subscriptions?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar dados");
      setUsers(data.users);
      setPayments(data.payments);
      setStats(data.stats);
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "Erro ao carregar assinaturas",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  async function handleAction(action: string, payload: Record<string, unknown>) {
    const key = `${action}-${payload.userId || payload.subscriptionId}`;
    setActionLoading(key);
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro");
      setMessage({ text: getActionSuccessText(action, data), type: "success" });
      await fetchData();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Erro", type: "error" });
    } finally {
      setActionLoading(null);
    }
  }

  function getUserPayments(userId: string) {
    return payments.filter((payment) => payment.userId === userId);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
          <CreditCard className="w-6 h-6" />
          Assinaturas & Pagamentos
        </h1>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white transition hover:border-orange-500/40 hover:bg-orange-500/10 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg flex items-center gap-2 border ${
          message.type === "success"
            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
            : "border-red-500/25 bg-red-500/10 text-red-300"
        }`}>
          {message.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
          <StatCard icon={Users} label="Usuários" value={String(stats.totalUsers)} />
          <StatCard icon={Crown} label="Ativos" value={String(stats.activeSubscribers)} color="text-amber-300" />
          <StatCard icon={Clock} label="Pendentes" value={String(stats.pendingCount)} color="text-sky-300" />
          <StatCard icon={AlertCircle} label="Vencidos" value={String(stats.overdueCount)} color="text-red-300" />
          <StatCard icon={Ban} label="Cancelados" value={String(stats.churnedCount)} color="text-orange-300" />
          <StatCard icon={DollarSign} label="MRR" value={formatCurrency(stats.mrr)} color="text-emerald-300" />
          <StatCard icon={TrendingUp} label="Receita" value={formatCurrency(stats.totalRevenue)} color="text-green-300" />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-10 pr-4 text-white placeholder:text-slate-500 outline-none transition focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "active", "pending", "cancelled", "overdue"] as Filter[]).map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === item
                  ? "bg-orange-500 text-white"
                  : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {item === "all" && "Todos"}
              {item === "active" && "Ativos"}
              {item === "pending" && "Pendentes"}
              {item === "cancelled" && "Cancelados"}
              {item === "overdue" && "Vencidos"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0f1117] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/[0.04] text-left text-sm font-medium text-slate-400">
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Cobrança</th>
                <th className="px-4 py-3">Acesso</th>
                <th className="px-4 py-3">Webhook</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Carregando...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Nenhum resultado encontrado
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    payments={getUserPayments(user.id)}
                    expanded={expandedUser === user.id}
                    onToggle={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                    onAction={handleAction}
                    actionLoading={actionLoading}
                    editingValue={editingValue}
                    onEditValue={setEditingValue}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color || "text-slate-400"}`} />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <p className={`text-xl font-bold ${color || "text-white"}`}>{value}</p>
    </div>
  );
}

function UserRow({
  user,
  payments,
  expanded,
  onToggle,
  onAction,
  actionLoading,
  editingValue,
  onEditValue,
}: {
  user: UserSub;
  payments: Payment[];
  expanded: boolean;
  onToggle: () => void;
  onAction: (action: string, payload: Record<string, unknown>) => void;
  actionLoading: string | null;
  editingValue: { subId: string; value: string } | null;
  onEditValue: (value: { subId: string; value: string } | null) => void;
}) {
  const editableSubscriptionId = user.asaasSubscriptionId || user.lastSubscriptionId;
  const isEditing = editingValue?.subId === editableSubscriptionId;
  const canCreateSubscription = user.subscriptionState === "free" && !user.asaasSubscriptionId;
  const canCancelSubscription = Boolean(user.asaasSubscriptionId);

  return (
    <>
      <tr className="cursor-pointer text-slate-200 transition hover:bg-white/[0.04]" onClick={onToggle}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10 text-sm font-bold text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{user.name}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="space-y-1">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${SUBSCRIPTION_STATE_COLORS[user.subscriptionState]}`}>
              {user.isPremium && <Crown className="w-3 h-3" />}
              {SUBSCRIPTION_STATE_LABELS[user.subscriptionState]}
            </span>
            {user.cancelAtPeriodEnd && (
              <p className="text-[11px] text-amber-300">sem nova recorrência</p>
            )}
          </div>
        </td>
        <td className="px-4 py-3 text-sm">
          <div className="space-y-1">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[user.paymentStatus || ""] || "border border-white/10 bg-white/10 text-slate-300"}`}>
              {STATUS_LABELS[user.paymentStatus || ""] || user.paymentStatus || "Sem cobrança"}
            </span>
            <div className="text-xs text-slate-400">
              {user.dueDate ? `Vence ${formatDate(user.dueDate)}` : user.invoiceUrl ? "Cobrança disponível" : "-"}
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-sm">
          {user.subscriptionEnd ? (
            <span className={new Date(user.subscriptionEnd) < new Date() ? "text-red-300" : "text-emerald-300"}>
              {formatDate(user.subscriptionEnd)}
            </span>
          ) : (
            <span className="text-slate-500">-</span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-slate-300">
          {user.lastWebhookEvent ? (
            <div>
              <p className="font-medium text-xs">{user.lastWebhookEvent}</p>
              <p className="text-[11px] text-slate-500">{user.lastWebhookEventAt ? timeAgo(user.lastWebhookEventAt) : "-"}</p>
            </div>
          ) : (
            <span className="text-slate-500">-</span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            {!user.isPremium && (
              <button
                onClick={() => onAction("grant-premium", { userId: user.id })}
                disabled={actionLoading === `grant-premium-${user.id}`}
                className="rounded border border-emerald-500/25 bg-emerald-500/15 px-2 py-1 text-xs text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50"
                title="Dar Premium 1 mês"
              >
                <UserPlus className="w-3 h-3" />
              </button>
            )}
            {user.isPremium && (
              <button
                onClick={() => onAction("revoke-premium", { userId: user.id })}
                disabled={actionLoading === `revoke-premium-${user.id}`}
                className="rounded border border-red-500/25 bg-red-500/15 px-2 py-1 text-xs text-red-300 transition hover:bg-red-500/25 disabled:opacity-50"
                title="Revogar Premium"
              >
                <XCircle className="w-3 h-3" />
              </button>
            )}
            {canCreateSubscription && (
              <button
                onClick={() => onAction("create", { userId: user.id })}
                disabled={actionLoading === `create-${user.id}`}
                className="rounded border border-sky-500/25 bg-sky-500/15 px-2 py-1 text-xs text-sky-300 transition hover:bg-sky-500/25 disabled:opacity-50"
                title="Criar assinatura Asaas"
              >
                <CreditCard className="w-3 h-3" />
              </button>
            )}
            {canCancelSubscription && (
              <button
                onClick={() => onAction("cancel", { userId: user.id })}
                disabled={actionLoading === `cancel-${user.id}`}
                className="rounded border border-orange-500/25 bg-orange-500/15 px-2 py-1 text-xs text-orange-300 transition hover:bg-orange-500/25 disabled:opacity-50"
                title="Cancelar recorrência"
              >
                <Ban className="w-3 h-3" />
              </button>
            )}
            {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="bg-black/30 px-4 py-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <InfoCard label="Telefone" value={user.phone || "-"} />
                <InfoCard label="CPF" value={user.cpfCnpj || "-"} />
                <InfoCard label="Customer Asaas" value={user.asaasCustomerId || "-"} mono />
                <InfoCard label="Subscription atual" value={user.asaasSubscriptionId || "-"} mono />
                <InfoCard label="Última subscription" value={user.lastSubscriptionId || "-"} mono />
                <InfoCard label="Payment relevante" value={user.relevantPaymentId || "-"} mono />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.04] p-3">
                  <p className="font-medium text-white">Resumo do estado</p>
                  <p className="text-slate-400">Estado: <strong className="text-slate-200">{SUBSCRIPTION_STATE_LABELS[user.subscriptionState]}</strong></p>
                  <p className="text-slate-400">Status da cobrança: <strong className="text-slate-200">{STATUS_LABELS[user.paymentStatus || ""] || user.paymentStatus || "-"}</strong></p>
                  <p className="text-slate-400">Fim do período: <strong className="text-slate-200">{formatDate(user.subscriptionEnd)}</strong></p>
                  <p className="text-slate-400">Vencimento atual: <strong className="text-slate-200">{formatDate(user.dueDate)}</strong></p>
                  {user.invoiceUrl && (
                    <a
                      href={user.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sky-300 hover:text-sky-200"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Abrir cobrança atual
                    </a>
                  )}
                </div>

                <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.04] p-3">
                  <p className="flex items-center gap-2 font-medium text-white">
                    <Activity className="w-4 h-4" />
                    Último webhook
                  </p>
                  <p className="text-slate-400">Evento: <strong className="text-slate-200">{user.lastWebhookEvent || "-"}</strong></p>
                  <p className="text-slate-400">Quando: <strong className="text-slate-200">{user.lastWebhookEventAt ? formatDate(user.lastWebhookEventAt) : "-"}</strong></p>
                  <p className="text-slate-400">Webhook ID: <span className="font-mono text-xs text-slate-300">{user.lastWebhookEventId || "-"}</span></p>
                  <p className="text-slate-400">Payment do webhook: <span className="font-mono text-xs text-slate-300">{user.lastWebhookPaymentId || "-"}</span></p>
                </div>
              </div>

              {editableSubscriptionId && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-slate-400">Alterar valor:</span>
                  {isEditing ? (
                    <>
                      <input
                        type="number"
                        step="0.01"
                        value={editingValue?.value || ""}
                        onChange={(e) => onEditValue({ subId: editableSubscriptionId, value: e.target.value })}
                        className="w-24 rounded border border-white/10 bg-black/40 px-2 py-1 text-sm text-white outline-none focus:border-orange-500/60"
                        placeholder="56.90"
                      />
                      <button
                        onClick={() => {
                          onAction("update-value", {
                            subscriptionId: editableSubscriptionId,
                            value: parseFloat(editingValue?.value || "0"),
                          });
                          onEditValue(null);
                        }}
                        className="rounded border border-emerald-500/25 bg-emerald-500/15 p-1 text-emerald-300 hover:bg-emerald-500/25"
                      >
                        <Save className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onEditValue(null)}
                        className="rounded border border-white/10 bg-white/10 p-1 text-slate-300 hover:bg-white/15"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => onEditValue({ subId: editableSubscriptionId, value: "56.90" })}
                      className="flex items-center gap-1 rounded border border-sky-500/25 bg-sky-500/15 px-2 py-1 text-xs text-sky-300 hover:bg-sky-500/25"
                    >
                      <Edit3 className="w-3 h-3" /> Editar preço
                    </button>
                  )}
                </div>
              )}

              <div>
                <h4 className="mb-2 text-sm font-medium text-white">Histórico de Pagamentos</h4>
                {payments.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhum pagamento registrado</p>
                ) : (
                  <div className="space-y-2">
                    {payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm md:flex-row md:items-center md:justify-between"
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[payment.status] || "border border-white/10 bg-white/10 text-slate-300"}`}>
                            {STATUS_LABELS[payment.status] || payment.status}
                          </span>
                          <span className="font-medium text-white">{formatCurrency(payment.amountCents)}</span>
                          <span className="text-slate-400">{payment.billingType}</span>
                          <span className="font-mono text-xs text-slate-500">{payment.asaasPaymentId}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-slate-400">
                            {payment.paidAt ? `Pago ${formatDate(payment.paidAt)}` : `Vence ${formatDate(payment.dueDate)}`}
                          </span>
                          {payment.invoiceUrl && (
                            <a
                              href={payment.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sky-300 hover:text-sky-200"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function InfoCard({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <p className="mb-1 text-xs text-slate-500">{label}</p>
      <p className={mono ? "break-all font-mono text-xs text-slate-200" : "text-sm text-slate-200"}>{value}</p>
    </div>
  );
}
