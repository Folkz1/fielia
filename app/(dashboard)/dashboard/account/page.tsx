"use client";

import { useState, useEffect } from "react";
import { CreditCard, Crown, ShieldCheck, User, Loader2, CheckCircle, AlertCircle, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-api";

type UserData = {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  cpfCnpj: string | null;
  isPremium: boolean;
  subscriptionEnd: string | null;
  hasSubscription: boolean;
  createdAt: string;
  totalPoints: number | null;
};


const BENEFITS = [
  "Newsletter diária com curadoria",
  "Quiz semanal com pontuação extra",
  "Memes exclusivos do Timão",
  "Prioridade nas respostas da IA",
];

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function AccountPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [subMsg, setSubMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");

  const { createSubscription, cancelSubscription, isProcessing } = useSubscription();

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch("/api/user/me");
        if (meRes.ok) {
          const data: UserData = await meRes.json();
          setUser(data);
          setName(data.name || "");
          setPhone(data.phone ? formatPhone(data.phone) : "");
          setCpfCnpj(data.cpfCnpj ? formatCpf(data.cpfCnpj) : "");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const body: Record<string, string> = {};
      if (name !== user?.name) body.name = name;
      if (phone.replace(/\D/g, "") !== (user?.phone || "")) body.phone = phone;
      if (cpfCnpj.replace(/\D/g, "") !== (user?.cpfCnpj || "")) body.cpfCnpj = cpfCnpj;

      if (Object.keys(body).length === 0) {
        setSaveMsg({ type: "ok", text: "Nenhuma alteração detectada." });
        return;
      }

      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao salvar");
      setUser((prev) => prev ? { ...prev, ...data } : prev);
      setSaveMsg({ type: "ok", text: "Dados atualizados com sucesso!" });
    } catch (e) {
      setSaveMsg({ type: "err", text: e instanceof Error ? e.message : "Erro ao salvar" });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 4000);
    }
  }

  async function handleSubscribe() {
    setSubMsg(null);
    setInvoiceUrl(null);
    const cpf = cpfCnpj.replace(/\D/g, "");
    if (!cpf || cpf.length < 11) {
      setSubMsg({ type: "err", text: "Informe seu CPF no campo acima antes de assinar." });
      return;
    }
    try {
      const result = await createSubscription(cpf);
      if (result?.invoiceUrl) {
        setInvoiceUrl(result.invoiceUrl);
        setSubMsg({ type: "ok", text: "Assinatura criada! Clique abaixo para pagar." });
      } else {
        setSubMsg({ type: "ok", text: "Assinatura criada com sucesso!" });
      }
      setUser((prev) => prev ? { ...prev, hasSubscription: true } : prev);
    } catch (e) {
      setSubMsg({ type: "err", text: e instanceof Error ? e.message : "Erro ao assinar" });
    }
  }

  async function handleCancel() {
    if (!confirm("Tem certeza que deseja cancelar sua assinatura premium?")) return;
    setSubMsg(null);
    try {
      await cancelSubscription();
      setUser((prev) => prev ? { ...prev, isPremium: false, hasSubscription: false } : prev);
      setSubMsg({ type: "ok", text: "Assinatura cancelada." });
    } catch (e) {
      setSubMsg({ type: "err", text: e instanceof Error ? e.message : "Erro ao cancelar" });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  const isPremium = user?.isPremium;
  const subEnd = user?.subscriptionEnd ? new Date(user.subscriptionEnd).toLocaleDateString("pt-BR") : null;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading text-white">Conta</h1>
          <p className="text-gray-400 mt-2">Gerencie seu perfil, assinatura e histórico.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Perfil */}
        <section className="card-corinthians lg:col-span-2 space-y-6">
          <div className="flex items-center gap-3 text-corinthians-gold">
            <User className="w-5 h-5" />
            <h2 className="font-heading text-2xl">Perfil do Torcedor</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400">Nome</label>
              <input
                className="w-full mt-2 rounded-lg bg-corinthians-gray-dark border border-gray-700 px-3 py-2 text-white focus:outline-none focus:border-yellow-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Email</label>
              <input
                className="w-full mt-2 rounded-lg bg-corinthians-gray-dark border border-gray-700 px-3 py-2 text-gray-500 cursor-not-allowed"
                value={user?.email || ""}
                readOnly
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Telefone</label>
              <input
                className="w-full mt-2 rounded-lg bg-corinthians-gray-dark border border-gray-700 px-3 py-2 text-white focus:outline-none focus:border-yellow-500"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">
                CPF <span className="text-yellow-500">(necessário para assinar)</span>
              </label>
              <input
                className="w-full mt-2 rounded-lg bg-corinthians-gray-dark border border-gray-700 px-3 py-2 text-white focus:outline-none focus:border-yellow-500"
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(formatCpf(e.target.value))}
                placeholder="000.000.000-00"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar dados
            </Button>
            {saveMsg && (
              <span className={`text-sm flex items-center gap-1 ${saveMsg.type === "ok" ? "text-green-400" : "text-red-400"}`}>
                {saveMsg.type === "ok" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {saveMsg.text}
              </span>
            )}
          </div>
        </section>

        {/* Plano */}
        <section className="card-corinthians space-y-4">
          <div className="flex items-center gap-3 text-corinthians-gold">
            <Crown className="w-5 h-5" />
            <h2 className="font-heading text-2xl">Plano atual</h2>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Status</span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isPremium ? "bg-green-500/20 text-green-300" : "bg-gray-500/20 text-gray-400"}`}>
              {isPremium ? "Premium ativo" : "Gratuito"}
            </span>
          </div>

          {subEnd && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Renovação</span>
              <span className="text-sm text-white">{subEnd}</span>
            </div>
          )}

          <div className="border-t border-white/10 pt-4">
            <p className="text-xs text-gray-400 mb-3">Benefícios premium</p>
            <ul className="space-y-2 text-sm text-gray-300">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <ShieldCheck className={`w-4 h-4 ${isPremium ? "text-corinthians-gold" : "text-gray-600"}`} />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          {subMsg && (
            <div className={`text-sm flex items-start gap-2 p-2 rounded-lg ${subMsg.type === "ok" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
              {subMsg.type === "ok" ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
              {subMsg.text}
            </div>
          )}

          {invoiceUrl && (
            <a
              href={invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center px-4 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-lg transition-colors text-sm"
            >
              Pagar agora
            </a>
          )}

          {!isPremium && (
            <Button className="w-full" onClick={handleSubscribe} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Assinar Premium – R$56,90/mês
            </Button>
          )}

          {isPremium && (
            <Button variant="secondary" className="w-full" onClick={handleCancel} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Cancelar plano
            </Button>
          )}
        </section>
      </div>

      {/* Pontuação */}
      <section className="card-corinthians">
        <div className="flex items-center gap-3 text-corinthians-gold mb-4">
          <Trophy className="w-5 h-5" />
          <h2 className="font-heading text-2xl">Pontuação no Quiz</h2>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-4xl font-bold text-corinthians-gold">{user?.totalPoints ?? 0}</p>
            <p className="text-xs text-gray-400 mt-1">pontos totais</p>
          </div>
          <div className="text-sm text-gray-400">
            <p>Participe dos quizzes semanais para acumular pontos e subir no ranking da Fiel!</p>
          </div>
        </div>
      </section>
    </div>
  );
}
