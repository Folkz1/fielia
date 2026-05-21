import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";
import { FielLogo } from "@/components/fiel-logo";

export const metadata: Metadata = {
  title: "Contato - FIEL.IA",
  description: "Entre em contato com a equipe FIEL.IA",
};

export default function ContatoPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <Link href="/" className="inline-flex items-center gap-3">
          <FielLogo size="sm" className="mx-0 shadow-none" />
          <span className="font-heading text-2xl text-white tracking-wide">FIEL IA</span>
        </Link>

        <h1 className="font-heading text-4xl md:text-5xl mt-10 mb-4">Contato</h1>
        <p className="text-white/60 text-lg mb-10">Fale com a gente. Estamos aqui para ajudar.</p>

        <div className="grid gap-6">
          <a
            href="mailto:suporte@fielchat.com"
            className="flex items-center gap-4 border border-white/10 rounded-2xl p-6 hover:border-orange-600/40 transition-colors"
            style={{ background: "#1A1A1A" }}
          >
            <div className="w-12 h-12 rounded-xl bg-orange-600/15 flex items-center justify-center flex-shrink-0">
              <Mail className="text-orange-500" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">E-mail</h3>
              <p className="text-white/60 text-sm">suporte@fielchat.com</p>
            </div>
          </a>

          <a
            href="https://wa.me/5511982129134?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20a%20FIEL%20IA"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 border border-white/10 rounded-2xl p-6 hover:border-orange-600/40 transition-colors"
            style={{ background: "#1A1A1A" }}
          >
            <div className="w-12 h-12 rounded-xl bg-orange-600/15 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="text-orange-500" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">WhatsApp</h3>
              <p className="text-white/60 text-sm">Atendimento rápido via WhatsApp</p>
            </div>
          </a>
        </div>

        <div className="mt-12 border border-white/10 rounded-2xl p-6" style={{ background: "#1A1A1A" }}>
          <h3 className="font-bold text-white text-lg mb-3">Horário de Atendimento</h3>
          <p className="text-white/60 text-sm">Segunda a sexta, das 9h às 18h (horário de Brasília)</p>
          <p className="text-white/40 text-xs mt-2">Mensagens fora do horário serão respondidas no próximo dia útil.</p>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 text-center">
          <Link href="/" className="text-sm text-white/50 hover:text-white transition-colors">
            ← Voltar para o início
          </Link>
        </div>
      </div>
    </main>
  );
}
