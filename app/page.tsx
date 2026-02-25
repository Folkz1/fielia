"use client";

import { Button } from "@/components/ui/button";
import { Trophy, Zap, MessageCircle, TrendingUp, Star, ArrowRight, Quote } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-corinthians">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hero-video.webp"
            alt="Background"
            fill
            className="object-cover object-center scale-125"
            priority
            quality={75}
            sizes="100vw"
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAgIBAwQDAAAAAAAAAAAAAQIDBBEABSEGEhMxQVFh/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAZEQACAwEAAAAAAAAAAAAAAAABAgADESH/2gAMAwEAAhEDEEA/ANg6i3Cxu1Guq6WwFJyGYvMzADHyAB+5+tMv0YZ4jFLEkkZ9qygj9GPilaKG2SfZ//Z"
          />
          {/* Multiple overlay layers for smooth effect */}
          <div className="absolute inset-0 bg-black/55"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-transparent to-black/45"></div>
          {/* Vignette effect */}
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.55) 100%)' }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto text-center pt-8 sm:pt-0">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-corinthians-gold/20 border border-corinthians-gold/30 mb-6 sm:mb-8 animate-fade-in backdrop-blur-sm">
            <Star className="w-4 h-4 text-corinthians-gold" />
            <span className="text-xs sm:text-sm font-semibold text-corinthians-gold">Exclusivo para a Fiel Torcida</span>
          </div>

          {/* Main Heading */}
          <h1 className="font-heading text-6xl sm:text-7xl md:text-8xl lg:text-9xl mb-4 sm:mb-6 animate-slide-up">
            <span className="text-gradient-corinthians drop-shadow-2xl">FIEL.IA</span>
          </h1>

          <p className="text-xl sm:text-2xl md:text-3xl text-gray-200 mb-3 sm:mb-4 max-w-3xl mx-auto animate-slide-up drop-shadow-lg" style={{ animationDelay: "0.1s" }}>
            O Assistente Inteligente do Torcedor Corinthiano
          </p>

          <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-8 sm:mb-10 max-w-2xl mx-auto animate-slide-up drop-shadow" style={{ animationDelay: "0.2s" }}>
            Quizzes semanais, noticias personalizadas e IA no WhatsApp. Tudo para voce viver o Corinthians 24/7.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <Link href="/auth/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto group text-lg px-8 py-6">
                Comecar Agora
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <button
              onClick={() => {
                const featuresSection = document.querySelector('#features');
                featuresSection?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center font-semibold rounded-lg transition-smooth focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:pointer-events-none btn-ghost focus:ring-white/20 px-8 py-4 text-lg backdrop-blur-sm bg-white/5 border border-white/20"
            >
              Saber Mais
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 sm:gap-12 mt-12 sm:mt-16 max-w-lg mx-auto animate-fade-in" style={{ animationDelay: "0.5s" }}>
            <div className="text-center backdrop-blur-sm bg-black/30 rounded-xl p-4 border border-white/10">
              <div className="text-3xl sm:text-4xl font-heading text-corinthians-gold mb-1">15+</div>
              <div className="text-xs sm:text-sm text-gray-300">Interacoes Diarias</div>
            </div>
            <div className="text-center backdrop-blur-sm bg-black/30 rounded-xl p-4 border border-white/10">
              <div className="text-3xl sm:text-4xl font-heading text-corinthians-gold mb-1">100+</div>
              <div className="text-xs sm:text-sm text-gray-300">Perguntas no Quiz</div>
            </div>
            <div className="text-center backdrop-blur-sm bg-black/30 rounded-xl p-4 border border-white/10">
              <div className="text-3xl sm:text-4xl font-heading text-corinthians-gold mb-1">24/7</div>
              <div className="text-xs sm:text-sm text-gray-300">Assistente IA</div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator - Hidden on mobile */}
        <div className="hidden sm:block absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce z-10">
          <div className="w-6 h-10 rounded-full border-2 border-corinthians-gold/50 flex items-start justify-center p-2 backdrop-blur-sm bg-black/20">
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

      {/* Torcida Section */}
      <section className="py-16 sm:py-24 px-4 relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl mb-4">
                <span className="text-gradient-gold">A Maior Torcida do Brasil</span>
              </h2>
              <p className="text-gray-300 text-base sm:text-lg mb-6">
                Faca parte da comunidade mais apaixonada do futebol brasileiro.
                Mais de 30 milhoes de corinthianos conectados pelo mesmo amor.
              </p>
              <p className="text-gray-400 text-sm sm:text-base">
                No FIEL.IA, voce se conecta com outros torcedores, disputa quizzes,
                acompanha noticias e vive a paixao pelo Timao todos os dias.
              </p>
            </div>
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden aspect-video lg:aspect-square">
                <Image
                  src="/images/torcida.jpeg"
                  alt="Torcida do Corinthians fazendo festa"
                  fill
                  className="object-cover"
                  loading="lazy"
                  quality={80}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {/* 1o Lugar - Ingressos */}
            <div className="card-gold text-center group relative overflow-hidden">
              <div className="absolute top-3 right-3 bg-gradient-gold text-corinthians-black px-3 py-1 rounded-full text-xs font-bold z-10">
                1o LUGAR
              </div>
              <div className="relative w-full h-40 sm:h-48 mb-4 rounded-xl overflow-hidden bg-black/30">
                <Image
                  src="/images/prizes/ingresso.png"
                  alt="Par de Ingressos Neo Quimica Arena"
                  fill
                  className="object-contain group-hover:scale-110 transition-transform duration-300 p-4"
                  loading="lazy"
                  quality={75}
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <h3 className="font-heading text-2xl sm:text-3xl mb-2 text-white">Par de Ingressos</h3>
              <p className="text-corinthians-gold text-sm sm:text-base font-semibold">Neo Quimica Arena</p>
              <p className="text-gray-500 text-xs mt-2">Jogos do Corinthians em casa</p>
            </div>

            {/* 2o Lugar - Camisa */}
            <div className="card-corinthians text-center group relative overflow-hidden border-2 border-gray-400/30">
              <div className="absolute top-3 right-3 bg-gray-400 text-black px-3 py-1 rounded-full text-xs font-bold z-10">
                2o LUGAR
              </div>
              <div className="relative w-full h-40 sm:h-48 mb-4 rounded-xl overflow-hidden bg-black/30">
                <Image
                  src="/images/prizes/camisa.webp"
                  alt="Camisa Oficial Nike x SCCP"
                  fill
                  className="object-contain group-hover:scale-110 transition-transform duration-300"
                  loading="lazy"
                  quality={75}
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <h3 className="font-heading text-2xl sm:text-3xl mb-2 text-white">Camisa Oficial</h3>
              <p className="text-gray-400 text-sm sm:text-base font-semibold">Nike x SCCP 2025</p>
              <p className="text-gray-500 text-xs mt-2">Manto sagrado do Corinthians</p>
            </div>

            {/* 3o Lugar - PIX */}
            <div className="card-corinthians text-center group relative overflow-hidden border-2 border-orange-700/30">
              <div className="absolute top-3 right-3 bg-orange-700 text-white px-3 py-1 rounded-full text-xs font-bold z-10">
                3o LUGAR
              </div>
              <div className="relative w-full h-40 sm:h-48 mb-4 rounded-xl overflow-hidden bg-black/30">
                <Image
                  src="/images/prizes/pix.png"
                  alt="Premio em PIX R$ 50"
                  fill
                  className="object-contain group-hover:scale-110 transition-transform duration-300 p-4"
                  loading="lazy"
                  quality={75}
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              </div>
              <h3 className="font-heading text-2xl sm:text-3xl mb-2 text-white">PIX R$ 50</h3>
              <p className="text-orange-500 text-sm sm:text-base font-semibold">Premio em Dinheiro</p>
              <p className="text-gray-500 text-xs mt-2">Transferencia instantanea</p>
            </div>
          </div>

          <p className="text-center text-gray-500 text-sm mt-8">
            * Premios distribuidos semanalmente para os melhores colocados do ranking
          </p>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-16 sm:py-24 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl mb-3 sm:mb-4">
              <span className="text-gradient-gold">O Que a Fiel Diz</span>
            </h2>
            <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto px-4">
              Depoimentos de quem ja usa o FIEL.IA
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Marcos S.",
                text: "O quiz e viciante! Ja ganhei uma camisa e agora to na briga pelo ingresso. Melhor app pro corinthiano!",
                location: "Sao Paulo, SP"
              },
              {
                name: "Ana Paula R.",
                text: "A IA no WhatsApp e demais! Pergunto tudo sobre a historia do Timao e ela responde na hora. Muito bom!",
                location: "Campinas, SP"
              },
              {
                name: "Carlos H.",
                text: "As noticias personalizadas me deixam sempre atualizado. Nao perco mais nada do meu Corinthians!",
                location: "Rio de Janeiro, RJ"
              }
            ].map((testimonial, i) => (
              <div key={i} className="card-corinthians relative">
                <Quote className="w-8 h-8 text-corinthians-gold/30 absolute top-4 right-4" />
                <p className="text-gray-300 text-sm sm:text-base mb-4 italic">
                  &ldquo;{testimonial.text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center">
                    <span className="text-corinthians-black font-bold text-sm">
                      {testimonial.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{testimonial.name}</p>
                    <p className="text-gray-500 text-xs">{testimonial.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
                R$ 56,90
                <span className="text-xl sm:text-2xl text-gray-400">/mes</span>
              </div>
              <p className="text-corinthians-gold text-sm sm:text-base font-semibold">Concorra a ingressos e camisas!</p>
            </div>

            <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 text-left">
              {[
                "Quiz semanal com premios reais",
                "IA ilimitada no WhatsApp",
                "Noticias personalizadas",
                "Concorra a ingressos",
                "Concorra a camisas oficiais",
                "Ranking e conquistas",
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
