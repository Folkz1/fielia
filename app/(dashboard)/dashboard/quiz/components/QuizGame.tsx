"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Timer, ArrowRight, XCircle } from "lucide-react";
import { useSession } from "next-auth/react";

interface QuizGameProps {
  quiz: any;
  onComplete: (result: any) => void;
  onCancel: () => void;
}

export function QuizGame({ quiz, onComplete, onCancel }: QuizGameProps) {
  const { data: session } = useSession();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState(10);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const questions = quiz.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex) / questions.length) * 100;

  useEffect(() => {
    startTimer();
    return () => stopTimer();
  }, [currentQuestionIndex]);

  const startTimer = () => {
    stopTimer();
    setTimeLeft(10);
    startTimeRef.current = Date.now();
    
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleTimeUp = () => {
    stopTimer();
    // Auto-advance with no answer or marking as skipped
    submitAnswer(null); 
  };

  const handleOptionSelect = (option: string) => {
    if (selectedOption) return; // Prevent changing answer
    setSelectedOption(option);
    stopTimer();
    
    // Small delay to show selection
    setTimeout(() => {
        submitAnswer(option);
    }, 500);
  };

  const submitAnswer = (answer: string | null) => {
    const timeTaken = Math.min(10, (Date.now() - startTimeRef.current) / 1000);
    
    const newAnswer = {
      questionId: currentQuestion.id,
      answer: answer || "",
      timeTaken: timeTaken,
    };

    const newAnswers = [...answers, newAnswer];
    setAnswers(newAnswers);

    if (currentQuestionIndex + 1 < questions.length) {
      setSelectedOption(null);
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      finishQuiz(newAnswers);
    }
  };

  const finishQuiz = async (finalAnswers: any[]) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session?.user?.id,
          quizId: quiz.id,
          answers: finalAnswers,
        }),
      });

      if (!response.ok) throw new Error("Failed to submit");

      const result = await response.json();
      onComplete(result);
    } catch (error) {
      console.error("Error submitting quiz:", error);
      // Handle error gracefully - maybe show a retry button or alert
      alert("Erro ao enviar respostas. Tente novamente.");
      setIsSubmitting(false);
    }
  };

  if (isSubmitting) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center animate-in fade-in">
        <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mb-6" />
        <h2 className="text-2xl font-bold text-white mb-2">Calculando Resultados...</h2>
        <p className="text-gray-400">Segura a ansiedade, Fiel!</p>
      </div>
    );
  }

  if (!currentQuestion) return null;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header Info */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center text-gray-400">
            <span className="text-yellow-500 font-bold mr-2">
                Questão {currentQuestionIndex + 1}
            </span>
            <span className="text-sm">/ {questions.length}</span>
        </div>
        <Button 
            variant="ghost" 
            size="sm" 
            onClick={onCancel}
            className="text-gray-500 hover:text-red-400 hover:bg-red-500/10"
        >
            <XCircle className="w-4 h-4 mr-2" />
            Cancelar
        </Button>
      </div>

      {/* Progress Bar */}
      <Progress value={progress} className="h-2 mb-8 bg-gray-800" indicatorClassName="bg-yellow-500" />

      {/* Timer Card */}
      <div className="flex justify-center mb-8">
        <div className={`
            flex items-center px-4 py-2 rounded-full border-2 font-bold transition-all
            ${timeLeft <= 3 ? 'border-red-500 text-red-500 animate-pulse' : 'border-gray-700 text-gray-300'}
        `}>
            <Timer className="w-4 h-4 mr-2" />
            {timeLeft}s
        </div>
      </div>

      {/* Question Card */}
      <Card className="bg-gray-900 border-gray-800 shadow-2xl mb-6">
        <CardContent className="p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold text-white text-center mb-8">
                {currentQuestion.question}
            </h2>

            <div className="space-y-3">
                {currentQuestion.options.map((option: string, idx: number) => (
                    <button
                        key={idx}
                        onClick={() => handleOptionSelect(option)}
                        disabled={selectedOption !== null}
                        className={`
                            w-full p-4 rounded-xl text-left transition-all duration-200 border-2
                            flex justify-between items-center group
                            ${selectedOption === option 
                                ? 'bg-yellow-500 border-yellow-500 text-black font-bold transform scale-[1.02]' 
                                : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-yellow-500/50 hover:bg-gray-750'}
                        `}
                    >
                        <span className="flex-1">{option}</span>
                        <ArrowRight className={`
                            w-4 h-4 opacity-0 transition-all
                            ${selectedOption === option ? 'opacity-100' : 'group-hover:opacity-50'}
                        `} />
                    </button>
                ))}
            </div>
        </CardContent>
      </Card>
      
      <p className="text-center text-sm text-gray-500">
        Responda rápido para ganhar bônus de velocidade!
      </p>
    </div>
  );
}
