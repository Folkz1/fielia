import { auth } from "@/auth";
import Link from "next/link";
import { CheckCircle, Mail, MessageCircle, ArrowRight } from "lucide-react";

export default async function BemVindoPage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Success icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-500/10 border border-yellow-500/30 mb-6">
          <CheckCircle className="w-10 h-10 text-yellow-300" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-3">
          Pagamento Confirmado!
        </h1>
        <p className="text-zinc-400 text-lg mb-8">
          Você já é <span className="text-white font-semibold">FIEL Premium</span>. 🖤
        </p>

        {/* Session-based content */}
        {session?.user ? (
          <div className="space-y-4">
            <p className="text-zinc-400 text-sm mb-6">
              Olá, {session.user.name}! Seu acesso está ativo.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-white text-black font-bold px-8 py-3.5 rounded-xl hover:bg-zinc-100 transition-colors"
            >
              Ir para o Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-start gap-3 text-left">
              <div className="p-2 rounded-lg bg-white/5 border border-white/10 shrink-0">
                <Mail className="w-4 h-4 text-zinc-300" />
              </div>
              <div>
                <p className="text-white text-sm font-medium mb-1">
                  Verifique seu email
                </p>
                <p className="text-zinc-500 text-sm">
                  Enviamos um link de acesso para o email cadastrado. Clique nele
                  para entrar automaticamente.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-left">
              <div className="p-2 rounded-lg bg-white/5 border border-white/10 shrink-0">
                <MessageCircle className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <p className="text-white text-sm font-medium mb-1">
                  WhatsApp notificado
                </p>
                <p className="text-zinc-500 text-sm">
                  Você também recebeu o link de acesso pelo WhatsApp cadastrado.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800">
              <Link
                href="/auth/login"
                className="text-zinc-400 text-sm hover:text-white transition-colors"
              >
                Ou faça login manualmente →
              </Link>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-zinc-600 text-xs mt-8">
          Problemas? Entre em contato:{" "}
          <a
            href="mailto:contato@fielchat.com"
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            contato@fielchat.com
          </a>
        </p>
      </div>
    </div>
  );
}
