"use client";

import { useState, useEffect, useRef } from "react";
import {
  ChevronDown, Search, Clock, AlertTriangle,
  MessageCircle, Newspaper, Trophy, Laugh,
  CreditCard, SlidersHorizontal, Zap, ChevronRight,
  CheckCircle, ChevronDown as ChevronDownFaq, Instagram,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

/* ─── hooks ─── */

function useIntersectionObserver(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

function useCounterAnimation(target: number, isVisible: boolean, duration = 2000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    const startTime = performance.now();
    const step = (currentTime: number) => {
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isVisible, target, duration]);

  return count;
}

/* ─── constants ─── */

const SUBSCRIBE_URL = "/assinar";

/* ─── page ─── */

export default function Home() {
  return (
    <main className="min-h-screen" style={{ background: "#0A0A0A" }}>
      <Navbar />
      <HeroSection />
      <FakeNewsProblem />
      <ProductReveal />
      <FeaturesSection />
      <QuizSpotlight />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
      <MobileCTA />
    </main>
  );
}

/* ─── Navbar ─── */

const navLinks = [
  { label: "Como Funciona", href: "#como-funciona" },
  { label: "Recursos", href: "#recursos" },
  { label: "Quiz", href: "#quiz" },
  { label: "Planos", href: "#planos" },
];

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "backdrop-blur-md border-b border-white/10" : "bg-transparent"
      }`}
      style={scrolled ? { backgroundColor: "rgba(10,10,10,0.95)" } : undefined}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        <a href="#" className="font-heading text-2xl text-white tracking-wide">
          FIEL IA<span className="text-orange-500 ml-1">●</span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="text-sm text-white/70 hover:text-white transition-colors">
              {link.label}
            </a>
          ))}
        </div>

        <Link
          href={SUBSCRIBE_URL}
          className="hidden md:inline-block bg-orange-600 text-white rounded-full px-5 py-2 text-sm font-semibold hover:bg-orange-500 transition-colors"
        >
          Assinar Agora
        </Link>

        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-white" aria-label="Menu">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileOpen ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden backdrop-blur-md border-t border-white/10 px-6 pb-4" style={{ backgroundColor: "rgba(10,10,10,0.95)" }}>
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block py-3 text-sm text-white/70 hover:text-white border-b border-white/5"
            >
              {link.label}
            </a>
          ))}
          <Link
            href={SUBSCRIBE_URL}
            onClick={() => setMobileOpen(false)}
            className="block mt-3 bg-orange-600 text-white rounded-full px-5 py-2 text-sm font-semibold text-center"
          >
            Assinar Agora
          </Link>
        </div>
      )}
    </nav>
  );
}

/* ─── Hero ─── */

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center py-44 overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src="/images/torcida.jpeg"
          alt="Torcida do Corinthians fazendo festa"
          fill
          className="object-cover"
          priority
          quality={80}
          sizes="100vw"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/65 to-black/95" />

      <div className="relative z-10 text-center max-w-5xl mx-auto px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-500 mb-6">
          A INTELIGÊNCIA ARTIFICIAL DO TORCEDOR FIEL
        </p>

        <h1 className="font-heading text-[48px] md:text-[88px] leading-none text-white">
          Você está pronto
          <br />
          para saber tudo
          <br />
          sobre o Corinthians?
        </h1>

        <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mt-6 leading-relaxed">
          Chat com IA especialista no Timão. Notícias verificadas em tempo real.
          Quiz com prêmios em dinheiro. Memes pra zoar o rival.
          Tudo no site e no WhatsApp — na palma da sua mão.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
          <Link
            href={SUBSCRIBE_URL}
            className="bg-orange-600 text-white font-bold rounded-full px-9 py-4 text-lg hover:bg-orange-500 hover:scale-105 hover:shadow-2xl hover:shadow-orange-600/40 transition-all"
          >
            Assinar por R$ 56,90/mês →
          </Link>
          <a
            href="#como-funciona"
            className="border border-white/40 text-white rounded-full px-9 py-4 text-lg hover:border-white hover:bg-white/10 transition-all"
          >
            Ver como funciona ↓
          </a>
        </div>

        <p className="text-white/50 text-sm mt-8">
          ⭐⭐⭐⭐⭐ Mais de 12.000 torcedores fiéis já assinaram
        </p>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
        <ChevronDown className="text-white" size={28} />
      </div>
    </section>
  );
}

/* ─── FakeNewsProblem ─── */

const problemCards = [
  { icon: Search, title: "Fontes não confiáveis", body: "Sites sensacionalistas e perfis anônimos espalhando boatos como se fossem verdade." },
  { icon: Clock, title: "Informação atrasada", body: "Você descobre o que aconteceu horas depois, quando todo mundo no grupo já sabe." },
  { icon: AlertTriangle, title: "Conteúdo genérico", body: "Notícias que não falam a sua língua nem respeitam o que você realmente quer saber." },
];

function FakeNewsProblem() {
  const { ref, isVisible } = useIntersectionObserver();
  const v = isVisible ? "visible" : "";

  return (
    <section className="py-36 px-6" style={{ background: "#111" }} ref={ref}>
      <div className="max-w-5xl mx-auto text-center">
        <p className={`text-sm font-semibold uppercase tracking-[0.25em] text-orange-500 mb-6 fade-up ${v}`}>
          VOCÊ JÁ PASSOU POR ISSO
        </p>
        <h2 className={`font-heading text-[36px] md:text-[56px] leading-none text-white fade-up stagger-1 ${v}`}>
          Cansado de ficar
          <br />procurando notícias
          <br />e verificando se são
          <br />verdadeiras?
        </h2>
        <p className={`text-lg md:text-xl text-white/70 max-w-2xl mx-auto mt-6 leading-relaxed fade-up stagger-2 ${v}`}>
          A cada rumor de contratação, demissão de técnico ou resultado, você passa minutos —
          às vezes horas — vasculhando Twitter, Google e grupos de WhatsApp tentando entender
          o que é real e o que é fake.
        </p>

        <div className="grid md:grid-cols-3 gap-6 mt-16">
          {problemCards.map((card, i) => (
            <div key={card.title} className={`border border-white/10 rounded-2xl p-6 text-left fade-up stagger-${i + 1} ${v}`} style={{ background: "#1A1A1A" }}>
              <card.icon className="text-orange-500 mb-4" size={28} />
              <h3 className="font-bold text-white text-lg mb-2">{card.title}</h3>
              <p className="text-sm text-white/60">{card.body}</p>
            </div>
          ))}
        </div>

        <div className="w-16 h-[2px] bg-orange-500 mx-auto my-10" />

        <h3 className={`font-heading text-[30px] md:text-[40px] text-white fade-up ${v}`}>
          A FIEL IA resolve isso de uma vez.
        </h3>
        <p className={`text-lg text-white/60 mt-4 fade-up stagger-1 ${v}`}>
          Notícias verificadas, em tempo real, personalizadas para você.
          <br />Direto no site ou no WhatsApp. Sem fake news. Sem enrolação.
        </p>
      </div>
    </section>
  );
}

/* ─── ProductReveal ─── */

function ProductReveal() {
  const { ref, isVisible } = useIntersectionObserver();
  const v = isVisible ? "visible" : "";

  return (
    <section className="py-36 px-6 relative overflow-hidden" style={{ background: "#0A0A0A" }} ref={ref}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(232,101,10,0.12) 0%, transparent 65%)" }} />

      <div className="max-w-5xl mx-auto text-center relative z-10">
        <p className={`text-sm font-semibold uppercase tracking-[0.25em] text-orange-500 mb-6 fade-up ${v}`}>APRESENTANDO</p>
        <h2 className={`font-heading text-[60px] md:text-[100px] leading-none text-white fade-up stagger-1 ${v}`}>FIEL IA.</h2>
        <p className={`text-xl md:text-2xl font-light text-white/80 mt-6 fade-up stagger-2 ${v}`}>
          A primeira inteligência artificial criada
          <br />exclusivamente para quem tem o
          <br />Corinthians no sangue.
        </p>

        <div className="grid md:grid-cols-2 gap-8 mt-16">
          {/* Phone mockup */}
          <div className={`border border-white/10 rounded-3xl p-6 shadow-[0_0_60px_rgba(232,101,10,0.15)] fade-up stagger-1 ${v}`} style={{ background: "#1A1A1A" }}>
            <div className="rounded-2xl p-4 space-y-3" style={{ background: "#0A0A0A" }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-xs font-bold text-white">IA</div>
                <span className="text-sm text-white font-semibold">FIEL IA · WhatsApp</span>
              </div>
              <div className="bg-white/10 rounded-2xl rounded-bl-sm p-3 max-w-[80%]">
                <p className="text-sm text-white/80">Quem foi artilheiro do Corinthians no Brasileirão 2023?</p>
              </div>
              <div className="rounded-2xl rounded-br-sm p-3 max-w-[85%] ml-auto" style={{ background: "#1A1A1A" }}>
                <p className="text-sm text-white/80">O artilheiro do Corinthians no Brasileirão 2023 foi Yuri Alberto, com 13 gols marcados na competição. ⚽</p>
              </div>
            </div>
          </div>

          {/* Browser mockup */}
          <div className={`border border-white/10 rounded-3xl p-6 shadow-[0_0_60px_rgba(232,101,10,0.15)] fade-up stagger-2 ${v}`} style={{ background: "#1A1A1A" }}>
            <div className="rounded-2xl p-4" style={{ background: "#0A0A0A" }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-white/20" /><div className="w-3 h-3 rounded-full bg-white/20" /><div className="w-3 h-3 rounded-full bg-white/20" />
                </div>
                <div className="flex-1 bg-white/5 rounded-full px-3 py-1 text-xs text-white/40 text-center">fielia.com.br</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-xs text-orange-500 font-semibold">ÚLTIMA HORA</p>
                    <p className="text-sm text-white/80 mt-1">Corinthians anuncia reforço para o meio-campo</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-xs text-orange-500 font-semibold">VERIFICADO</p>
                    <p className="text-sm text-white/80 mt-1">Escalação confirmada para o clássico</p>
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-xs text-orange-500 font-semibold mb-2">QUIZ DA SEMANA</p>
                  <p className="text-sm text-white/80">Quem marcou o gol do título em 2012?</p>
                  <div className="space-y-1.5 mt-2">
                    <div className="bg-white/10 rounded-lg px-3 py-1.5 text-xs text-white/70">Guerrero</div>
                    <div className="bg-orange-600/20 border border-orange-600/40 rounded-lg px-3 py-1.5 text-xs text-white">Paolo Guerrero ✓</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className={`text-xl md:text-2xl italic text-orange-500 mt-10 fade-up stagger-3 ${v}`}>
          "Não é um app de futebol. É a sua IA particular do Timão."
        </p>
      </div>
    </section>
  );
}

/* ─── Features ─── */

const features = [
  { icon: MessageCircle, title: "Pergunte qualquer coisa sobre o Timão.", body: "Histórico, jogadores, títulos, escalações, curiosidades, bastidores — a IA Fiel sabe tudo e responde na hora, em linguagem de torcedor.", badge: "Chat 24/7 · Site e WhatsApp", highlighted: false },
  { icon: Newspaper, title: "Notícias reais. Verificadas. No momento certo.", body: "Chega de fake news. A FIEL IA filtra, verifica e entrega apenas informações confirmadas — personalizadas com o que você quer acompanhar.", badge: "Verificado em tempo real", highlighted: false },
  { icon: Trophy, title: "Você sabe tudo sobre o Timão?", body: "Agora seu conhecimento pode virar dinheiro. Responda quizzes sobre o Corinthians, suba no ranking e ganhe prêmios reais toda semana.", badge: "Premiação semanal", highlighted: true, urgency: "Torcedores do Timão já estão ganhando prêmios — e você vai ficar de fora?", pills: ["💰 PIX", "🎟️ Ingressos", "👕 Camisas", "🏅 Artigos"] },
  { icon: Laugh, title: "Crie o meme perfeito em segundos.", body: "Nossa IA gera imagens e memes prontos pra você arrasar no grupo e nas redes. Zoar com estilo é coisa de Fiel.", badge: "IA Generativa", highlighted: false },
];

function FeaturesSection() {
  const { ref, isVisible } = useIntersectionObserver();
  const v = isVisible ? "visible" : "";

  return (
    <section id="recursos" className="py-36 px-6" style={{ background: "#111" }} ref={ref}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <p className={`text-sm font-semibold uppercase tracking-[0.25em] text-orange-500 mb-6 fade-up ${v}`}>RECURSOS</p>
          <h2 className={`font-heading text-[36px] md:text-[56px] leading-none text-white fade-up stagger-1 ${v}`}>
            Tudo que um torcedor fanático
            <br />precisa. Em um lugar só.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`border rounded-2xl p-8 hover:-translate-y-2 hover:border-orange-600/40 hover:shadow-2xl hover:shadow-orange-600/10 transition-all duration-300 fade-up stagger-${i + 1} ${v} ${f.highlighted ? "border-orange-600/60" : "border-white/10"}`}
              style={{ background: "#1A1A1A" }}
            >
              <f.icon className="text-orange-500 mb-4" size={32} />
              <h3 className="font-bold text-white text-[22px] mb-3">{f.title}</h3>
              <p className="text-base text-white/60 leading-relaxed">{f.body}</p>
              {f.urgency && <p className="text-orange-500 italic mt-3 text-sm">{f.urgency}</p>}
              {f.pills && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {f.pills.map((pill) => (
                    <span key={pill} className="bg-white/10 border border-white/20 text-white rounded-full text-xs px-3 py-1">{pill}</span>
                  ))}
                </div>
              )}
              <span className="inline-block mt-4 bg-orange-600/15 text-orange-500 border border-orange-600/30 rounded-full text-xs px-3 py-1">{f.badge}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── QuizSpotlight ─── */

const prizes = [
  { emoji: "💰", label: "PIX direto na conta" },
  { emoji: "🎟️", label: "Ingressos para jogos" },
  { emoji: "👕", label: "Camisas oficiais" },
  { emoji: "🏅", label: "Artigos esportivos" },
];

function QuizSpotlight() {
  const { ref, isVisible } = useIntersectionObserver();
  const v = isVisible ? "visible" : "";

  return (
    <section id="quiz" className="py-36 px-6 relative overflow-hidden" style={{ background: "#0A0A0A" }} ref={ref}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(232,101,10,0.12) 0%, transparent 65%)" }} />

      <div className="max-w-5xl mx-auto text-center relative z-10">
        <p className={`text-sm font-semibold uppercase tracking-[0.25em] text-orange-500 mb-6 fade-up ${v}`}>QUIZ FIEL IA</p>
        <h2 className={`font-heading text-[36px] md:text-[56px] leading-none text-white fade-up stagger-1 ${v}`}>
          Você sabe tudo<br />sobre o Timão?
        </h2>
        <p className={`text-lg md:text-xl text-white/70 mt-4 fade-up stagger-2 ${v}`}>Agora seu conhecimento pode virar dinheiro.</p>

        <div className={`border border-orange-600/40 rounded-3xl p-8 md:p-12 max-w-2xl mx-auto mt-12 fade-up stagger-2 ${v}`} style={{ background: "#1A1A1A" }}>
          <Trophy className="text-orange-500 mx-auto mb-6" size={56} />
          <p className="text-lg text-white leading-relaxed">
            Toda semana, novos quizzes sobre a história, os jogadores, as conquistas e as polêmicas
            do Corinthians. Você responde, acumula pontos e sobe no ranking. Os melhores ganham
            prêmios enviados automaticamente.
          </p>

          <div className="grid grid-cols-2 gap-4 mt-8">
            {prizes.map((p) => (
              <div key={p.label} className="border border-white/10 rounded-xl p-5 text-center" style={{ background: "#111" }}>
                <span className="text-3xl">{p.emoji}</span>
                <p className="text-sm text-white/70 mt-2">{p.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-orange-600/10 border border-orange-600/30 rounded-xl p-5 flex items-center gap-3 mt-8">
            <Zap className="text-orange-500 flex-shrink-0" size={24} />
            <p className="text-sm text-white/80 text-left">
              Torcedores do Timão já estão ganhando prêmios —{" "}
              <span className="text-orange-500 font-bold">e você vai ficar de fora?</span>
            </p>
          </div>

          <Link
            href={SUBSCRIBE_URL}
            className="block mt-6 bg-orange-600 text-white font-bold rounded-xl py-4 text-lg w-full text-center hover:bg-orange-500 hover:shadow-xl hover:shadow-orange-600/30 transition-all"
          >
            QUERO PARTICIPAR DO QUIZ →
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─── HowItWorks ─── */

const steps = [
  { num: "01", icon: CreditCard, title: "Assine o plano Fiel Fanático", body: "Acesse pelo site ou escaneie o QR Code para entrar no WhatsApp da FIEL IA." },
  { num: "02", icon: SlidersHorizontal, title: "Configure seus interesses", body: "Diga pra IA quais jogadores você acompanha, que notícias quer e como prefere ser notificado." },
  { num: "03", icon: Zap, title: "Viva o Timão como nunca antes", body: "Chat, notícias verificadas, quiz com prêmios, memes — tudo 24/7 no site e no WhatsApp." },
];

function HowItWorks() {
  const { ref, isVisible } = useIntersectionObserver();
  const v = isVisible ? "visible" : "";

  return (
    <section id="como-funciona" className="py-36 px-6" style={{ background: "#111" }} ref={ref}>
      <div className="max-w-5xl mx-auto text-center">
        <p className={`text-sm font-semibold uppercase tracking-[0.25em] text-orange-500 mb-6 fade-up ${v}`}>SIMPLES ASSIM</p>
        <h2 className={`font-heading text-[36px] md:text-[56px] leading-none text-white mb-16 fade-up stagger-1 ${v}`}>Funciona em 3 passos.</h2>

        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-4">
          {steps.map((step, i) => (
            <div key={step.num} className="flex items-center gap-4 flex-1">
              <div className={`relative text-center flex-1 fade-up stagger-${i + 1} ${v}`}>
                <span className="font-heading text-[120px] leading-none text-orange-500/10 absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 pointer-events-none select-none">
                  {step.num}
                </span>
                <div className="relative z-10 pt-8">
                  <step.icon className="text-white mx-auto mb-4" size={40} />
                  <h3 className="font-bold text-white text-lg mb-2">{step.title}</h3>
                  <p className="text-sm text-white/60">{step.body}</p>
                </div>
              </div>
              {i < steps.length - 1 && <ChevronRight className="text-orange-500 hidden md:block flex-shrink-0" size={32} />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Testimonials ─── */

const testimonials = [
  { quote: "Ganhei R$ 200 de PIX no quiz e ainda recebi ingresso pro clássico. Isso é real, galera.", name: "Rodrigo M.", city: "São Paulo – SP" },
  { quote: "Acabou o negócio de ficar checando se a notícia é verdadeira. A FIEL IA já chega verificada.", name: "Fernanda C.", city: "Santo André – SP" },
  { quote: "Os memes que gerei humilharam meu amigo palmeirense por semanas. Impagável.", name: "Carlos T.", city: "Campinas – SP" },
];

function Testimonials() {
  const { ref, isVisible } = useIntersectionObserver();
  const { ref: statsRef, isVisible: statsVisible } = useIntersectionObserver();
  const v = isVisible ? "visible" : "";

  const assinantes = useCounterAnimation(12847, statsVisible);
  const premios = useCounterAnimation(48000, statsVisible);
  const mensagens = useCounterAnimation(4200000, statsVisible);

  const formatNumber = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return n.toLocaleString("pt-BR");
    return n.toString();
  };

  return (
    <section className="py-36 px-6" style={{ background: "#0A0A0A" }} ref={ref}>
      <div className="max-w-5xl mx-auto text-center">
        <p className={`text-sm font-semibold uppercase tracking-[0.25em] text-orange-500 mb-6 fade-up ${v}`}>DEPOIMENTOS</p>
        <h2 className={`font-heading text-[36px] md:text-[56px] leading-none text-white mb-16 fade-up stagger-1 ${v}`}>
          12.000+ torcedores.<br />Uma só paixão.
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={t.name} className={`bg-white/5 border border-white/10 rounded-2xl p-8 text-left fade-up stagger-${i + 1} ${v}`}>
              <p className="text-orange-500 text-sm">⭐⭐⭐⭐⭐</p>
              <p className="italic text-white/80 mt-3 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              <p className="font-bold text-white text-sm mt-4">— {t.name}</p>
              <p className="text-white/40 text-xs">{t.city}</p>
            </div>
          ))}
        </div>

        <div
          ref={statsRef}
          className="border border-white/10 rounded-2xl p-8 mt-12 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10"
          style={{ background: "#111" }}
        >
          <div className="py-4 md:py-0 md:px-6">
            <p className="font-heading text-[40px] md:text-[56px] text-white">{assinantes.toLocaleString("pt-BR")}</p>
            <p className="text-sm text-white/50">Assinantes</p>
          </div>
          <div className="py-4 md:py-0 md:px-6">
            <p className="font-heading text-[40px] md:text-[56px] text-white">R$ {premios.toLocaleString("pt-BR")}</p>
            <p className="text-sm text-white/50">em prêmios pagos</p>
          </div>
          <div className="py-4 md:py-0 md:px-6">
            <p className="font-heading text-[40px] md:text-[56px] text-white">{formatNumber(mensagens)}</p>
            <p className="text-sm text-white/50">mensagens trocadas</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ─── */

const planFeatures = [
  "Chat IA especialista 24/7",
  "Notícias verificadas e personalizadas em tempo real",
  "Quiz semanal — PIX, ingressos, camisas, artigos",
  "Gerador de memes com IA",
  "Acesso via site E WhatsApp",
  "Cancele quando quiser",
];

function Pricing() {
  const { ref, isVisible } = useIntersectionObserver();
  const v = isVisible ? "visible" : "";

  return (
    <section id="planos" className="py-36 px-6" style={{ background: "#111" }} ref={ref}>
      <div className="max-w-5xl mx-auto text-center">
        <p className={`text-sm font-semibold uppercase tracking-[0.25em] text-orange-500 mb-6 fade-up ${v}`}>
          PLANO ÚNICO. ACESSO TOTAL.
        </p>
        <h2 className={`font-heading text-[36px] md:text-[56px] leading-none text-white mb-16 fade-up stagger-1 ${v}`}>
          Tudo isso por menos de<br />2 reais por dia.
        </h2>

        <div className={`relative max-w-md mx-auto fade-up stagger-2 ${v}`}>
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10">
            <span className="bg-orange-600 text-white font-bold rounded-full px-6 py-2 text-sm whitespace-nowrap">★ FIEL FANÁTICO</span>
          </div>

          <div className="border-2 border-orange-600 rounded-3xl p-10 shadow-2xl shadow-orange-600/25" style={{ background: "#1A1A1A" }}>
            <div className="mt-6 text-center">
              <p className="text-white/40 text-base line-through mb-1">De R$ 99,90/mês</p>
              <span className="font-heading text-[80px] leading-none text-white">R$ 56,90</span>
              <span className="text-xl text-white/50 ml-1">/mês</span>
              <p className="text-sm text-orange-500 mt-1">≈ R$ 1,89 por dia</p>
            </div>

            <div className="w-full h-[1px] bg-white/10 my-6" />

            <div className="space-y-3 text-left">
              {planFeatures.map((f) => (
                <div key={f} className="flex items-center gap-3">
                  <CheckCircle className="text-orange-500 flex-shrink-0" size={18} />
                  <span className="text-base text-white">{f}</span>
                </div>
              ))}
            </div>

            <Link
              href={SUBSCRIBE_URL}
              className="block mt-8 bg-orange-600 text-white font-bold rounded-2xl py-5 text-xl w-full text-center hover:bg-orange-500 hover:shadow-xl hover:shadow-orange-600/40 hover:scale-[1.02] transition-all"
            >
              QUERO SER FIEL FANÁTICO →
            </Link>

            <p className="text-white/40 text-xs text-center mt-4">
              🔒 Pagamento seguro · Cancele a qualquer momento · Acesso imediato
            </p>
          </div>
        </div>

        <p className="italic text-white/50 text-lg text-center mt-8">
          Você gasta mais do que isso em uma cerveja no estádio.
          <br />Mas a FIEL IA fica com você todos os dias.
        </p>

        <p className="text-orange-500 text-sm font-semibold text-center mt-4">
          ⚡ Preço de lançamento travado para os primeiros 15.000 assinantes.
        </p>
      </div>
    </section>
  );
}

/* ─── FAQ ─── */

const faqs = [
  { q: "Preciso instalar algum aplicativo?", a: "Não. A FIEL IA funciona direto no navegador e pelo WhatsApp. Sem app, sem complicação." },
  { q: "Como funciona o quiz com premiação?", a: "Quizzes temáticos toda semana. Você acumula pontos, sobe no ranking e ganha prêmios enviados automaticamente: PIX via CPF, ingressos por e-mail e produtos pelos Correios." },
  { q: "As notícias são mesmo verificadas?", a: "Sim. A FIEL IA só entrega notícias de fontes confiáveis, com verificação em tempo real. Chega de perder tempo checando se o que você leu é verdadeiro." },
  { q: "A IA realmente sabe tudo sobre o Corinthians?", a: "Foi treinada com todo o histórico do clube — títulos, jogadores, estatísticas, curiosidades e polêmicas — e é atualizada em tempo real." },
  { q: "Posso cancelar quando quiser?", a: "Sim. Cancele a qualquer momento, sem burocracia e sem multa." },
  { q: "O preço de R$ 56,90 é garantido?", a: "Sim. Assinantes do lançamento têm o preço travado mesmo que o plano suba no futuro." },
];

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-36 px-6" style={{ background: "#0A0A0A" }}>
      <div className="max-w-3xl mx-auto">
        <h2 className="font-heading text-[36px] md:text-[56px] leading-none text-white text-center mb-12">Perguntas frequentes.</h2>
        <div>
          {faqs.map((faq, i) => (
            <div key={i} className="border-b border-white/10">
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between py-5 text-left">
                <span className="font-semibold text-lg text-white pr-4">{faq.q}</span>
                <ChevronDown className={`flex-shrink-0 transition-transform duration-300 ${open === i ? "rotate-180 text-orange-500" : "text-white/50"}`} size={20} />
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${open === i ? "max-h-40 pb-5" : "max-h-0"}`}>
                <p className="text-base text-white/60 leading-relaxed">{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FinalCTA ─── */

function FinalCTA() {
  const { ref, isVisible } = useIntersectionObserver();
  const v = isVisible ? "visible" : "";

  return (
    <section className="relative py-36 px-6 overflow-hidden" ref={ref}>
      <div className="absolute inset-0">
        <Image src="/images/torcida.jpeg" alt="Torcida do Corinthians" fill className="object-cover" quality={75} sizes="100vw" />
      </div>
      <div className="absolute inset-0 bg-black/88" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(232,101,10,0.18) 0%, transparent 70%)" }} />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <p className={`text-sm font-semibold uppercase tracking-[0.25em] text-orange-500 mb-6 fade-up ${v}`}>PARA QUEM TEM O TIMÃO NO SANGUE</p>
        <h2 className={`font-heading text-[40px] md:text-[72px] leading-none text-white fade-up stagger-1 ${v}`}>
          Ser Fiel é mais<br />do que torcer.<br />É viver o Timão<br />todo dia.
        </h2>
        <p className={`text-lg text-white/70 max-w-xl mx-auto mt-6 leading-relaxed fade-up stagger-2 ${v}`}>
          A FIEL IA foi feita pra você. Para o torcedor que não desliga nunca. Que defende o clube em todo lugar. Que quer estar um passo à frente.
        </p>

        <Link
          href={SUBSCRIBE_URL}
          className={`inline-block mt-10 bg-orange-600 text-white font-bold rounded-full px-14 py-5 text-xl hover:bg-orange-500 hover:shadow-2xl hover:shadow-orange-600/50 hover:scale-105 transition-all fade-up stagger-3 ${v}`}
        >
          ASSINAR AGORA — R$ 56,90/mês
        </Link>

        <p className={`text-white/40 text-sm mt-5 fade-up stagger-4 ${v}`}>
          🔒 Pagamento seguro · Cancele quando quiser · Acesso imediato
        </p>

        <p className="font-heading text-2xl text-white mt-16 tracking-wide">
          FIEL IA<span className="text-orange-500 ml-1">●</span>
        </p>
      </div>
    </section>
  );
}

/* ─── Footer ─── */

function Footer() {
  return (
    <footer className="border-t border-white/10 py-12 px-6" style={{ background: "#0A0A0A" }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="font-heading text-xl text-white tracking-wide">
            FIEL IA<span className="text-orange-500 ml-1">●</span>
          </p>

          <nav className="flex flex-wrap items-center justify-center gap-6">
            {["Como Funciona", "Recursos", "Quiz", "Planos"].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(/ /g, "-")}`} className="text-sm text-white/50 hover:text-white transition-colors">
                {item}
              </a>
            ))}
            <Link href="/contato" className="text-sm text-white/50 hover:text-white transition-colors">Suporte</Link>
          </nav>

          <div className="flex items-center gap-4">
            <a href="#" className="text-white/50 hover:text-orange-500 transition-colors"><Instagram size={20} /></a>
            <a href="#" className="text-white/50 hover:text-orange-500 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.86a8.28 8.28 0 004.76 1.5v-3.4a4.85 4.85 0 01-1-.27z" /></svg>
            </a>
            <a href="#" className="text-white/50 hover:text-orange-500 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.377.504A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.504 9.376.504 9.376.504s7.505 0 9.377-.504a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
            </a>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-6 text-center space-y-2">
          <p className="text-white/30 text-xs">© 2025 FIEL IA. Todos os direitos reservados.</p>
          <p className="text-white/30 text-xs">
            <Link href="/termos" className="hover:text-white transition-colors">Termos de Uso</Link>
            {" · "}
            <Link href="/privacidade" className="hover:text-white transition-colors">Política de Privacidade</Link>
          </p>
          <p className="text-white/20 text-xs italic">FIEL IA não possui vínculo oficial com o Sport Club Corinthians Paulista.</p>
        </div>
      </div>
    </footer>
  );
}

/* ─── MobileCTA ─── */

function MobileCTA() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const pricingEl = document.getElementById("planos");
    if (!pricingEl) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), { threshold: 0.1 });
    observer.observe(pricingEl);
    return () => observer.disconnect();
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <Link href={SUBSCRIBE_URL} className="block bg-orange-600 text-white text-center py-4 font-bold text-base w-full">
        Assinar por R$ 56,90/mês →
      </Link>
    </div>
  );
}
