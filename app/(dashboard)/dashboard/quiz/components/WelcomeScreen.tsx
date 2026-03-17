"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, Clock, CheckCircle2, AlertCircle, List } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WelcomeScreenProps {
  activeQuiz: any;
  userAttempt: any;
  onStart: () => void;
  onViewBank: () => void;
}

export function WelcomeScreen({
  activeQuiz,
  userAttempt,
  onStart,
  onViewBank,
}: WelcomeScreenProps) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-500 to-yellow-200 bg-clip-text text-transparent">
            Desafio Fiel
          </h1>
          <p className="text-gray-400 mt-1">
            Teste seu conhecimento sobre o Timão e ganhe pontos!
          </p>
        </div>
        <Button variant="ghost" onClick={onViewBank} className="border border-gray-700 hover:bg-gray-800">
          <List className="mr-2 h-4 w-4" />
          Ver Anteriores
        </Button>
      </div>

      <div className="grid gap-6">
        {activeQuiz ? (
          <Card className="bg-gradient-to-br from-gray-900 to-gray-950 border-yellow-500/20 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-50">
               <div className="w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl" />
            </div>
            
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 mb-2">
                    Quiz da Semana
                  </Badge>
                  <CardTitle className="text-2xl text-white">
                    {activeQuiz.title}
                  </CardTitle>
                  <CardDescription className="text-gray-400 mt-2 text-base">
                    {activeQuiz.description}
                  </CardDescription>
                </div>
                {userAttempt && (
                  <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20 px-3 py-1">
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Concluído
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                  <div className="text-sm text-gray-400 mb-1 flex items-center">
                    <Clock className="w-3 h-3 mr-1" /> Tempo
                  </div>
                  <div className="font-semibold text-white">10 seg / pergunta</div>
                </div>
                <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                  <div className="text-sm text-gray-400 mb-1">Questões</div>
                  <div className="font-semibold text-white">
                    {activeQuiz.questions?.length || 0} perguntas
                  </div>
                </div>
                <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
                  <div className="text-sm text-gray-400 mb-1">Válido até</div>
                  <div className="font-semibold text-white">
                    {activeQuiz.endDate ? format(new Date(activeQuiz.endDate), "dd/MM/yyyy", { locale: ptBR }) : "--"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                {userAttempt ? (
                  <Button disabled className="w-full md:w-auto bg-gray-800 text-gray-400">
                    Você já respondeu este quiz
                  </Button>
                ) : (
                  <Button 
                    onClick={onStart} 
                    className="w-full md:w-auto bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-lg py-6 px-8 transition-all hover:scale-105"
                  >
                    <PlayCircle className="mr-2 h-5 w-5" />
                    Começar Quiz Agora
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="bg-gray-800 p-4 rounded-full mb-4">
                <AlertCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Nenhum Quiz Ativo
              </h3>
              <p className="text-gray-400 max-w-md">
                No momento não há nenhum quiz disponível. Volte mais tarde!
              </p>
            </CardContent>
          </Card>
        )}

        <div className="bg-gray-900/50 border border-yellow-500/10 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-500 mb-2 flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            Regras do Jogo
          </h4>
          <ul className="text-sm text-gray-400 space-y-1 ml-6 list-disc">
            <li>Você só tem uma tentativa por quiz semanal.</li>
            <li>Cada pergunta tem um tempo limite de 10 segundos.</li>
            <li>Quanto mais rápido responder, mais pontos bônus você ganha.</li>
            <li>Respostas erradas não pontuam.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
