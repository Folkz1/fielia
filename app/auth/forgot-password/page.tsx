"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield, Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Erro ao enviar");
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar");
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
          <h1 className="text-3xl font-bold text-white mb-2">Recuperar senha</h1>
          <p className="text-gray-400">Enviaremos um link para redefinir sua senha</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          {sent ? (
            <div className="text-center space-y-4">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
              <h2 className="text-xl font-bold text-white">Email enviado!</h2>
              <p className="text-gray-400 text-sm">
                Se existe uma conta com este email, você receberá um link para
                redefinir sua senha. Verifique sua caixa de entrada e spam.
              </p>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors mt-4"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar ao login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-4 rounded-xl text-center">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                {loading ? "Enviando..." : "Enviar link de recuperação"}
              </button>
            </form>
          )}

          {!sent && (
            <div className="mt-8 pt-6 border-t border-white/10 text-center">
              <Link href="/auth/login" className="text-sm text-gray-300 hover:text-white transition-colors inline-flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" /> Voltar ao login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
