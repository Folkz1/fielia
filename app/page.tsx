"use client";

import { Button } from "@/components/ui/button";
import { Trophy, Zap, MessageCircle, TrendingUp, Star, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-corinthians">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-corinthians-gold rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-corinthians-white rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "1s" }}></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-corinthians-gold/20 border border-corinthians-gold/30 mb-8 animate-fade-in">
            <Star className="w-4 h-4 text-corinthians-gold" />
            <span className="text-sm font-semibold text-corinthians-gold">Exclusivo para a Fiel Torcida</span>
          </div>

          {/* Main Heading */}
          <h1 className="font-heading text-6xl md:text-8xl lg:text-9xl mb-6 animate-slide-up">
            <span className="text-gradient-corinthians">FIEL.IA</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-4 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: "0.1s" }}>
            O Assistente Inteligente do Torcedor Corinthiano
          </p>

          <p className="text-base md:text-lg text-gray-400 mb-12 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: "0.2s" }}>
            Quizzes semanais, notícias personalizadas e IA no WhatsApp. Tudo para você viver o Corinthians 24/7.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <Button size="lg" className="group">
              Começar Agora
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="ghost" size="lg">
              Saber Mais
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-20 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.5s" }}>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-heading text-corinthians-gold mb-2">15+</div>
              <div className="text-sm text-gray-400">Interações Diárias</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-heading text-corinthians-gold mb-2">100+</div>
              <div className="text-sm text-gray-400">Perguntas no Quiz</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-heading text-corinthians-gold mb-2">24/7</div>
              <div className="text-sm text-gray-400">Assistente IA</div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-corinthians-gold/50 flex items-start justify-center p-2">
            <div className="w-1 h-3 bg-corinthians-gold rounded-full"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading text-4xl md:text-6xl mb-4">
              <span className="text-gradient-gold">Funcionalidades</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Tudo que você precisa para se manter conectado com o Timão
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1: Quiz */}
            <div className="card-corinthians group">
              <div className="w-12 h-12 rounded-lg bg-gradient-gold flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Trophy className="w-6 h-6 text-corinthians-black" />
              </div>
              <h3 className="font-heading text-2xl mb-3 text-corinthians-white">Quiz Semanal</h3>
              <p className="text-gray-400 mb-4">
                Teste seus conhecimentos sobre o Corinthians. 10 perguntas, 10 segundos cada. Ganhe pontos e suba no ranking!
              </p>
              <div className="flex items-center gap-2 text-corinthians-gold text-sm font-semibold">
                <Zap className="w-4 h-4" />
                <span>Anti-trapaça ativo</span>
              </div>
            </div>

            {/* Feature 2: WhatsApp Bot */}
            <div className="card-gold group">
              <div className="w-12 h-12 rounded-lg bg-corinthians-black flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-6 h-6 text-corinthians-gold" />
              </div>
              <h3 className="font-heading text-2xl mb-3 text-corinthians-white">Assistente no WhatsApp</h3>
              <p className="text-gray-400 mb-4">
                Converse com a IA sobre a história do Corinthians, receba notícias e gere memes. Tudo no seu WhatsApp!
              </p>
              <div className="flex items-center gap-2 text-corinthians-gold text-sm font-semibold">
                <Star className="w-4 h-4" />
                <span>15 interações/dia</span>
              </div>
            </div>

            {/* Feature 3: News */}
            <div className="card-corinthians group">
              <div className="w-12 h-12 rounded-lg bg-gradient-gold flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6 text-corinthians-black" />
              </div>
              <h3 className="font-heading text-2xl mb-3 text-corinthians-white">Notícias Personalizadas</h3>
              <p className="text-gray-400 mb-4">
                Receba as últimas notícias do Timão, sumarizadas por IA. Fique por dentro de tudo sem perder tempo.
              </p>
              <div className="flex items-center gap-2 text-corinthians-gold text-sm font-semibold">
                <Zap className="w-4 h-4" />
                <span>Atualização diária</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-4 bg-corinthians-gray-dark/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-4xl md:text-6xl mb-4">
            <span className="text-gradient-gold">Plano Único</span>
          </h2>
          <p className="text-gray-400 text-lg mb-12">
            Acesso completo a todas as funcionalidades
          </p>

          <div className="card-gold max-w-md mx-auto">
            <div className="mb-8">
              <div className="text-5xl font-heading text-corinthians-white mb-2">
                R$ 9,90
                <span className="text-2xl text-gray-400">/mês</span>
              </div>
              <p className="text-gray-400">7 dias de teste grátis</p>
            </div>

            <ul className="space-y-4 mb-8">
              {[
                "Quiz semanal ilimitado",
                "15 interações diárias no WhatsApp",
                "Notícias personalizadas",
                "Gerador de memes",
                "Ranking e conquistas",
                "Suporte prioritário",
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-corinthians-gold flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-corinthians-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>

            <Button size="lg" className="w-full">
              Assinar Agora
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-corinthians-gray-light">
        <div className="max-w-6xl mx-auto text-center">
          <div className="font-heading text-3xl mb-4 text-gradient-gold">FIEL.IA</div>
          <p className="text-gray-400 mb-6">
            Desenvolvido com 🖤🤍 para a Fiel Torcida
          </p>
          <div className="flex justify-center gap-6 text-sm text-gray-500">
            <Link href="/termos" className="hover:text-corinthians-gold transition-colors">
              Termos de Uso
            </Link>
            <Link href="/privacidade" className="hover:text-corinthians-gold transition-colors">
              Privacidade
            </Link>
            <Link href="/contato" className="hover:text-corinthians-gold transition-colors">
              Contato
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
