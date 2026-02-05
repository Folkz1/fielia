"use client";

import { useEffect, useState } from "react";
import { WelcomeScreen } from "./WelcomeScreen";
import { QuizGame } from "./QuizGame";
import { ResultScreen } from "./ResultScreen";
import { QuizBank } from "./QuizBank";
import { Loader2 } from "lucide-react";

export type QuizView = "welcome" | "quiz" | "result" | "bank";

export function QuizManager() {
  const [view, setView] = useState<QuizView>("welcome");
  const [loading, setLoading] = useState(true);
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [userAttempt, setUserAttempt] = useState<any>(null);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [quizResult, setQuizResult] = useState<any>(null);

  useEffect(() => {
    fetchQuizData();
  }, []);

  const fetchQuizData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/quiz");
      const data = await res.json();
      setActiveQuiz(data.activeQuiz);
      setUserAttempt(data.userAttempt);
      setQuizzes(data.quizzes || []);
    } catch (error) {
      console.error("Error fetching quiz data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = () => {
    setView("quiz");
  };

  const handleQuizComplete = (result: any) => {
    setQuizResult(result);
    // Refresh user attempt status
    fetchQuizData(); 
    setView("result");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10 h-64">
        <Loader2 className="w-10 h-10 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {view === "welcome" && (
        <WelcomeScreen
          activeQuiz={activeQuiz}
          userAttempt={userAttempt}
          onStart={handleStartQuiz}
          onViewBank={() => setView("bank")}
        />
      )}

      {view === "quiz" && activeQuiz && (
        <QuizGame
          quiz={activeQuiz}
          onComplete={handleQuizComplete}
          onCancel={() => setView("welcome")}
        />
      )}

      {view === "result" && (
        <ResultScreen
          result={quizResult}
          attempt={userAttempt}
          onBack={() => setView("welcome")}
        />
      )}

      {view === "bank" && (
        <QuizBank
          quizzes={quizzes}
          onBack={() => setView("welcome")}
        />
      )}

    </div>
  );
}
