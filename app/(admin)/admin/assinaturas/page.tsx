"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CreditCard, Crown, Users, TrendingUp, AlertCircle, RefreshCw,
  Search, CheckCircle, XCircle, Clock, DollarSign, UserPlus, Ban,
  ExternalLink, ChevronDown, ChevronUp, Edit3, Save, X
} from "lucide-react";

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
}

interface Payment {
  id: string;
  userId: string;
  asaasPaymentId: string;
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
  churnedCount: number;
}

type Filter = "all" | "active" | "cancelled" | "overdue";

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-green-100 text-green-800",
  RECEIVED: "bg-green-100 text-green-800",
  RECEIVED_IN_CASH: "bg-green-100 text-green-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  AWAITING_RISK_ANALYSIS: "bg-yellow-100 text-yellow-800",
  OVERDUE: "bg-red-100 text-red-800",
  REFUNDED: "bg-gray-100 text-gray-800",
  REFUND_REQUESTED: "bg-orange-100 text-orange-800",
};

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmado",
  RECEIVED: "Recebido",
  RECEIVED_IN_CASH: "Recebido",
  PENDING: "Pendente",
  AWAITING_RISK_ANALYSIS: "Analisando",
  OVERDUE: "Vencido",
  REFUNDED: "Reembolsado",
  REFUND_REQUESTED: "Reembolso Solicitado",
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
      if (!res.ok) throw new Error("Erro ao carregar dados");
      const data = await res.json();
      setUsers(data.users);
      setPayments(data.payments);
      setStats(data.stats);
    } catch {
      setMessage({ text: "Erro ao carregar assinaturas", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(t);
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
      setMessage({ text: `${action} realizado com sucesso`, type: "success" });
      fetchData();
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Erro", type: "error" });
    } finally {
      setActionLoading(null);
    }
  }

  function getUserPayments(userId: string) {
    return payments.filter((p) => p.userId === userId);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="w-6 h-6" />
          Assinaturas & Pagamentos
        </h1>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg flex items-center gap-2 ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {message.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard icon={Users} label="Total Usuários" value={String(stats.totalUsers)} />
          <StatCard icon={Crown} label="Assinantes Ativos" value={String(stats.activeSubscribers)} color="text-yellow-600" />
          <StatCard icon={DollarSign} label="MRR" value={formatCurrency(stats.mrr)} color="text-green-600" />
          <StatCard icon={TrendingUp} label="Receita Total" value={formatCurrency(stats.totalRevenue)} color="text-blue-600" />
          <StatCard icon={Clock} label="Vencidos" value={String(stats.overdueCount)} color="text-orange-600" />
          <StatCard icon={Ban} label="Cancelados" value={String(stats.churnedCount)} color="text-red-600" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-black focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "active", "cancelled", "overdue"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? "bg-black text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
            >
              {f === "all" ? "Todos" : f === "active" ? "Ativos" : f === "cancelled" ? "Cancelados" : "Vencidos"}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-sm font-medium text-gray-500">
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Assinatura Asaas</th>
                <th className="px-4 py-3">Expira em</th>
                <th className="px-4 py-3">Cadastro</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Carregando...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
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

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${color || "text-gray-500"}`} />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className={`text-xl font-bold ${color || "text-gray-900"}`}>{value}</p>
    </div>
  );
}

function UserRow({
  user, payments, expanded, onToggle, onAction, actionLoading, editingValue, onEditValue,
}: {
  user: UserSub;
  payments: Payment[];
  expanded: boolean;
  onToggle: () => void;
  onAction: (action: string, payload: Record<string, unknown>) => void;
  actionLoading: string | null;
  editingValue: { subId: string; value: string } | null;
  onEditValue: (v: { subId: string; value: string } | null) => void;
}) {
  const isEditing = editingValue?.subId === user.asaasSubscriptionId;

  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer" onClick={onToggle}>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-sm">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          {user.isPremium ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
              <Crown className="w-3 h-3" /> Premium
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
              Free
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {user.asaasSubscriptionId ? (
            <span className="font-mono text-xs">{user.asaasSubscriptionId.slice(0, 16)}...</span>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </td>
        <td className="px-4 py-3 text-sm">
          {user.subscriptionEnd ? (
            <span className={new Date(user.subscriptionEnd) < new Date() ? "text-red-600" : "text-green-600"}>
              {formatDate(user.subscriptionEnd)}
            </span>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">{timeAgo(user.createdAt)}</td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            {!user.isPremium ? (
              <>
                <button
                  onClick={() => onAction("grant-premium", { userId: user.id })}
                  disabled={actionLoading === `grant-premium-${user.id}`}
                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                  title="Dar Premium 1 mês"
                >
                  <UserPlus className="w-3 h-3" />
                </button>
                {!user.asaasSubscriptionId && (
                  <button
                    onClick={() => onAction("create", { userId: user.id })}
                    disabled={actionLoading === `create-${user.id}`}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                    title="Criar assinatura Asaas"
                  >
                    <CreditCard className="w-3 h-3" />
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => onAction("revoke-premium", { userId: user.id })}
                disabled={actionLoading === `revoke-premium-${user.id}`}
                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                title="Revogar Premium"
              >
                <XCircle className="w-3 h-3" />
              </button>
            )}
            {user.asaasSubscriptionId && (
              <button
                onClick={() => onAction("cancel", { userId: user.id })}
                disabled={actionLoading === `cancel-${user.id}`}
                className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 disabled:opacity-50"
                title="Cancelar assinatura"
              >
                <Ban className="w-3 h-3" />
              </button>
            )}
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="bg-gray-50 px-4 py-4">
            <div className="space-y-3">
              {/* User Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Telefone:</span>{" "}
                  <span className="font-medium">{user.phone || "-"}</span>
                </div>
                <div>
                  <span className="text-gray-500">CPF:</span>{" "}
                  <span className="font-medium">{user.cpfCnpj || "-"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Customer Asaas:</span>{" "}
                  <span className="font-mono text-xs">{user.asaasCustomerId || "-"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Subscription:</span>{" "}
                  <span className="font-mono text-xs">{user.asaasSubscriptionId || "-"}</span>
                </div>
              </div>

              {/* Edit Value */}
              {user.asaasSubscriptionId && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Alterar valor:</span>
                  {isEditing ? (
                    <>
                      <input
                        type="number"
                        step="0.01"
                        value={editingValue?.value || ""}
                        onChange={(e) => onEditValue({ subId: user.asaasSubscriptionId!, value: e.target.value })}
                        className="w-24 px-2 py-1 border rounded text-sm"
                        placeholder="56.90"
                      />
                      <button
                        onClick={() => {
                          onAction("update-value", {
                            subscriptionId: user.asaasSubscriptionId,
                            value: parseFloat(editingValue?.value || "0"),
                          });
                          onEditValue(null);
                        }}
                        className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        <Save className="w-3 h-3" />
                      </button>
                      <button onClick={() => onEditValue(null)} className="p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => onEditValue({ subId: user.asaasSubscriptionId!, value: "56.90" })}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      <Edit3 className="w-3 h-3" /> Editar preço
                    </button>
                  )}
                </div>
              )}

              {/* Payments */}
              <div>
                <h4 className="text-sm font-medium mb-2">Histórico de Pagamentos</h4>
                {payments.length === 0 ? (
                  <p className="text-sm text-gray-400">Nenhum pagamento registrado</p>
                ) : (
                  <div className="space-y-1">
                    {payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm border">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] || "bg-gray-100 text-gray-600"}`}>
                            {STATUS_LABELS[p.status] || p.status}
                          </span>
                          <span className="font-medium">{formatCurrency(p.amountCents)}</span>
                          <span className="text-gray-500">{p.billingType}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-500">
                            {p.paidAt ? `Pago ${formatDate(p.paidAt)}` : `Vence ${formatDate(p.dueDate)}`}
                          </span>
                          {p.invoiceUrl && (
                            <a href={p.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                              <ExternalLink className="w-3 h-3" />
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
