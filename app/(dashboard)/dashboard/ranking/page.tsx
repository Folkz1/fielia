"use client";

import { useRanking } from "@/hooks/use-api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Medal, Trophy, Flame, Gift, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import Image from "next/image";

interface RankingUser {
  id: string;
  name: string;
  totalPoints: number;
  currentStreak: number;
  lastActive: string;
}

interface NextQuiz {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  _count: {
    questions: number;
  };
}

export default function RankingPage() {
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'alltime'>('weekly');
  const { ranking, isLoading } = useRanking(period);
  const [nextQuiz, setNextQuiz] = useState<NextQuiz | null>(null);

  useEffect(() => {
    async function fetchNextQuiz() {
      try {
        const res = await fetch('/api/quiz/next');
        if (res.ok) {
          const data = await res.json();
          setNextQuiz(data.quiz);
        }
      } catch (error) {
        console.error('Erro ao buscar próximo quiz:', error);
      }
    }
    fetchNextQuiz();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const top3 = ranking.slice(0, 3) as RankingUser[];
  const rest = ranking.slice(3) as RankingUser[];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short'
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-heading text-white mb-2">Ranking da Fiel</h1>
          <p className="text-gray-400">Veja quem são os maiores torcedores do Timão</p>
        </div>

        <Tabs defaultValue="weekly" className="w-full md:w-auto" onValueChange={(v: string) => setPeriod(v as any)}>
          <TabsList className="bg-corinthians-gray-dark border border-gray-800 w-full md:w-auto">
            <TabsTrigger value="weekly" className="flex-1 md:flex-none data-[state=active]:bg-[var(--gradient-accent-start)] data-[state=active]:text-[hsl(var(--accent-primary-foreground))]">Semanal</TabsTrigger>
            <TabsTrigger value="monthly" className="flex-1 md:flex-none data-[state=active]:bg-[var(--gradient-accent-start)] data-[state=active]:text-[hsl(var(--accent-primary-foreground))]">Mensal</TabsTrigger>
            <TabsTrigger value="alltime" className="flex-1 md:flex-none data-[state=active]:bg-[var(--gradient-accent-start)] data-[state=active]:text-[hsl(var(--accent-primary-foreground))]">Geral</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Top 3 Podium */}
      {ranking.length > 0 && (
        <div className="grid grid-cols-3 gap-2 md:gap-8 items-end mb-8 md:mb-12">
          {/* 2nd Place */}
          {top3[1] && (
            <div className="flex flex-col items-center order-1 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="relative mb-2 md:mb-4">
                <Avatar className="w-16 h-16 md:w-24 md:h-24 border-4 border-gray-400">
                  <AvatarFallback className="bg-gradient-to-br from-gray-700 to-gray-800 text-lg md:text-2xl">
                    <span className="text-2xl md:text-3xl">⚽</span>
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 md:-bottom-3 left-1/2 -translate-x-1/2 bg-gray-400 text-black font-bold px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs md:text-sm flex items-center gap-1">
                  <Medal className="w-3 h-3 md:w-4 md:h-4" /> 2
                </div>
              </div>
              <h3 className="text-sm md:text-xl font-bold text-white mb-1 text-center truncate max-w-full">{top3[1].name}</h3>
              <p className="text-[var(--gradient-accent-start)] font-bold text-sm md:text-base">{top3[1].totalPoints} pts</p>
            </div>
          )}

          {/* 1st Place */}
          {top3[0] && (
            <div className="flex flex-col items-center order-2 -mt-4 md:-mt-12 animate-slide-up">
              <div className="relative mb-2 md:mb-4">
                <div className="absolute -top-8 md:-top-12 left-1/2 -translate-x-1/2 text-3xl md:text-5xl">👑</div>
                <Avatar className="w-20 h-20 md:w-32 md:h-32 border-4 border-[var(--gradient-accent-start)] shadow-[0_0_30px_rgba(255,107,0,0.3)]">
                  <AvatarFallback className="bg-gradient-to-br from-yellow-600 to-yellow-800 text-2xl md:text-4xl">
                    <span className="text-3xl md:text-5xl">🏆</span>
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 md:-bottom-4 left-1/2 -translate-x-1/2 bg-[var(--gradient-accent-start)] text-[hsl(var(--accent-primary-foreground))] font-bold px-3 md:px-4 py-1 md:py-1.5 rounded-full text-sm md:text-lg flex items-center gap-1">
                  <Trophy className="w-4 h-4 md:w-5 md:h-5" /> 1
                </div>
              </div>
              <h3 className="text-base md:text-2xl font-bold text-white mb-1 text-center">{top3[0].name}</h3>
              <p className="text-[var(--gradient-accent-start)] font-bold text-base md:text-xl">{top3[0].totalPoints} pts</p>
              <Badge variant="outline" className="mt-2 border-[var(--gradient-accent-start)] text-[var(--gradient-accent-start)] text-xs">
                <Flame className="w-3 h-3 mr-1" /> {top3[0].currentStreak} dias
              </Badge>
            </div>
          )}

          {/* 3rd Place */}
          {top3[2] && (
            <div className="flex flex-col items-center order-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="relative mb-2 md:mb-4">
                <Avatar className="w-16 h-16 md:w-24 md:h-24 border-4 border-orange-700">
                  <AvatarFallback className="bg-gradient-to-br from-orange-700 to-orange-900 text-lg md:text-2xl">
                    <span className="text-2xl md:text-3xl">🥉</span>
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 md:-bottom-3 left-1/2 -translate-x-1/2 bg-orange-700 text-white font-bold px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs md:text-sm flex items-center gap-1">
                  <Medal className="w-3 h-3 md:w-4 md:h-4" /> 3
                </div>
              </div>
              <h3 className="text-sm md:text-xl font-bold text-white mb-1 text-center truncate max-w-full">{top3[2].name}</h3>
              <p className="text-[var(--gradient-accent-start)] font-bold text-sm md:text-base">{top3[2].totalPoints} pts</p>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard List */}
      <div className="bg-corinthians-gray-dark/50 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
        {rest.map((user, index) => (
          <div
            key={user.id}
            className="flex items-center justify-between p-3 md:p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3 md:gap-4">
              <span className="text-gray-500 w-6 md:w-8 text-center font-bold text-base md:text-lg">
                {index + 4}
              </span>
              <Avatar className="w-8 h-8 md:w-10 md:h-10 border border-white/10">
                <AvatarFallback className="bg-gradient-to-br from-gray-700 to-gray-800 text-xs md:text-sm">
                  ⚽
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-white font-medium text-sm md:text-base">{user.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Membro Fiel</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[var(--gradient-accent-start)] font-bold text-sm md:text-base">{user.totalPoints} pts</p>
              <p className="text-xs text-gray-500 hidden sm:block">Ativo: {new Date(user.lastActive).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        ))}

        {ranking.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            Nenhum ranking disponível no momento.
          </div>
        )}
      </div>

      {/* Next Quiz Section */}
      {nextQuiz && (
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl p-4 md:p-6">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="w-6 h-6 text-blue-400" />
            <h2 className="text-lg md:text-xl font-bold text-white">Próximo Quiz</h2>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl md:text-2xl font-heading text-white">{nextQuiz.title}</h3>
              <p className="text-gray-400 text-sm mt-1">
                {nextQuiz._count.questions} perguntas | Inicia em {formatDate(nextQuiz.startDate)}
              </p>
            </div>
            <div className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 text-center">
              <p className="text-xs">Disponível em</p>
              <p className="font-bold">{formatDate(nextQuiz.startDate)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Prizes Section with Real Images */}
      <div className="mt-8 md:mt-12 bg-gradient-to-r from-corinthians-gray-dark to-black p-4 md:p-8 rounded-xl border border-[var(--gradient-accent-start)]/20">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <Gift className="w-6 h-6 text-[var(--gradient-accent-start)]" />
          <h2 className="text-xl md:text-2xl font-heading text-white">Prêmios da Semana</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {/* 1st Place - Ingresso */}
          <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-2 border-yellow-500/50 hover:border-yellow-500 transition-all group overflow-hidden relative">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="absolute top-2 right-2 bg-yellow-500 text-black px-2 py-0.5 rounded text-xs font-bold">
                1o LUGAR
              </div>
              <div className="relative w-full h-32 md:h-40 mb-4 rounded-lg overflow-hidden bg-black/30">
                <Image
                  src="/images/prizes/ingresso.png"
                  alt="Par de Ingressos"
                  fill
                  className="object-contain group-hover:scale-105 transition-transform p-2"
                />
              </div>
              <h3 className="font-bold text-white text-lg md:text-xl mb-1">Par de Ingressos</h3>
              <p className="text-gray-400 text-sm">Neo Quimica Arena</p>
              <p className="text-xs text-yellow-500 mt-2 font-medium">Jogos do Corinthians</p>
            </CardContent>
          </Card>

          {/* 2nd Place - Camisa */}
          <Card className="bg-gradient-to-br from-gray-400/20 to-gray-500/10 border-2 border-gray-400/50 hover:border-gray-400 transition-all group overflow-hidden relative">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="absolute top-2 right-2 bg-gray-400 text-black px-2 py-0.5 rounded text-xs font-bold">
                2o LUGAR
              </div>
              <div className="relative w-full h-32 md:h-40 mb-4 rounded-lg overflow-hidden bg-black/30">
                <Image
                  src="/images/prizes/camisa.webp"
                  alt="Camisa Oficial Nike"
                  fill
                  className="object-contain group-hover:scale-105 transition-transform"
                />
              </div>
              <h3 className="font-bold text-white text-lg md:text-xl mb-1">Camisa Oficial</h3>
              <p className="text-gray-400 text-sm">Nike x SCCP 2025</p>
              <p className="text-xs text-gray-500 mt-2 font-medium">Manto do Corinthians</p>
            </CardContent>
          </Card>

          {/* 3rd Place - PIX */}
          <Card className="bg-gradient-to-br from-orange-700/20 to-orange-800/10 border-2 border-orange-700/50 hover:border-orange-700 transition-all group overflow-hidden relative">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="absolute top-2 right-2 bg-orange-700 text-white px-2 py-0.5 rounded text-xs font-bold">
                3o LUGAR
              </div>
              <div className="relative w-full h-32 md:h-40 mb-4 rounded-lg overflow-hidden bg-black/30">
                <Image
                  src="/images/prizes/pix.png"
                  alt="Premio em PIX"
                  fill
                  className="object-contain group-hover:scale-105 transition-transform p-2"
                />
              </div>
              <h3 className="font-bold text-white text-lg md:text-xl mb-1">PIX</h3>
              <p className="text-gray-400 text-sm">Prêmio em Dinheiro</p>
              <p className="text-xs text-orange-500 mt-2 font-medium">Transferência instantânea</p>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-gray-500 text-xs md:text-sm mt-6">
          * Prêmios distribuídos semanalmente para os melhores colocados do ranking
        </p>
      </div>
    </div>
  );
}
