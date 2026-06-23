"use client";

import { useState, useEffect } from "react";
import { CreditCard, User, Mail, Phone, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { FielLogo } from "@/components/fiel-logo";
import { track } from "@/lib/track";

function formatCPF(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export default function AssinarPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    track("checkout_view");
  }, []);

  function handleCPF(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, cpf: formatCPF(e.target.value) }));
  }

  function handlePhone(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, phone: formatPhone(e.target.value) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accepted) {
      setError("Você precisa aceitar os Termos de Uso e a Política de Privacidade para continuar.");
      return;
    }
    setError("");
    setLoading(true);
    track("checkout_submit");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.replace(/\D/g, ""),
          cpf: form.cpf.replace(/\D/g, ""),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao processar. Tente novamente.");
        return;
      }

      if (data.invoiceUrl) {
        window.location.href = data.invoiceUrl;
      } else {
        setError("URL de pagamento não retornada. Entre em contato com o suporte.");
      }
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Botão de login no topo */}
        <div className="flex justify-end mb-4">
          <a
            href="/auth/login"
            className="text-zinc-400 hover:text-white text-sm border border-zinc-700 hover:border-zinc-500 rounded-lg px-4 py-2 transition-colors"
          >
            Já sou Premium → Entrar
          </a>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <FielLogo className="mb-4" priority />
          <h1 className="text-3xl font-bold text-white tracking-widest mb-2">FIEL.IA</h1>
          <p className="text-zinc-400 text-sm tracking-wider uppercase">Premium Mensal</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8">
          {/* Plan summary */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-white font-semibold">Plano Premium</p>
              <p className="text-zinc-400 text-sm">Acesso completo à IA do Corinthians</p>
            </div>
            <div className="text-right">
              <p className="text-white text-xl font-bold">R$ 56,90</p>
              <p className="text-zinc-500 text-xs">/mês</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nome */}
            <div>
              <label className="block text-zinc-400 text-sm mb-1.5">Nome completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Seu nome"
                  className="w-full bg-black border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-zinc-400 text-sm mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="seu@email.com"
                  className="w-full bg-black border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
                />
              </div>
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-zinc-400 text-sm mb-1.5">WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={handlePhone}
                  placeholder="(11) 99999-9999"
                  className="w-full bg-black border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
                />
              </div>
            </div>

            {/* CPF */}
            <div>
              <label className="block text-zinc-400 text-sm mb-1.5">CPF</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  required
                  value={form.cpf}
                  onChange={handleCPF}
                  placeholder="000.000.000-00"
                  className="w-full bg-black border border-zinc-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
                />
              </div>
              <p className="text-zinc-500 text-xs mt-1.5">
                Usado apenas para a emissão da cobrança via Asaas. Não guardamos dados do seu cartão.
              </p>
            </div>

            {/* Consentimento — Termos, Privacidade e contato */}
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-orange-600"
              />
              <span className="text-zinc-400 text-xs leading-relaxed">
                Li e aceito os{" "}
                <a href="/termos" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 underline">Termos de Uso</a>{" "}
                e a{" "}
                <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 underline">Política de Privacidade</a>, e autorizo o contato por e-mail e WhatsApp para acesso e suporte.
              </span>
            </label>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !accepted}
              className="w-full bg-white text-black font-bold py-3.5 rounded-xl text-base hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  Ir para o Pagamento
                </>
              )}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center gap-2 text-zinc-500 text-xs">
              <CheckCircle className="w-3.5 h-3.5 text-zinc-600" />
              <span>Pagamento seguro via cartão de crédito (Asaas)</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-500 text-xs">
              <CheckCircle className="w-3.5 h-3.5 text-zinc-600" />
              <span>Cancele a qualquer momento</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-500 text-xs">
              <CheckCircle className="w-3.5 h-3.5 text-zinc-600" />
              <span>Acesso por email + WhatsApp após confirmação</span>
            </div>
          </div>

          {/* Aviso pós-pagamento */}
          <div className="mt-5 flex items-start gap-3 bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
            <Mail className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
            <p className="text-orange-300 text-xs leading-relaxed">
              <strong className="text-orange-400">Após confirmar o pagamento:</strong> verifique seu e-mail para receber o link de acesso à plataforma. Também enviaremos uma mensagem no seu WhatsApp.
            </p>
          </div>
        </div>

        <p className="text-center text-zinc-600 text-xs mt-6">
          Já é Premium?{" "}
          <a href="/auth/login" className="text-zinc-400 hover:text-white transition-colors">
            Fazer login
          </a>
        </p>
      </div>
    </div>
  );
}
