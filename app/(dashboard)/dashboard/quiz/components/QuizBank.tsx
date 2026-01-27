"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Calendar, FileQuestion, Hash } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface QuizBankProps {
  quizzes: any[];
  onBack: () => void;
}

export function QuizBank({ quizzes, onBack }: QuizBankProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold text-white">Banco de Quizzes</h1>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle>Histórico de Desafios</CardTitle>
          <CardDescription>
            Veja todos os quizzes já realizados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] w-full pr-4">
            {quizzes.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                Nenhum quiz encontrado no histórico.
              </div>
            ) : (
              <div className="space-y-4">
                {quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-yellow-500/30 transition-all"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={quiz.isActive ? "default" : "secondary"} className={quiz.isActive ? "bg-green-500/20 text-green-500" : "bg-gray-700 text-gray-400"}>
                          {quiz.isActive ? "Ativo" : "Encerrado"}
                        </Badge>
                        <span className="text-xs text-gray-500 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {format(new Date(quiz.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                      <h3 className="font-semibold text-white text-lg">{quiz.title}</h3>
                      <p className="text-sm text-gray-400 line-clamp-1">{quiz.description}</p>
                    </div>
                    
                    <div className="flex items-center gap-6 mt-4 md:mt-0 md:pl-4 md:border-l md:border-gray-700">
                       <div className="flex flex-col items-center min-w-[3rem]">
                          <span className="text-xs text-gray-500 uppercase">Questões</span>
                          <span className="font-bold text-white flex items-center">
                            <FileQuestion className="w-4 h-4 mr-1 text-yellow-500" />
                            {quiz._count?.questions || 0}
                          </span>
                       </div>
                       <div className="flex flex-col items-center min-w-[3rem]">
                          <span className="text-xs text-gray-500 uppercase">ID</span>
                          <span className="font-mono text-xs text-gray-400 flex items-center">
                            <Hash className="w-3 h-3 mr-1" />
                            {quiz.id.slice(0, 6)}...
                          </span>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
