"use client";

import { useState, useEffect } from "react";
import {
  Trophy, Plus, Sparkles, RefreshCw, CheckCircle, XCircle,
  Calendar, Trash2, Clock, ChevronDown, ChevronUp, Save, X
} from "lucide-react";

type QuizAudience = "free" | "premium";
type QuizCadence = "monthly" | "weekly";
type QuizTypeValue = `${QuizAudience}:${QuizCadence}`;

interface Quiz {
  id: string;
  title: string;
  description?: string;
  difficulty: string;
  category: string;
  audience: QuizAudience;
  cadence: QuizCadence;
  isActive: boolean;
  startDate: string;
  endDate: string;
  _count: {
    questions: number;
    attempts: number;
  };
}

interface GeneratedQuiz {
  title: string;
  description: string;
  questions: {
    question: string;
    options: string[];
    correctAnswer: string;
    points: number;
  }[];
}

interface ManualQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  points: number;
}

const QUIZ_TYPE_OPTIONS: Array<{
  value: QuizTypeValue;
  label: string;
  description: string;
}> = [
  {
    value: "free:monthly",
    label: "Free mensal",
    description: "Abre no /quiz-free, aparece no grupo e alimenta o ranking free.",
  },
  {
    value: "premium:weekly",
    label: "Premium semanal",
    description: "Exclusivo para assinantes, com ranking completo por quiz.",
  },
];

function splitQuizType(value: QuizTypeValue) {
  const [audience, cadence] = value.split(":") as [QuizAudience, QuizCadence];
  return { audience, cadence };
}

function quizTypeLabel(audience: string, cadence: string) {
  if (audience === "premium") return cadence === "weekly" ? "Premium semanal" : "Premium";
  return cadence === "monthly" ? "Free mensal" : "Free";
}

export default function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState<GeneratedQuiz | null>(null);
  const [saving, setSaving] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);

  // Form para geracao IA
  const [genForm, setGenForm] = useState({
    type: 'free:monthly' as QuizTypeValue,
    numQuestions: 10,
    difficulty: 'medium',
    category: 'general',
    startDate: '',
    endDate: '',
  });

  // Form para quiz manual
  const [manualForm, setManualForm] = useState({
    type: 'free:monthly' as QuizTypeValue,
    title: '',
    description: '',
    difficulty: 'medium',
    category: 'general',
    startDate: '',
    endDate: '',
  });

  const [manualQuestions, setManualQuestions] = useState<ManualQuestion[]>([
    { question: '', options: ['', '', '', ''], correctAnswer: '', points: 10 }
  ]);

  // Definir datas padrao (proxima segunda a domingo)
  useEffect(() => {
    const today = new Date();
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
    const nextSunday = new Date(nextMonday);
    nextSunday.setDate(nextMonday.getDate() + 6);

    const startDate = nextMonday.toISOString().split('T')[0];
    const endDate = nextSunday.toISOString().split('T')[0];

    setGenForm(prev => ({ ...prev, startDate, endDate }));
    setManualForm(prev => ({ ...prev, startDate, endDate }));
  }, []);

  async function fetchQuizzes() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/quiz");
      if (res.ok) {
        const data = await res.json();
        setQuizzes(data.quizzes || []);
      }
    } catch (error) {
      console.error("Erro ao buscar quizzes:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchQuizzes();
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setGeneratedQuiz(null);
    try {
      const { audience, cadence } = splitQuizType(genForm.type);
      const res = await fetch("/api/admin/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numQuestions: genForm.numQuestions,
          difficulty: genForm.difficulty,
          category: genForm.category,
          audience,
          cadence,
        }),
      });

      const data = await res.json();
      if (res.ok && data.generated) {
        setGeneratedQuiz(data.generated);
      } else {
        alert(data.error || "Erro ao gerar quiz");
      }
    } catch (error) {
      console.error("Erro ao gerar quiz:", error);
      alert("Erro de conexao");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSaveGenerated() {
    if (!generatedQuiz || !genForm.startDate || !genForm.endDate) return;

    setSaving(true);
    try {
      const { audience, cadence } = splitQuizType(genForm.type);
      const res = await fetch("/api/admin/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numQuestions: genForm.numQuestions,
          difficulty: genForm.difficulty,
          category: genForm.category,
          audience,
          cadence,
          startDate: genForm.startDate,
          endDate: genForm.endDate,
          saveToDb: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.quiz) {
        setGeneratedQuiz(null);
        setShowGenerator(false);
        fetchQuizzes();
        alert("Quiz criado com sucesso!");
      } else {
        alert(data.error || "Erro ao salvar quiz");
      }
    } catch (error) {
      console.error("Erro ao salvar quiz:", error);
      alert("Erro de conexao");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveManual() {
    // Validacoes
    if (!manualForm.title.trim()) {
      alert("Digite um titulo para o quiz");
      return;
    }
    if (!manualForm.startDate || !manualForm.endDate) {
      alert("Selecione as datas de inicio e fim");
      return;
    }

    const validQuestions = manualQuestions.filter(q =>
      q.question.trim() &&
      q.options.every(o => o.trim()) &&
      q.correctAnswer.trim()
    );

    if (validQuestions.length === 0) {
      alert("Adicione pelo menos uma pergunta completa");
      return;
    }

    setSaving(true);
    try {
      const { audience, cadence } = splitQuizType(manualForm.type);
      const res = await fetch("/api/admin/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: manualForm.title,
          description: manualForm.description,
          difficulty: manualForm.difficulty,
          category: manualForm.category,
          audience,
          cadence,
          startDate: manualForm.startDate,
          endDate: manualForm.endDate,
          questions: validQuestions,
        }),
      });

      const data = await res.json();
      if (res.ok && data.quiz) {
        // Reset form
        setManualForm({
          type: 'free:monthly',
          title: '',
          description: '',
          difficulty: 'medium',
          category: 'general',
          startDate: genForm.startDate,
          endDate: genForm.endDate,
        });
        setManualQuestions([
          { question: '', options: ['', '', '', ''], correctAnswer: '', points: 10 }
        ]);
        setShowManualForm(false);
        fetchQuizzes();
        alert("Quiz criado com sucesso!");
      } else {
        alert(data.error || "Erro ao salvar quiz");
      }
    } catch (error) {
      console.error("Erro ao salvar quiz:", error);
      alert("Erro de conexao");
    } finally {
      setSaving(false);
    }
  }

  function addQuestion() {
    setManualQuestions([
      ...manualQuestions,
      { question: '', options: ['', '', '', ''], correctAnswer: '', points: 10 }
    ]);
  }

  function removeQuestion(index: number) {
    if (manualQuestions.length > 1) {
      setManualQuestions(manualQuestions.filter((_, i) => i !== index));
    }
  }

  function updateQuestion(index: number, field: keyof ManualQuestion, value: string | number | string[]) {
    const updated = [...manualQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setManualQuestions(updated);
  }

  function updateOption(questionIndex: number, optionIndex: number, value: string) {
    const updated = [...manualQuestions];
    updated[questionIndex].options[optionIndex] = value;
    setManualQuestions(updated);
  }

  async function handleToggleActive(quizId: string, currentActive: boolean) {
    try {
      const res = await fetch(`/api/admin/quiz/${quizId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });

      if (res.ok) {
        fetchQuizzes();
      }
    } catch (error) {
      console.error("Erro ao atualizar quiz:", error);
    }
  }

  async function handleDelete(quizId: string) {
    if (!confirm("Tem certeza que deseja deletar este quiz?")) return;

    try {
      const res = await fetch(`/api/admin/quiz/${quizId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchQuizzes();
      }
    } catch (error) {
      console.error("Erro ao deletar quiz:", error);
    }
  }

  const now = new Date();
  const activeQuizzes = quizzes.filter(q => q.isActive && new Date(q.startDate) <= now && new Date(q.endDate) >= now);
  const upcomingQuizzes = quizzes.filter(q => q.isActive && new Date(q.startDate) > now);
  const pastQuizzes = quizzes.filter(q => new Date(q.endDate) < now || !q.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-8 h-8 text-orange-500" />
            Gerenciar Quizzes
          </h1>
          <p className="text-gray-400">Crie e gerencie quizzes semanais</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setShowManualForm(!showManualForm); setShowGenerator(false); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              showManualForm
                ? 'bg-orange-500 text-white'
                : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
            }`}
          >
            <Plus className="w-4 h-4" />
            Criar Manual
          </button>
          <button
            onClick={() => { setShowGenerator(!showGenerator); setShowManualForm(false); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              showGenerator
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Gerar com IA
          </button>
          <button
            onClick={fetchQuizzes}
            className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Manual Form */}
      {showManualForm && (
        <div className="bg-gradient-to-br from-orange-500/20 to-yellow-500/10 border border-orange-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-orange-400" />
              Criar Quiz Manualmente
            </h2>
            <button
              onClick={() => setShowManualForm(false)}
              className="p-1 hover:bg-white/10 rounded"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Info do Quiz */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo / Ranking *</label>
              <select
                value={manualForm.type}
                onChange={(e) => setManualForm({ ...manualForm, type: e.target.value as QuizTypeValue })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              >
                {QUIZ_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                {QUIZ_TYPE_OPTIONS.find((option) => option.value === manualForm.type)?.description}
              </p>
            </div>
            <div className="md:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium mb-1">Titulo *</label>
              <input
                type="text"
                value={manualForm.title}
                onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                placeholder="Ex: Quiz Semanal - Semana 10"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Dificuldade</label>
              <select
                value={manualForm.difficulty}
                onChange={(e) => setManualForm({ ...manualForm, difficulty: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              >
                <option value="easy">Facil</option>
                <option value="medium">Media</option>
                <option value="hard">Dificil</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Categoria</label>
              <select
                value={manualForm.category}
                onChange={(e) => setManualForm({ ...manualForm, category: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              >
                <option value="general">Geral</option>
                <option value="history">Historia</option>
                <option value="players">Jogadores</option>
                <option value="titles">Titulos</option>
                <option value="current">Atualidades</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Data Inicio *</label>
              <input
                type="date"
                value={manualForm.startDate}
                onChange={(e) => setManualForm({ ...manualForm, startDate: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Data Fim *</label>
              <input
                type="date"
                value={manualForm.endDate}
                onChange={(e) => setManualForm({ ...manualForm, endDate: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium mb-1">Descricao</label>
              <input
                type="text"
                value={manualForm.description}
                onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                placeholder="Descricao opcional do quiz"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              />
            </div>
          </div>

          {/* Perguntas */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white">Perguntas ({manualQuestions.length})</h3>
              <button
                onClick={addQuestion}
                className="flex items-center gap-1 px-3 py-1.5 bg-white/10 rounded-lg hover:bg-white/20 text-sm"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {manualQuestions.map((q, qIndex) => (
                <div key={qIndex} className="p-4 bg-black/30 rounded-lg border border-white/10">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-medium text-orange-400">Pergunta {qIndex + 1}</span>
                    {manualQuestions.length > 1 && (
                      <button
                        onClick={() => removeQuestion(qIndex)}
                        className="p-1 text-red-400 hover:bg-red-500/20 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={q.question}
                    onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                    placeholder="Digite a pergunta"
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg mb-3 focus:border-orange-500 focus:outline-none"
                  />

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {q.options.map((opt, oIndex) => (
                      <input
                        key={oIndex}
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        placeholder={`Opcao ${oIndex + 1}`}
                        className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:border-orange-500 focus:outline-none"
                      />
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-400 mb-1">Resposta Correta</label>
                      <select
                        value={q.correctAnswer}
                        onChange={(e) => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
                      >
                        <option value="">Selecione...</option>
                        {q.options.map((opt, i) => opt && (
                          <option key={i} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24">
                      <label className="block text-xs text-gray-400 mb-1">Pontos</label>
                      <input
                        type="number"
                        value={q.points}
                        onChange={(e) => updateQuestion(qIndex, 'points', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
                        min={1}
                        max={100}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleSaveManual}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar Quiz
              </>
            )}
          </button>
        </div>
      )}

      {/* Generator Panel (IA) */}
      {showGenerator && (
        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Gerar Quiz com IA
            </h2>
            <button
              onClick={() => setShowGenerator(false)}
              className="p-1 hover:bg-white/10 rounded"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <p className="text-gray-400 text-sm mb-6">
            A IA usara o conhecimento da base RAG e noticias recentes para criar perguntas relevantes.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Tipo / Ranking</label>
              <select
                value={genForm.type}
                onChange={(e) => setGenForm({ ...genForm, type: e.target.value as QuizTypeValue })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              >
                {QUIZ_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">
                {QUIZ_TYPE_OPTIONS.find((option) => option.value === genForm.type)?.description}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Perguntas</label>
              <select
                value={genForm.numQuestions}
                onChange={(e) => setGenForm({ ...genForm, numQuestions: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              >
                <option value={5}>5 perguntas</option>
                <option value={10}>10 perguntas</option>
                <option value={15}>15 perguntas</option>
                <option value={20}>20 perguntas</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Dificuldade</label>
              <select
                value={genForm.difficulty}
                onChange={(e) => setGenForm({ ...genForm, difficulty: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              >
                <option value="easy">Facil</option>
                <option value="medium">Media</option>
                <option value="hard">Dificil</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Data Inicio</label>
              <input
                type="date"
                value={genForm.startDate}
                onChange={(e) => setGenForm({ ...genForm, startDate: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Data Fim</label>
              <input
                type="date"
                value={genForm.endDate}
                onChange={(e) => setGenForm({ ...genForm, endDate: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-colors"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Gerar Preview
                </>
              )}
            </button>

            {generatedQuiz && (
              <button
                onClick={handleSaveGenerated}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Salvar Quiz
                  </>
                )}
              </button>
            )}
          </div>

          {/* Generated Preview */}
          {generatedQuiz && (
            <div className="mt-6 p-4 bg-black/30 rounded-lg">
              <h3 className="font-bold text-lg text-white mb-2">{generatedQuiz.title}</h3>
              <p className="text-gray-400 text-sm mb-4">{generatedQuiz.description}</p>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {generatedQuiz.questions.map((q, i) => (
                  <div key={i} className="p-3 bg-white/5 rounded-lg">
                    <p className="font-medium text-white mb-2">
                      {i + 1}. {q.question}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((opt, j) => (
                        <div
                          key={j}
                          className={`px-3 py-1.5 rounded text-sm ${
                            opt === q.correctAnswer
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                              : 'bg-gray-800 text-gray-400'
                          }`}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{q.points} pontos</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Quizzes */}
      {activeQuizzes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-green-400 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Quizzes Ativos ({activeQuizzes.length})
          </h2>
          {activeQuizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              expanded={expandedQuiz === quiz.id}
              onToggleExpand={() => setExpandedQuiz(expandedQuiz === quiz.id ? null : quiz.id)}
              onToggleActive={() => handleToggleActive(quiz.id, quiz.isActive)}
              onDelete={() => handleDelete(quiz.id)}
              status="active"
            />
          ))}
        </div>
      )}

      {/* Upcoming Quizzes */}
      {upcomingQuizzes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-blue-400 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Proximos Quizzes ({upcomingQuizzes.length})
          </h2>
          {upcomingQuizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              expanded={expandedQuiz === quiz.id}
              onToggleExpand={() => setExpandedQuiz(expandedQuiz === quiz.id ? null : quiz.id)}
              onToggleActive={() => handleToggleActive(quiz.id, quiz.isActive)}
              onDelete={() => handleDelete(quiz.id)}
              status="upcoming"
            />
          ))}
        </div>
      )}

      {/* Past Quizzes */}
      {pastQuizzes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-400 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Quizzes Anteriores ({pastQuizzes.length})
          </h2>
          {pastQuizzes.slice(0, 5).map((quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              expanded={expandedQuiz === quiz.id}
              onToggleExpand={() => setExpandedQuiz(expandedQuiz === quiz.id ? null : quiz.id)}
              onToggleActive={() => handleToggleActive(quiz.id, quiz.isActive)}
              onDelete={() => handleDelete(quiz.id)}
              status="past"
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && quizzes.length === 0 && !showGenerator && !showManualForm && (
        <div className="text-center py-20 text-gray-400">
          <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <h3 className="text-xl font-bold text-white mb-2">Nenhum quiz ainda</h3>
          <p className="mb-4">Crie seu primeiro quiz manualmente ou usando a IA!</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setShowManualForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Criar Manual
            </button>
            <button
              onClick={() => setShowGenerator(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg"
            >
              <Sparkles className="w-4 h-4" />
              Gerar com IA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuizCard({
  quiz,
  expanded,
  onToggleExpand,
  onToggleActive,
  onDelete,
  status,
}: {
  quiz: Quiz;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  status: 'active' | 'upcoming' | 'past';
}) {
  const statusColors = {
    active: 'border-green-500/30 bg-green-500/5',
    upcoming: 'border-blue-500/30 bg-blue-500/5',
    past: 'border-gray-500/30 bg-gray-500/5',
  };

  return (
    <div className={`border rounded-xl overflow-hidden ${statusColors[status]}`}>
      <div className="p-4 flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-white">{quiz.title}</h3>
            <span className={`px-2 py-0.5 text-xs rounded ${
              quiz.audience === 'premium'
                ? 'bg-yellow-500/20 text-yellow-300'
                : 'bg-blue-500/20 text-blue-300'
            }`}>
              {quizTypeLabel(quiz.audience, quiz.cadence)}
            </span>
            {quiz.isActive && (
              <span className="px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-400">Ativo</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-400">
            <span>{quiz._count.questions} perguntas</span>
            <span>{quiz._count.attempts} tentativas</span>
            <span>
              {new Date(quiz.startDate).toLocaleDateString('pt-BR')} - {new Date(quiz.endDate).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleActive}
            className={`p-2 rounded-lg transition-colors ${
              quiz.isActive
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
            }`}
            title={quiz.isActive ? 'Desativar' : 'Ativar'}
          >
            {quiz.isActive ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
            title="Deletar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleExpand}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-white/10 pt-4">
          <p className="text-gray-400 text-sm mb-4">{quiz.description || 'Sem descricao'}</p>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 text-xs rounded bg-white/10">
              Dificuldade: {quiz.difficulty}
            </span>
            <span className="px-2 py-1 text-xs rounded bg-white/10">
              Categoria: {quiz.category}
            </span>
            <span className="px-2 py-1 text-xs rounded bg-white/10">
              Ranking: {quiz.audience === 'premium' ? 'premium' : 'free'} / {quiz.cadence}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
