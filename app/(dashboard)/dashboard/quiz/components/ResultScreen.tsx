"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Trophy, Target, Award, ArrowLeft, Share2 } from "lucide-react";
import confetti from "canvas-confetti";
import { useEffect } from "react";

interface ResultScreenProps {
  result: any;
  attempt: any;
  onBack: () => void;
}

export function ResultScreen({ result, attempt, onBack }: ResultScreenProps) {
  
  // Confetti effect on mount
  useEffect(() => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);

    return () => clearInterval(interval);
  }, []);

  if (!result) return null;

  return (
    <div className="flex flex-col items-center justify-center py-6 animate-in zoom-in-95 duration-500">
      
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-500/20 mb-4 ring-4 ring-yellow-500/20">
            <Trophy className="w-10 h-10 text-yellow-500" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Quiz Finalizado!</h1>
        <p className="text-gray-400">Veja como você se saiu nesse desafio.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl mb-8">
        <Card className="bg-gray-900 border-gray-800 text-center py-6">
            <div className="text-3xl font-bold text-yellow-500 mb-2">{Math.round(result.score)}</div>
            <div className="text-sm text-gray-400 uppercase tracking-wider font-semibold">Pontos</div>
        </Card>
        
        <Card className="bg-gray-900 border-gray-800 text-center py-6">
            <div className="text-3xl font-bold text-green-500 mb-2">{result.correctAnswers} / {result.totalQuestions}</div>
            <div className="text-sm text-gray-400 uppercase tracking-wider font-semibold">Acertos</div>
        </Card>

        <Card className="bg-gray-900 border-gray-800 text-center py-6">
            <div className="text-3xl font-bold text-blue-500 mb-2">{Math.round(result.accuracy)}%</div>
            <div className="text-sm text-gray-400 uppercase tracking-wider font-semibold">Precisão</div>
        </Card>
      </div>

      <Card className="w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-950 border-gray-800">
        <CardContent className="p-8 text-center">
            <div className="mb-6">
                <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Continue Evoluindo!</h3>
                <p className="text-gray-400">
                    Você pode ver sua posição no ranking geral e desafiar seus amigos.
                </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="secondary" onClick={onBack} size="lg">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar ao Início
                </Button>
                <Button className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold" size="lg">
                    <Award className="w-4 h-4 mr-2" />
                    Ver Ranking
                </Button>
            </div>
        </CardContent>
      </Card>

    </div>
  );
}
