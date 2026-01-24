import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="font-heading text-5xl md:text-6xl text-white mb-2">
          Bem-vindo, Fiel! 🖤🤍
        </h1>
        <p className="text-gray-400 text-lg">
          Confira suas estatísticas e continue sua jornada Corinthiana
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-slide-up">
        <StatCard
          title="Pontos Totais"
          value="1.250"
          subtitle="+150 esta semana"
          icon="⭐"
          variant="gold"
          trend={{ value: "12%", isPositive: true }}
        />
        
        <StatCard
          title="Posição no Ranking"
          value="#42"
          subtitle="Top 5% dos torcedores"
          icon="👑"
          trend={{ value: "3 posições", isPositive: true }}
        />
        
        <StatCard
          title="Sequência Atual"
          value="7 dias"
          subtitle="Recorde pessoal: 14 dias"
          icon="🔥"
        />
      </div>

      {/* Quiz Status */}
      <div className="card-gold mb-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-heading text-3xl text-white">Quiz da Semana</h3>
              <span className="badge-gold">NOVO</span>
            </div>
            <p className="text-gray-400 mb-4">
              Teste seus conhecimentos sobre o Timão! 10 perguntas, 10 segundos cada.
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>~2 minutos</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🏆</span>
                <span>Até 1.000 pontos</span>
              </div>
            </div>
          </div>
          <Link href="/dashboard/quiz">
            <Button size="lg" className="group whitespace-nowrap">
              Jogar Agora
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Latest News */}
      <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading text-3xl text-white">Últimas Notícias</h2>
          <Link href="/dashboard/news" className="text-corinthians-gold text-sm font-semibold hover:underline">
            Ver todas →
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              title: "Corinthians vence clássico no Morumbi",
              summary: "Timão bate o rival por 2x1 com gols de Yuri Alberto e Róger Guedes.",
              time: "Há 2 horas",
              category: "Jogos",
            },
            {
              title: "Reforços chegam para a temporada 2025",
              summary: "Diretoria anuncia contratação de três jogadores para fortalecer o elenco.",
              time: "Há 5 horas",
              category: "Transferências",
            },
          ].map((news, i) => (
            <div key={i} className="card-corinthians group cursor-pointer">
              <div className="flex items-center gap-2 mb-3">
                <span className="badge-white">{news.category}</span>
                <span className="text-xs text-gray-500">{news.time}</span>
              </div>
              <h4 className="font-heading text-xl text-white mb-2 group-hover:text-corinthians-gold transition-colors">
                {news.title}
              </h4>
              <p className="text-gray-400 mb-4">{news.summary}</p>
              <div className="flex items-center text-corinthians-gold text-sm font-semibold">
                <span>Ler mais</span>
                <ArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
