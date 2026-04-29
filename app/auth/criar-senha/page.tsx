"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield, Lock, CheckCircle, ArrowLeft } from "lucide-react";

function getSafeNext(value: string | null) {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function CriarSenhaInner() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPayment = searchParams.get("from") === "payment";
  const fromFree = searchParams.get("from") === "free";
  const next = getSafeNext(searchParams.get("next"));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/criar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Erro ao salvar senha");

      setSuccess(true);
      setTimeout(() => router.push(next || "/dashboard"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          {fromPayment ? (
            <>
              <h1 className="text-3xl font-bold text-white mb-2">Pagamento confirmado!</h1>
              <p className="text-gray-400">Crie uma senha para acessar o FIEL.IA sempre que quiser</p>
            </>
          ) : fromFree ? (
            <>
              <h1 className="text-3xl font-bold text-white mb-2">Cadastro confirmado!</h1>
              <p className="text-gray-400">Crie uma senha para entrar depois com seu email</p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-white mb-2">Criar senha</h1>
              <p className="text-gray-400">Defina uma senha para sua conta</p>
            </>
          )}
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          {success ? (
            <div className="text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
              <h2 className="text-xl font-bold text-white">Senha criada!</h2>
              <p className="text-gray-400 text-sm">Redirecionando...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-xl text-center">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 ml-1">Nova senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 ml-1">Confirmar senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                {loading ? "Salvando..." : "Salvar senha e acessar"}
              </button>
            </form>
          )}

          {!fromFree && (
            <div className="mt-8 pt-6 border-t border-white/10 text-center">
              <Link
                href="/dashboard"
                className="text-sm text-gray-300 hover:text-white transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> Pular por agora e ir ao dashboard
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CriarSenhaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-gray-400">Carregando...</div>}>
      <CriarSenhaInner />
    </Suspense>
  );
}
