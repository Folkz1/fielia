"use client";

import { Button } from "@/components/ui/button";
import { Trophy, Zap, MessageCircle, TrendingUp, Star, ArrowRight, Banknote, Ticket, Shirt } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-corinthians">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-48 sm:w-72 h-48 sm:h-72 bg-corinthians-gold rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute bottom-20 right-10 w-64 sm:w-96 h-64 sm:h-96 bg-corinthians-white rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "1s" }}></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto text-center pt-8 sm:pt-0">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-corinthians-gold/20 border border-corinthians-gold/30 mb-6 sm:mb-8 animate-fade-in">
            <Star className="w-4 h-4 text-corinthians-gold" />
            <span className="text-xs sm:text-sm font-semibold text-corinthians-gold">Exclusivo para a Fiel Torcida</span>
          </div>

          {/* Main Heading */}
          <h1 className="font-heading text-5xl sm:text-6xl md:text-8xl lg:text-9xl mb-4 sm:mb-6 animate-slide-up">
            <span className="text-gradient-corinthians">FIEL.IA</span>
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl text-gray-300 mb-3 sm:mb-4 max-w-3xl mx-auto px-4 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            O Assistente Inteligente do Torcedor Corinthiano
          </p>

          <p className="text-sm sm:text-base md:text-lg text-gray-400 mb-8 sm:mb-12 max-w-2xl mx-auto px-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            Quizzes semanais, noticias personalizadas e IA no WhatsApp. Tudo para voce viver o Corinthians 24/7.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center px-4 animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <Link href="/auth/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto group">
                Comecar Agora
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <button
              onClick={() => {
                const featuresSection = document.querySelector('#features');
                featuresSection?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center font-semibold rounded-lg transition-smooth focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:pointer-events-none btn-ghost focus:ring-white/20 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg"
            >
              Saber Mais
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 sm:gap-8 mt-12 sm:mt-20 max-w-2xl mx-auto px-4 animate-fade-in" style={{ animationDelay: "0.5s" }}>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl md:text-4xl font-heading text-corinthians-gold mb-1 sm:mb-2">15+</div>
              <div className="text-xs sm:text-sm text-gray-400">Interacoes Diarias</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl md:text-4xl font-heading text-corinthians-gold mb-1 sm:mb-2">100+</div>
              <div className="text-xs sm:text-sm text-gray-400">Perguntas no Quiz</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl md:text-4xl font-heading text-corinthians-gold mb-1 sm:mb-2">24/7</div>
              <div className="text-xs sm:text-sm text-gray-400">Assistente IA</div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator - Hidden on mobile */}
        <div className="hidden sm:block absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-corinthians-gold/50 flex items-start justify-center p-2">
            <div className="w-1 h-3 bg-corinthians-gold rounded-full"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-24 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl md:text-6xl mb-3 sm:mb-4">
              <span className="text-gradient-gold">Funcionalidades</span>
            </h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto px-4">
              Tudo que voce precisa para se manter conectado com o Timao
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Feature 1: Quiz */}
            <div className="card-corinthians group">
              <div className="w-12 h-12 rounded-lg bg-gradient-gold flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Trophy className="w-6 h-6 text-corinthians-black" />
              </div>
              <h3 className="font-heading text-xl sm:text-2xl mb-3 text-corinthians-white">Quiz Semanal</h3>
              <p className="text-gray-400 text-sm sm:text-base mb-4">
                Teste seus conhecimentos sobre o Corinthians. 10 perguntas, 10 segundos cada. Ganhe pontos e suba no ranking!
              </p>
              <div className="flex items-center gap-2 text-corinthians-gold text-sm font-semibold">
                <Zap className="w-4 h-4" />
                <span>Anti-trapaca ativo</span>
              </div>
            </div>

            {/* Feature 2: WhatsApp Bot */}
            <div className="card-gold group">
              <div className="w-12 h-12 rounded-lg bg-corinthians-black flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-6 h-6 text-corinthians-gold" />
              </div>
              <h3 className="font-heading text-xl sm:text-2xl mb-3 text-corinthians-white">Assistente no WhatsApp</h3>
              <p className="text-gray-400 text-sm sm:text-base mb-4">
                Converse com a IA sobre a historia do Corinthians, receba noticias e gere memes. Tudo no seu WhatsApp!
              </p>
              <div className="flex items-center gap-2 text-corinthians-gold text-sm font-semibold">
                <Star className="w-4 h-4" />
                <span>15 interacoes/dia</span>
              </div>
            </div>

            {/* Feature 3: News */}
            <div className="card-corinthians group md:col-span-2 lg:col-span-1">
              <div className="w-12 h-12 rounded-lg bg-gradient-gold flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6 text-corinthians-black" />
              </div>
              <h3 className="font-heading text-xl sm:text-2xl mb-3 text-corinthians-white">Noticias Personalizadas</h3>
              <p className="text-gray-400 text-sm sm:text-base mb-4">
                Receba as ultimas noticias do Timao, sumarizadas por IA. Fique por dentro de tudo sem perder tempo.
              </p>
              <div className="flex items-center gap-2 text-corinthians-gold text-sm font-semibold">
                <Zap className="w-4 h-4" />
                <span>Atualizacao diaria</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Prizes Section */}
      <section className="py-16 sm:py-24 px-4 relative bg-corinthians-gray-dark/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl md:text-6xl mb-3 sm:mb-4">
              <span className="text-gradient-gold">Premios do Quiz</span>
            </h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto px-4">
              Jogue o quiz semanal e concorra a premios incriveis
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* 1st Place */}
            <div className="card-gold text-center group order-2 md:order-1">
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-6 rounded-2xl bg-gradient-gold flex items-center justify-center group-hover:scale-105 transition-transform">
                <Banknote className="w-12 h-12 sm:w-16 sm:h-16 text-corinthians-black" />
              </div>
              <div className="badge-gold mb-4 text-sm sm:text-base">1o LUGAR</div>
              <h3 className="font-heading text-2xl sm:text-3xl mb-2 text-white">R$ 100</h3>
              <p className="text-gray-400 text-sm sm:text-base">Via PIX</p>
            </div>

            {/* 2nd Place */}
            <div className="card-corinthians text-center group order-1 md:order-2">
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-6 rounded-2xl bg-white/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Ticket className="w-12 h-12 sm:w-16 sm:h-16 text-corinthians-gold" />
              </div>
              <div className="badge-white mb-4 text-sm sm:text-base">2o LUGAR</div>
              <h3 className="font-heading text-2xl sm:text-3xl mb-2 text-white">Ingresso</h3>
              <p className="text-gray-400 text-sm sm:text-base">Neo Quimica Arena</p>
            </div>

            {/* 3rd Place */}
            <div className="card-corinthians text-center group order-3">
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-6 rounded-2xl bg-white/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Shirt className="w-12 h-12 sm:w-16 sm:h-16 text-corinthians-gold" />
              </div>
              <div className="badge-white mb-4 text-sm sm:text-base">3o LUGAR</div>
              <h3 className="font-heading text-2xl sm:text-3xl mb-2 text-white">Camisa Oficial</h3>
              <p className="text-gray-400 text-sm sm:text-base">Temporada 2025</p>
            </div>
          </div>

          <p className="text-center text-gray-500 text-sm mt-8">
            * Premios distribuidos semanalmente para os melhores colocados do ranking
          </p>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 sm:py-24 px-4 bg-corinthians-gray-dark/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-heading text-3xl sm:text-4xl md:text-6xl mb-3 sm:mb-4">
            <span className="text-gradient-gold">Plano Unico</span>
          </h2>
          <p className="text-gray-400 text-base sm:text-lg mb-8 sm:mb-12 px-4">
            Acesso completo a todas as funcionalidades
          </p>

          <div className="card-gold max-w-md mx-auto">
            <div className="mb-6 sm:mb-8">
              <div className="text-4xl sm:text-5xl font-heading text-corinthians-white mb-2">
                R$ 9,90
                <span className="text-xl sm:text-2xl text-gray-400">/mes</span>
              </div>
              <p className="text-gray-400 text-sm sm:text-base">7 dias de teste gratis</p>
            </div>

            <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 text-left">
              {[
                "Quiz semanal ilimitado",
                "15 interacoes diarias no WhatsApp",
                "Noticias personalizadas",
                "Gerador de memes",
                "Ranking e conquistas",
                "Suporte prioritario",
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-corinthians-gold flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-corinthians-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-300 text-sm sm:text-base">{feature}</span>
                </li>
              ))}
            </ul>

            <Link href="/auth/login" className="block">
              <Button size="lg" className="w-full">
                Assinar Agora
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 px-4 border-t border-corinthians-gray-light">
        <div className="max-w-6xl mx-auto text-center">
          <div className="font-heading text-2xl sm:text-3xl mb-3 sm:mb-4 text-gradient-gold">FIEL.IA</div>
          <p className="text-gray-400 text-sm sm:text-base mb-4 sm:mb-6">
            Desenvolvido com 🖤🤍 para a Fiel Torcida
          </p>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-500">
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
