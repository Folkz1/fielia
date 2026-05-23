import { sendChatCompletion, ChatMessage } from './openrouter';
import { prisma } from './prisma';

interface GeneratedQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  points: number;
}

interface GeneratedQuiz {
  title: string;
  description: string;
  questions: GeneratedQuestion[];
}

/**
 * Busca contexto do RAG e noticias recentes para gerar quiz
 */
async function getQuizContext(): Promise<string> {
  let context = '';

  // Buscar conhecimento do RAG
  try {
    const knowledge = await prisma.knowledge.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: { title: true, content: true, category: true },
    });

    if (knowledge.length > 0) {
      context += '=== CONHECIMENTO DO CORINTHIANS ===\n';
      for (const k of knowledge) {
        context += `[${k.category}] ${k.title}: ${k.content.substring(0, 500)}...\n\n`;
      }
    }
  } catch (error) {
    console.error('Erro ao buscar conhecimento RAG:', error);
  }

  // Buscar noticias recentes
  try {
    const news = await prisma.news.findMany({
      take: 5,
      orderBy: { publishedAt: 'desc' },
      select: { title: true, summary: true, category: true },
    });

    if (news.length > 0) {
      context += '\n=== NOTICIAS RECENTES ===\n';
      for (const n of news) {
        context += `[${n.category}] ${n.title}: ${n.summary.substring(0, 300)}...\n\n`;
      }
    }
  } catch (error) {
    console.error('Erro ao buscar noticias:', error);
  }

  return context;
}

/**
 * Gera um quiz usando IA com base no conhecimento RAG e noticias
 */
export async function generateQuizWithAI(options?: {
  numQuestions?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  category?: string;
  customPrompt?: string;
}): Promise<GeneratedQuiz> {
  const {
    numQuestions = 10,
    difficulty = 'medium',
    category = 'general',
    customPrompt,
  } = options || {};

  const context = await getQuizContext();

  const difficultyDescription = {
    easy: 'perguntas faceis, fatos basicos e conhecidos',
    medium: 'perguntas de dificuldade media, requer conhecimento moderado',
    hard: 'perguntas dificeis, detalhes especificos e fatos menos conhecidos',
  };

  const categoryDescription = {
    history: 'historia do clube, fundacao, momentos historicos',
    players: 'jogadores, idolos, artilheiros, craques',
    titles: 'titulos, campeonatos, conquistas',
    stadium: 'Neo Quimica Arena, Itaquerao, estadios anteriores',
    general: 'conhecimentos gerais sobre o Corinthians',
    current: 'noticias recentes, elenco atual, temporada',
  };

  const systemPrompt = `Voce e um especialista em criar quizzes sobre o Sport Club Corinthians Paulista.
Voce deve criar perguntas precisas, interessantes e educativas para torcedores.

REGRAS IMPORTANTES:
1. Todas as informacoes devem ser VERDADEIRAS e VERIFICAVEIS
2. Cada pergunta deve ter EXATAMENTE 4 opcoes (A, B, C, D)
3. Apenas UMA opcao deve ser correta
4. As opcoes incorretas devem ser plausíveis mas claramente erradas
5. Varie os temas dentro da categoria solicitada
6. Use linguagem clara e objetiva
7. Pontuacao: facil=50pts, media=100pts, dificil=150pts

${context ? `\nUSE ESTE CONTEXTO COMO REFERENCIA:\n${context}` : ''}`;

  const userPrompt = customPrompt || `Crie um quiz sobre o Corinthians com as seguintes especificacoes:

- Numero de perguntas: ${numQuestions}
- Dificuldade: ${difficulty} (${difficultyDescription[difficulty]})
- Categoria principal: ${category} (${categoryDescription[category as keyof typeof categoryDescription] || 'geral'})

Responda APENAS com um JSON valido no seguinte formato (sem markdown, sem explicacoes):
{
  "title": "Titulo criativo do quiz",
  "description": "Descricao breve do quiz",
  "questions": [
    {
      "question": "Texto da pergunta?",
      "options": ["Opcao A", "Opcao B", "Opcao C", "Opcao D"],
      "correctAnswer": "Opcao correta (exatamente igual a uma das opcoes)",
      "points": 100
    }
  ]
}`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const response = await sendChatCompletion(messages, {
    temperature: 0.7,
    maxTokens: 4000,
  });

  // Parse do JSON da resposta
  let quizData: GeneratedQuiz;
  try {
    // Tentar extrair JSON da resposta (pode vir com markdown)
    let jsonStr = response.content;

    // Remover markdown code blocks se existirem
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    // Limpar e fazer parse
    jsonStr = jsonStr.trim();
    quizData = JSON.parse(jsonStr);
  } catch (error) {
    console.error('Erro ao fazer parse do quiz:', error);
    console.error('Resposta recebida:', response.content);
    throw new Error('Falha ao processar resposta da IA. Tente novamente.');
  }

  // Validar estrutura
  if (!quizData.title || !quizData.questions || !Array.isArray(quizData.questions)) {
    throw new Error('Estrutura do quiz invalida');
  }

  // Validar cada pergunta
  for (const q of quizData.questions) {
    if (!q.question || !q.options || q.options.length !== 4 || !q.correctAnswer) {
      throw new Error('Pergunta com formato invalido');
    }
    if (!q.options.includes(q.correctAnswer)) {
      // Tentar corrigir: usar primeira opcao como resposta
      console.warn('Resposta correta nao encontrada nas opcoes, ajustando...');
      q.correctAnswer = q.options[0];
    }
  }

  return quizData;
}

/**
 * Cria um quiz no banco de dados a partir dos dados gerados
 */
export async function saveGeneratedQuiz(
  quizData: GeneratedQuiz,
  startDate: Date,
  endDate: Date,
  options?: {
    audience?: 'free' | 'premium';
    cadence?: 'monthly' | 'weekly' | 'on_demand';
    difficulty?: 'easy' | 'medium' | 'hard';
    category?: string;
  }
) {
  const audience = options?.audience || 'free';
  const cadence = options?.cadence || (audience === 'premium' ? 'weekly' : 'monthly');

  await prisma.quiz.updateMany({
    where: { isActive: true, audience, cadence },
    data: { isActive: false },
  });

  const quiz = await prisma.quiz.create({
    data: {
      title: quizData.title,
      description: quizData.description,
      difficulty: options?.difficulty || 'medium',
      category: options?.category || 'general',
      audience,
      cadence,
      startDate,
      endDate,
      isActive: true,
      questions: {
        create: quizData.questions.map((q, index) => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          points: q.points || 100,
          order: index,
        })),
      },
    },
    include: {
      questions: true,
      _count: { select: { questions: true } },
    },
  });

  return quiz;
}
