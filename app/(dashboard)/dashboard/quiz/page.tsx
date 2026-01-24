"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useQuiz } from "@/hooks/use-api";

// Mock data as fallback/initial state
const MOCK_QUIZ = {
  id: "quiz-semana-1",
  questions: [
    {
      id: "q1",
      question: "Em que ano o Corinthians foi fundado?",
      options: ["1910", "1912", "1915", "1920"],
      correctAnswer: "1910",
      points: 100,
    },
    {
      id: "q2",
      question: "Quantos títulos mundiais o Corinthians possui?",
      options: ["1", "2", "3", "4"],
      correctAnswer: "2",
      points: 100,
    },
    {
      id: "q3",
      question: "Qual é o apelido do estádio do Corinthians?",
      options: ["Itaquerão", "Pacaembu", "Morumbi", "Allianz"],
      correctAnswer: "Itaquerão",
      points: 100,
    },
  ],
};

const USER_ID = "mock-user-id"; // In production, get this from auth context

export default function QuizPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [answers, setAnswers] = useState<any[]>([]);
  const { submitQuiz, isSubmitting } = useQuiz();

  const TIME_PER_QUESTION = 10;
  const QUIZ_LENGTH = MOCK_QUIZ.questions.length;

  useEffect(() => {
    if (timeLeft > 0 && !isAnswered && !quizCompleted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isAnswered) {
      handleTimeUp();
    }
  }, [timeLeft, isAnswered, quizCompleted]);

  const handleTimeUp = () => {
    setIsAnswered(true);
    // Auto-select wrong answer or null
    handleAnswer(null);
  };

  const handleAnswer = (option: string | null) => {
    setSelectedOption(option);
    setIsAnswered(true);

    const question = MOCK_QUIZ.questions[currentQuestion];
    const isCorrect = option === question.correctAnswer;
    const timeTaken = TIME_PER_QUESTION - timeLeft;

    let pointsEarned = 0;

    if (isCorrect) {
      // Speed bonus: +10 points per remaining second
      const speedBonus = timeLeft * 10;
      pointsEarned = question.points + speedBonus;
      setScore(score + pointsEarned);
    }
    
    // Save answer locally
    setAnswers([...answers, {
      questionId: question.id,
      answer: option,
      isCorrect,
      timeTaken,
      points: pointsEarned
    }]);

    // Wait and go to next question
    setTimeout(() => {
      if (currentQuestion < QUIZ_LENGTH - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setTimeLeft(TIME_PER_QUESTION);
        setSelectedOption(null);
        setIsAnswered(false);
      } else {
        handleCompleteQuiz();
      }
    }, 2000);
  };

  const handleCompleteQuiz = async () => {
    setQuizCompleted(true);
    try {
      // Submit results to backend
      // In a real scenario, you'd calculate final score on backend too for security
      // But we pass our local answers for now
      await submitQuiz(USER_ID, MOCK_QUIZ.id, answers);
    } catch (error) {
      console.error("Failed to submit quiz:", error);
    }
  };

  const question = MOCK_QUIZ.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / QUIZ_LENGTH) * 100;

  if (quizCompleted) {
    const correctAnswers = answers.filter((a) => a.isCorrect).length;
    const accuracy = Math.round((correctAnswers / QUIZ_LENGTH) * 100);
    
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="max-w-2xl w-full animate-scale-in">
          <div className="card-gold text-center">
            {/* Trophy Animation */}
            <div className="text-8xl mb-6 animate-bounce-slow">
              {accuracy >= 80 ? "🏆" : accuracy >= 60 ? "🥈" : "🥉"}
            </div>
            
            <h1 className="font-heading text-5xl text-white mb-4">
              {accuracy >= 80 ? "Parabéns!" : accuracy >= 60 ? "Muito Bom!" : "Continue Tentando!"}
            </h1>
            
            <p className="text-3xl text-gray-300 mb-2">
              Você fez <span className="text-corinthians-gold font-bold">{score}</span> pontos
            </p>
            
            <p className="text-lg text-gray-400 mb-8">
              {correctAnswers} de {QUIZ_LENGTH} respostas corretas ({accuracy}% de acerto)
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-corinthians-gray-dark rounded-lg p-4">
                <p className="text-2xl font-heading text-corinthians-gold">{correctAnswers}</p>
                <p className="text-xs text-gray-400">Acertos</p>
              </div>
              <div className="bg-corinthians-gray-dark rounded-lg p-4">
                <p className="text-2xl font-heading text-white">{score}</p>
                <p className="text-xs text-gray-400">Pontos</p>
              </div>
              <div className="bg-corinthians-gray-dark rounded-lg p-4">
                <p className="text-2xl font-heading text-corinthians-gold">{accuracy}%</p>
                <p className="text-xs text-gray-400">Precisão</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <Link href="/dashboard">
                <Button variant="secondary" size="lg">Voltar ao Dashboard</Button>
              </Link>
              <Link href="/dashboard/ranking">
                <Button size="lg">Ver Ranking</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar</span>
          </Link>
          <div className="text-gray-400 font-semibold">
            Pergunta {currentQuestion + 1} de {QUIZ_LENGTH}
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="h-2 bg-corinthians-gray-dark rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-gold transition-all duration-500"
            style={{ width: `${((currentQuestion + 1) / QUIZ_LENGTH) * 100}%` }}
          />
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Question Card */}
        <div className="card-corinthians relative overflow-hidden">
          {/* Timer */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gray-800">
            <div
              className={`h-full transition-all duration-1000 ease-linear ${
                timeLeft < 3 ? "bg-red-500" : "bg-corinthians-gold"
              }`}
              style={{ width: `${(timeLeft / TIME_PER_QUESTION) * 100}%` }}
            />
          </div>

          <div className="flex justify-between items-center mb-8 mt-4">
            <div className="flex items-center gap-2 text-gray-400">
              <Clock className="w-5 h-5" />
              <span className="font-mono text-xl">{timeLeft}s</span>
            </div>
            <div className="text-corinthians-gold font-bold">
              + {timeLeft * 10} pts bônus
            </div>
          </div>

          <h2 className="font-heading text-3xl md:text-4xl text-white mb-8 text-center leading-tight">
            {question.question}
          </h2>

          <div className="grid grid-cols-1 gap-4">
            {question.options.map((option, index) => {
              let buttonStyle = "bg-corinthians-gray-light hover:bg-gray-700 text-white border-transparent";
              
              if (isAnswered) {
                if (option === question.correctAnswer) {
                  buttonStyle = "bg-green-600 text-white border-green-400 animate-pulse";
                } else if (option === selectedOption) {
                  buttonStyle = "bg-red-600 text-white border-red-400";
                } else {
                  buttonStyle = "bg-corinthians-gray-dark text-gray-500 opacity-50";
                }
              }

              return (
                <button
                  key={index}
                  onClick={() => !isAnswered && handleAnswer(option)}
                  disabled={isAnswered}
                  className={`
                    p-6 rounded-xl border-2 text-left transition-all duration-200 text-lg font-semibold
                    ${buttonStyle}
                    ${!isAnswered ? "hover:scale-[1.02] transform" : ""}
                  `}
                >
                  {option}
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex justify-between items-center text-sm text-gray-500">
            <span>Pontuação Atual</span>
            <span className="text-xl text-white font-bold">{score}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
