"use client";

import { useRanking } from "@/hooks/use-api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Medal, Trophy } from "lucide-react";
import { useState } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function RankingPage() {
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'alltime'>('weekly');
  const { ranking, isLoading } = useRanking(period);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-heading text-white mb-2">Ranking da Fiel 🏆</h1>
          <p className="text-gray-400">Veja quem são os maiores torcedores do Timão</p>
        </div>
        
        <Tabs defaultValue="weekly" className="w-full md:w-auto" onValueChange={(v: string) => setPeriod(v as any)}>
          <TabsList className="bg-corinthians-gray-dark border border-gray-800">
            <TabsTrigger value="weekly" className="data-[state=active]:bg-corinthians-gold data-[state=active]:text-black">Semanal</TabsTrigger>
            <TabsTrigger value="monthly" className="data-[state=active]:bg-corinthians-gold data-[state=active]:text-black">Mensal</TabsTrigger>
            <TabsTrigger value="alltime" className="data-[state=active]:bg-corinthians-gold data-[state=active]:text-black">Geral</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Top 3 Podium */}
      {ranking.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end mb-12">
          {/* 2nd Place */}
          {top3[1] && (
            <div className="flex flex-col items-center order-2 md:order-1 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="relative mb-4">
                <Avatar className="w-24 h-24 border-4 border-gray-400">
                  <AvatarFallback className="bg-gray-800 text-2xl">
                    {top3[1].name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gray-400 text-black font-bold px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  <Medal className="w-4 h-4" /> 2º
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{top3[1].name}</h3>
              <p className="text-corinthians-gold font-bold">{top3[1].totalPoints} pts</p>
            </div>
          )}

          {/* 1st Place */}
          {top3[0] && (
            <div className="flex flex-col items-center order-1 md:order-2 -mt-12 animate-slide-up">
              <div className="relative mb-4">
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-5xl">👑</div>
                <Avatar className="w-32 h-32 border-4 border-corinthians-gold shadow-[0_0_30px_rgba(191,155,48,0.3)]">
                  <AvatarFallback className="bg-gray-800 text-4xl">
                    {top3[0].name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-corinthians-gold text-black font-bold px-4 py-1.5 rounded-full text-lg flex items-center gap-1">
                  <Trophy className="w-5 h-5 fill-black" /> 1º
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">{top3[0].name}</h3>
              <p className="text-corinthians-gold font-bold text-xl">{top3[0].totalPoints} pts</p>
              <Badge variant="outline" className="mt-2 border-corinthians-gold text-corinthians-gold">
                🔥 Streak: {top3[0].currentStreak} dias
              </Badge>
            </div>
          )}

          {/* 3rd Place */}
          {top3[2] && (
            <div className="flex flex-col items-center order-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="relative mb-4">
                <Avatar className="w-24 h-24 border-4 border-orange-700">
                  <AvatarFallback className="bg-gray-800 text-2xl">
                    {top3[2].name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-orange-700 text-white font-bold px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  <Medal className="w-4 h-4" /> 3º
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{top3[2].name}</h3>
              <p className="text-corinthians-gold font-bold">{top3[2].totalPoints} pts</p>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard List */}
      <div className="bg-corinthians-gray-dark/50 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
        {rest.map((user, index) => (
          <div 
            key={user.id} 
            className="flex items-center justify-between p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-4">
              <span className="text-gray-500 w-8 text-center font-bold text-lg">
                {index + 4}
              </span>
              <Avatar className="w-10 h-10 border border-white/10">
                <AvatarFallback className="bg-gray-800">
                  {user.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-white font-medium">{user.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Membro Fiel</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-corinthians-gold font-bold">{user.totalPoints} pts</p>
              <p className="text-xs text-gray-500">Última atividade: {new Date(user.lastActive).toLocaleDateString()}</p>
            </div>
          </div>
        ))}

        {ranking.length === 0 && (
          <div className="p-8 text-center text-gray-400">
            Nenhum ranking disponível no momento.
          </div>
        )}
      </div>

      {/* Prizes Section */}
      <div className="mt-12 bg-gradient-to-r from-corinthians-gray-dark to-black p-8 rounded-xl border border-corinthians-gold/20">
        <h2 className="text-2xl font-heading text-white mb-6">Prêmios da Semana 🎁</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-black/50 border-white/10 hover:border-corinthians-gold/50 transition-colors">
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-4">👕</div>
              <h3 className="font-bold text-white text-lg mb-2">Camisa Oficial</h3>
              <p className="text-gray-400 text-sm">Para o 1º lugar do ranking mensal</p>
            </CardContent>
          </Card>
          <Card className="bg-black/50 border-white/10 hover:border-corinthians-gold/50 transition-colors">
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-4">🎫</div>
              <h3 className="font-bold text-white text-lg mb-2">Ingresso VIP</h3>
              <p className="text-gray-400 text-sm">Sorteio entre o Top 10 semanal</p>
            </CardContent>
          </Card>
          <Card className="bg-black/50 border-white/10 hover:border-corinthians-gold/50 transition-colors">
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-4">🧢</div>
              <h3 className="font-bold text-white text-lg mb-2">Kit Torcedor</h3>
              <p className="text-gray-400 text-sm">Para quem manter streak de 30 dias</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
