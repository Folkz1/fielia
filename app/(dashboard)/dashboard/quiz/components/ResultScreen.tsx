"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Award, ArrowLeft, Crown, Target, Trophy } from "lucide-react";
import confetti from "canvas-confetti";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type QuizResult = {
  attemptId: string;
  quizId?: string;
  audience?: string;
  score: number;
  accuracy: number;
  correctAnswers: number;
  totalQuestions: number;
};

type RankingUser = {
  rank: number;
  id: string;
  name: string;
  totalPoints: number;
};

type RankingPayload = {
  ranking: RankingUser[];
  viewer?: RankingUser | null;
  requiresPremium?: boolean;
};

interface ResultScreenProps {
  result: QuizResult | null;
  onBack: () => void;
}

export function ResultScreen({ result, onBack }: ResultScreenProps) {
  const router = useRouter();
  const [ranking, setRanking] = useState<RankingPayload | null>(null);

  useEffect(() => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!result?.quizId) return;

    fetch(`/api/ranking?quizId=${encodeURIComponent(result.quizId)}&limit=10`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setRanking(data))
      .catch(() => setRanking(null));
  }, [result?.quizId]);

  if (!result) return null;

  return (
    <div className="flex flex-col items-center justify-center py-6 animate-in zoom-in-95 duration-500">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-500/20 mb-4 ring-4 ring-yellow-500/20">
          <Trophy className="w-10 h-10 text-yellow-500" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Quiz finalizado</h1>
        <p className="text-gray-400">Veja seu resultado e sua posicao no ranking.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl mb-8">
        <Card className="bg-gray-900 border-gray-800 text-center py-6">
          <div className="text-3xl font-bold text-yellow-500 mb-2">{Math.round(result.score)}</div>
          <div className="text-sm text-gray-400 uppercase tracking-wider font-semibold">Pontos</div>
        </Card>

        <Card className="bg-gray-900 border-gray-800 text-center py-6">
          <div className="text-3xl font-bold text-green-500 mb-2">
            {result.correctAnswers} / {result.totalQuestions}
          </div>
          <div className="text-sm text-gray-400 uppercase tracking-wider font-semibold">Acertos</div>
        </Card>

        <Card className="bg-gray-900 border-gray-800 text-center py-6">
          <div className="text-3xl font-bold text-blue-500 mb-2">{Math.round(result.accuracy)}%</div>
          <div className="text-sm text-gray-400 uppercase tracking-wider font-semibold">Precisao</div>
        </Card>
      </div>

      <Card className="w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800 mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-6 h-6 text-yellow-500" />
            <h2 className="text-xl font-bold text-white">Top 10 deste quiz</h2>
          </div>

          {ranking?.ranking?.length ? (
            <div className="space-y-2">
              {ranking.ranking.map((user) => (
                <div key={`${user.id}-${user.rank}`} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                  <span className="text-sm text-gray-300">#{user.rank} {user.name}</span>
                  <span className="text-sm font-bold text-yellow-500">{user.totalPoints} pts</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Ranking ainda sendo calculado.</p>
          )}

          {ranking?.viewer && !ranking.ranking.some((user) => user.id === ranking.viewer?.id) && (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-xs text-gray-400">Sua posicao</p>
              <p className="font-bold text-white">
                #{ranking.viewer.rank} - {ranking.viewer.totalPoints} pts
              </p>
            </div>
          )}

          {ranking?.requiresPremium && (
            <div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
              <div className="flex items-start gap-3">
                <Crown className="w-5 h-5 text-yellow-500 mt-0.5" />
                <p className="text-sm text-gray-200">
                  O plano gratuito mostra o Top 10 e sua posicao. Premium libera ranking completo e quiz semanal.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Continue evoluindo</h3>
            <p className="text-gray-400">
              Volte ao proximo quiz mensal ou assine Premium para disputar quizzes semanais.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="secondary" onClick={onBack} size="lg">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao inicio
            </Button>
            <Button
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
              size="lg"
              onClick={() => router.push("/dashboard/ranking")}
            >
              <Award className="w-4 h-4 mr-2" />
              Ver ranking geral
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
