"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Save, ArrowLeft, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CreateQuizFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function CreateQuizForm({ onBack, onSuccess }: CreateQuizFormProps) {
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<any[]>([
    { question: "", options: ["", "", "", ""], correctAnswer: "", points: 100 },
    { question: "", options: ["", "", "", ""], correctAnswer: "", points: 100 },
    { question: "", options: ["", "", "", ""], correctAnswer: "", points: 100 },
    { question: "", options: ["", "", "", ""], correctAnswer: "", points: 100 },
    { question: "", options: ["", "", "", ""], correctAnswer: "", points: 100 }
  ]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "general",
    difficulty: "medium",
  });

  const handleQuestionChange = (index: number, field: string, value: any) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIndex: number, oIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex] = value;
    setQuestions(newQuestions);
  };

  const addQuestion = () => {
    setQuestions([...questions, { question: "", options: ["", "", "", ""], correctAnswer: "", points: 100 }]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length === 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate correct answers match options
      const invalid = questions.some(q => !q.options.includes(q.correctAnswer));
      if (invalid) {
        alert("Erro: A resposta correta deve ser idêntica a uma das opções.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          questions,
          startDate: new Date(),
        }),
      });

      if (!res.ok) throw new Error("Falha ao criar quiz");

      onSuccess();
    } catch (error) {
      console.error(error);
      alert("Erro ao criar quiz.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold text-white">Criar Novo Quiz</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>Detalhes do Quiz</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input 
                required
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="Ex: História do Timão 2012"
                className="bg-gray-800 border-gray-700" 
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Breve descrição do desafio..."
                className="bg-gray-800 border-gray-700" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Geral</SelectItem>
                    <SelectItem value="history">História</SelectItem>
                    <SelectItem value="players">Jogadores</SelectItem>
                    <SelectItem value="matches">Jogos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dificuldade</Label>
                <Select value={formData.difficulty} onValueChange={v => setFormData({...formData, difficulty: v})}>
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Fácil</SelectItem>
                    <SelectItem value="medium">Médio</SelectItem>
                    <SelectItem value="hard">Difícil</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {questions.map((q, qIndex) => (
            <Card key={qIndex} className="bg-gray-900 border-gray-800 relative group">
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <Label className="text-yellow-500">Questão {qIndex + 1}</Label>
                  {questions.length > 1 && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => removeQuestion(qIndex)}
                  className="text-gray-500 hover:text-red-500"
                >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <Input 
                  required
                  value={q.question}
                  onChange={e => handleQuestionChange(qIndex, 'question', e.target.value)}
                  placeholder="Digite a pergunta..."
                  className="bg-gray-800 border-gray-700 text-lg font-medium"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  {q.options.map((opt: string, oIndex: number) => (
                    <div key={oIndex} className="relative">
                      <div className="absolute left-3 top-2.5 text-xs text-gray-500">
                        {oIndex + 1}
                      </div>
                      <Input
                        required
                        value={opt}
                        onChange={e => handleOptionChange(qIndex, oIndex, e.target.value)}
                        placeholder={`Opção ${oIndex + 1}`}
                        className={`pl-8 bg-gray-800 border-gray-700 ${q.correctAnswer === opt && opt !== "" ? 'border-green-500 ring-1 ring-green-500' : ''}`}
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                   <Label className="text-xs text-gray-400 mb-1 block">Resposta Correta (Selecione ou digite idêntico)</Label>
                   <Select 
                      value={q.correctAnswer} 
                      onValueChange={v => handleQuestionChange(qIndex, 'correctAnswer', v)}
                   >
                    <SelectTrigger className="bg-gray-800 border-gray-700">
                       <SelectValue placeholder="Selecione a resposta correta" />
                    </SelectTrigger>
                    <SelectContent>
                       {q.options.map((opt: string, idx: number) => (
                          <SelectItem key={idx} value={opt || `opt-${idx}`} disabled={!opt}>
                             {opt || `Opção ${idx + 1} (vazia)`}
                          </SelectItem>
                       ))}
                    </SelectContent>
                   </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-between items-center pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={addQuestion}
            className="border border-dashed border-gray-700 hover:border-yellow-500 hover:text-yellow-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Questão
          </Button>

           <Button type="submit" disabled={loading} className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold min-w-[200px]">
             {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
             Salvar e Publicar Quiz
           </Button>
        </div>
      </form>
    </div>
  );
}
