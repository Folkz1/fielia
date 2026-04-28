"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, CheckCircle2, ClipboardCheck, Loader2, ShieldCheck, Trophy, User, Phone, IdCard } from "lucide-react";

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export default function CadastroFreePage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/cadastro-free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          cpf,
          acceptedTerms,
          source: "cadastro-free",
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "Nao foi possivel concluir o cadastro.");
      }

      setSuccess(payload?.message || "Cadastro confirmado.");

      if (payload?.redirectUrl) {
        window.location.href = payload.redirectUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao concluir cadastro.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="flex flex-col justify-between border-b border-white/10 p-6 sm:p-8 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/5">
              <ShieldCheck className="h-5 w-5 text-zinc-100" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-zinc-200">FIEL.IA</p>
              <p className="text-xs text-zinc-500">Cadastro do quiz mensal</p>
            </div>
          </div>

          <div className="py-12 lg:py-0">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-300">
              <Trophy className="h-3.5 w-3.5" />
              Quiz da Fiel
            </p>
            <h1 className="max-w-xl text-4xl font-bold leading-tight text-white sm:text-5xl">
              Entre no desafio mensal do Corinthians.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-zinc-400">
              Cadastre seu WhatsApp, confirme seu CPF e receba acesso ao quiz free quando a rodada estiver aberta.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 text-sm text-zinc-400 sm:grid-cols-3 lg:grid-cols-1">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-yellow-300" />
              Uma tentativa por rodada
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-yellow-300" />
              Resultado imediato
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-yellow-300" />
              CPF protegido por hash
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="w-full max-w-md rounded-lg border border-white/10 bg-zinc-950 p-6 shadow-2xl sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">Cadastro free</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Preencha os dados para validar sua entrada no ranking free.
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">
                {success}
              </div>
            )}

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-zinc-400">Nome completo</span>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black px-10 py-3 text-sm text-white outline-none transition focus:border-yellow-400"
                    placeholder="Seu nome"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-zinc-400">WhatsApp</span>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    value={phone}
                    onChange={(event) => setPhone(formatPhone(event.target.value))}
                    inputMode="numeric"
                    className="w-full rounded-lg border border-white/10 bg-black px-10 py-3 text-sm text-white outline-none transition focus:border-yellow-400"
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-zinc-400">CPF</span>
                <div className="relative">
                  <IdCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    value={cpf}
                    onChange={(event) => setCpf(formatCpf(event.target.value))}
                    inputMode="numeric"
                    className="w-full rounded-lg border border-white/10 bg-black px-10 py-3 text-sm text-white outline-none transition focus:border-yellow-400"
                    placeholder="000.000.000-00"
                    required
                  />
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-yellow-400"
                />
                <span>
                  Aceito participar do quiz free e autorizo o uso dos meus dados para identificacao, ranking e mensagens do Fiel.IA.
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-yellow-400 px-4 py-3 text-sm font-bold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Validando
                  </>
                ) : (
                  <>
                    Confirmar cadastro
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
