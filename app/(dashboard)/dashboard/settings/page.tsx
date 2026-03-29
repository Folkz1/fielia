"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, AlertTriangle, Palette, Save, ExternalLink } from "lucide-react";
import { useSubscription } from "@/hooks/use-api";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ThemeSelector } from "@/lib/theme-context";

type SubscriptionState =
  | "free"
  | "pending_payment"
  | "active"
  | "cancelled_pending_end"
  | "overdue";

type SubscriptionResponse = {
  userId: string;
  name: string;
  email: string;
  isPremium: boolean;
  subscriptionEnd: string | null;
  asaasSubscriptionId: string | null;
  subscriptionState: SubscriptionState;
  paymentStatus: string | null;
  invoiceUrl: string | null;
  dueDate: string | null;
  cancelAtPeriodEnd: boolean;
};

const fetcher = (url: string) =>
  fetch(url).then(async (res) => {
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  });

function formatCpf(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function getStateBadge(state: SubscriptionState) {
  if (state === "active") return <Badge className="badge-accent">ATIVO</Badge>;
  if (state === "cancelled_pending_end") {
    return <Badge className="border-yellow-500/30 bg-yellow-500/10 text-yellow-300">CANCELADO</Badge>;
  }
  if (state === "pending_payment") {
    return <Badge className="border-blue-500/30 bg-blue-500/10 text-blue-300">PENDENTE</Badge>;
  }
  if (state === "overdue") {
    return <Badge className="border-red-500/30 bg-red-500/10 text-red-300">EM ATRASO</Badge>;
  }
  return <Badge variant="outline" className="text-gray-400 border-gray-600">INATIVO</Badge>;
}

function SettingsPageInner() {
  const { createSubscription, cancelSubscription, isProcessing } = useSubscription();
  const searchParams = useSearchParams();
  const shouldAutoSubscribe = searchParams.get("subscribe") === "1";
  const autoSubscribeStartedRef = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [cpfInput, setCpfInput] = useState("");
  const [needsCpf, setNeedsCpf] = useState(false);
  const [savingCpf, setSavingCpf] = useState(false);

  const { data, mutate, isLoading } = useSWR<SubscriptionResponse>("/api/subscription", fetcher, {
    revalidateOnFocus: false,
  });

  const userId = data?.userId || "";
  const subscriptionState = data?.subscriptionState || "free";
  const isPremium = Boolean(data?.isPremium);
  const subscriptionEnd = data?.subscriptionEnd ? new Date(data.subscriptionEnd) : null;
  const dueDate = data?.dueDate ? new Date(data.dueDate) : null;
  const invoiceUrl = data?.invoiceUrl || null;
  const canCancelRecurring = Boolean(data?.asaasSubscriptionId);

  const handleSubscribe = useCallback(async (cpf?: string) => {
    try {
      setErrorMessage(null);
      setInfoMessage(null);
      const result = await createSubscription(cpf);

      setNeedsCpf(false);
      setInfoMessage(
        result?.reusedSubscription
          ? "Já existia uma cobrança aberta. Reaproveitamos a assinatura atual."
          : "Assinatura criada. Abra a cobrança para concluir o pagamento."
      );

      await mutate();

      if (result?.invoiceUrl) {
        window.location.href = result.invoiceUrl as string;
      }
    } catch (error) {
      console.error(error);
      const msg = error instanceof Error ? error.message : "Falha ao criar assinatura";
      setErrorMessage(msg);
      if (msg.toLowerCase().includes("cpf")) {
        setNeedsCpf(true);
      }
    }
  }, [createSubscription, mutate]);

  const handleCpfSubmit = async () => {
    const cpf = cpfInput.replace(/\D/g, "");
    if (cpf.length !== 11) {
      setErrorMessage("CPF inválido. Digite os 11 dígitos.");
      return;
    }

    setSavingCpf(true);
    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cpfCnpj: cpf }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "Não foi possível salvar o CPF.");
      }

      await handleSubscribe(cpf);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao salvar CPF.");
    } finally {
      setSavingCpf(false);
    }
  };

  useEffect(() => {
    if (!shouldAutoSubscribe) return;
    if (autoSubscribeStartedRef.current) return;
    if (!userId) return;
    if (subscriptionState !== "free") return;
    if (isProcessing || isLoading) return;

    autoSubscribeStartedRef.current = true;
    void handleSubscribe();
  }, [shouldAutoSubscribe, userId, subscriptionState, isProcessing, isLoading, handleSubscribe]);

  const handleCancel = async () => {
    try {
      setErrorMessage(null);
      setInfoMessage(null);
      const result = await cancelSubscription();
      setInfoMessage(
        result?.message ||
          "Recorrência cancelada. Seu acesso segue disponível até o fim do período pago."
      );
      await mutate();
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "Falha ao cancelar assinatura");
    }
  };

  const renderStateCard = () => {
    if (subscriptionState === "active") {
      return (
        <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-200">
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 text-green-400" />
            <p>
              {subscriptionEnd
                ? `Seu acesso premium está ativo até ${subscriptionEnd.toLocaleDateString("pt-BR")}.`
                : "Seu acesso premium está ativo."}
            </p>
          </div>
        </div>
      );
    }

    if (subscriptionState === "cancelled_pending_end") {
      return (
        <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100 space-y-2">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <p>
              {subscriptionEnd
                ? `A recorrência foi cancelada. Seu acesso premium segue ativo até ${subscriptionEnd.toLocaleDateString("pt-BR")}.`
                : "A recorrência foi cancelada e o acesso segue ativo até o fim do período pago."}
            </p>
          </div>
          <p className="text-xs text-yellow-200/90">
            Não haverá nova cobrança automática enquanto esse estado estiver ativo.
          </p>
        </div>
      );
    }

    if (subscriptionState === "pending_payment" || subscriptionState === "overdue") {
      const isOverdue = subscriptionState === "overdue";
      return (
        <div className={`mb-4 rounded-lg border p-4 text-sm space-y-2 ${
          isOverdue
            ? "border-red-500/30 bg-red-500/10 text-red-100"
            : "border-blue-500/30 bg-blue-500/10 text-blue-100"
        }`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className={`w-5 h-5 ${isOverdue ? "text-red-400" : "text-blue-400"}`} />
            <p>
              {isOverdue
                ? "Existe uma cobrança vencida para sua assinatura."
                : "Sua assinatura foi criada e está aguardando pagamento."}
            </p>
          </div>
          {data?.paymentStatus && <p>Status atual: <strong>{data.paymentStatus}</strong></p>}
          {dueDate && <p>Vencimento: <strong>{dueDate.toLocaleDateString("pt-BR")}</strong></p>}
          {invoiceUrl && (
            <a
              href={invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/20"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir cobrança
            </a>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="p-8 animate-fade-in max-w-4xl mx-auto">
      <h1 className="text-4xl font-heading text-white mb-8">Configurações & Assinatura</h1>

      <div className="grid gap-8">
        <Card className="bg-corinthians-gray-dark border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Aparência
            </CardTitle>
            <CardDescription className="text-gray-400">
              Personalize as cores do app
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeSelector />
          </CardContent>
        </Card>

        <Card className={`border-2 transition-all ${
          isPremium
            ? "border-[var(--gradient-accent-start)] bg-[var(--gradient-accent-start)]/10"
            : "border-gray-800 bg-corinthians-gray-dark"
        }`}>
          <CardHeader>
            <div className="flex justify-between items-start gap-4">
              <div>
                <CardTitle className="text-2xl text-white flex items-center gap-2">
                  <Crown className={`w-6 h-6 ${isPremium ? "text-[var(--gradient-accent-start)]" : "text-gray-500"}`} />
                  Plano Fiel Torcedor Digital
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Tenha acesso exclusivo a recursos premium
                </CardDescription>
              </div>
              {getStateBadge(subscriptionState)}
            </div>
          </CardHeader>
          <CardContent>
            {errorMessage && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                {errorMessage}
              </div>
            )}

            {infoMessage && (
              <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">
                {infoMessage}
              </div>
            )}

            {renderStateCard()}

            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-3xl font-bold text-white mb-2">
                    R$ 56,90<span className="text-sm text-gray-400 font-normal">/mês</span>
                  </p>
                  <p className="text-[var(--gradient-accent-start)] text-sm font-semibold mb-4">
                    Acesso premium com cobrança mensal
                  </p>

                  <ul className="space-y-2">
                    {[
                      "Inteligência Artificial ilimitada",
                      "Sem anúncios",
                      "Sorteios de camisas oficiais",
                      "Badge exclusiva de apoiador",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-gray-300 text-sm">
                        <Check className="w-4 h-4 text-[var(--gradient-accent-start)]" /> {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-black/30 rounded-lg p-4 flex flex-col justify-center items-center text-center">
                  <Crown className="w-12 h-12 text-[var(--gradient-accent-start)] mb-3" />
                  <p className="text-white font-semibold mb-1">Seja Fiel de verdade</p>
                  <p className="text-xs text-gray-400 mb-4">
                    Apoie o desenvolvimento e acompanhe seu billing sem surpresa.
                  </p>

                  {needsCpf ? (
                    <div className="w-full space-y-2">
                      <p className="text-xs text-yellow-400 font-medium">Informe seu CPF para continuar:</p>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={cpfInput}
                        onChange={(e) => setCpfInput(formatCpf(e.target.value))}
                        placeholder="000.000.000-00"
                        className="w-full rounded-lg border border-gray-600 bg-black/40 px-3 py-2 text-center text-white text-sm focus:outline-none focus:border-yellow-500"
                      />
                      <Button
                        className="w-full btn-primary"
                        onClick={handleCpfSubmit}
                        disabled={isProcessing || savingCpf || cpfInput.replace(/\D/g, "").length !== 11}
                      >
                        {isProcessing || savingCpf ? <LoadingSpinner size="sm" /> : "Confirmar e assinar"}
                      </Button>
                    </div>
                  ) : subscriptionState === "free" ? (
                    <Button
                      className="w-full btn-primary"
                      onClick={() => handleSubscribe()}
                      disabled={isProcessing || isLoading}
                    >
                      {isProcessing ? <LoadingSpinner size="sm" /> : "Assinar no cartão"}
                    </Button>
                  ) : invoiceUrl && (subscriptionState === "pending_payment" || subscriptionState === "overdue") ? (
                    <a
                      href={invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full rounded-lg bg-white text-black font-semibold py-2.5 text-sm hover:bg-zinc-100 transition-colors"
                    >
                      Abrir cobrança
                    </a>
                  ) : null}

                  {canCancelRecurring && (
                    <Button
                      variant="destructive"
                      className="w-full mt-3"
                      onClick={handleCancel}
                      disabled={isProcessing || isLoading}
                    >
                      {isProcessing ? <LoadingSpinner size="sm" /> : "Cancelar recorrência"}
                    </Button>
                  )}

                  <p className="text-[10px] text-gray-500 mt-2">
                    Cancelamento encerra a recorrência e mantém o acesso até o fim do período pago.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <UserDataCard data={data} userId={userId} onSaved={() => mutate()} />
      </div>
    </div>
  );
}

function UserDataCard({
  data,
  userId,
  onSaved,
}: {
  data?: SubscriptionResponse;
  userId: string;
  onSaved: () => void;
}) {
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (data && !initialized) {
      setEditName(data.name || "");
      setEditEmail(data.email || "");
      setInitialized(true);
    }
  }, [data, initialized]);

  const hasChanges =
    editName.trim() !== (data?.name || "") ||
    editEmail.trim().toLowerCase() !== (data?.email || "").toLowerCase();

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const body: Record<string, string> = {};
      if (editName.trim() !== (data?.name || "")) body.name = editName.trim();
      if (editEmail.trim().toLowerCase() !== (data?.email || "").toLowerCase()) {
        body.email = editEmail.trim();
      }

      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao salvar");
      }

      setSaveMsg({ type: "ok", text: "Dados atualizados com sucesso!" });
      onSaved();
    } catch (error) {
      setSaveMsg({ type: "err", text: error instanceof Error ? error.message : "Erro ao salvar" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-corinthians-gray-dark border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Seus Dados</CardTitle>
        <CardDescription className="text-gray-400">
          Edite seu nome e email abaixo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Nome</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-black/40 px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors"
              placeholder="Seu nome"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Email</label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-black/40 px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-500 transition-colors"
              placeholder="seu@email.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">ID</label>
            <p className="text-gray-400 font-mono text-xs py-2">{userId || "-"}</p>
          </div>
        </div>

        {saveMsg && (
          <div
            className={`rounded-lg border p-3 text-sm ${
              saveMsg.type === "ok"
                ? "border-green-500/30 bg-green-500/10 text-green-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            {saveMsg.text}
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || !hasChanges} className="btn-primary">
            {saving ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar alterações
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 flex justify-center"><LoadingSpinner /></div>}>
      <SettingsPageInner />
    </Suspense>
  );
}
