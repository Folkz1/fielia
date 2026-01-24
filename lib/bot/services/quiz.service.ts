import { prisma } from '@/lib/prisma';

export async function startQuiz(userId: string) {
  try {
    // 1. Get User
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return { content: "Usuário não encontrado.", type: 'text' };

    // 2. Get Active Quiz
    const quiz = await prisma.quiz.findFirst({
      where: { isActive: true },
      include: { questions: { orderBy: { order: 'asc' } } },
    });

    if (!quiz || quiz.questions.length === 0) {
      return { 
        content: "😔 Nenhum quiz ativo no momento. Volte mais tarde!", 
        type: 'text' 
      };
    }

    // 3. Create Attempt
    const attempt = await prisma.quizAttempt.create({
      data: {
        userId: user.id,
        quizId: quiz.id,
      },
    });

    // 4. Update User State
    await prisma.user.update({
      where: { id: user.id },
      data: { currentAction: `quiz:${quiz.id}:${attempt.id}` },
    });

    // 5. Send First Question
    const firstQuestion = quiz.questions[0];
    return formatQuestionMessage(firstQuestion, 1, quiz.questions.length);

  } catch (error) {
    console.error('Error starting quiz:', error);
    return { content: "Erro ao iniciar o quiz. Tente novamente.", type: 'text' };
  }
}

export async function processQuizAnswer(userId: string, userAction: string, answer: string) {
  try {
    const [_, quizId, attemptId] = userAction.split(':');
    
    // 1. Get current state
    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { 
        answers: true,
        quiz: { include: { questions: { orderBy: { order: 'asc' } } } } 
      },
    });

    if (!attempt) return { content: "Erro na sessão do quiz.", type: 'text' };

    const currentQuestionIndex = attempt.answers.length;
    const questions = attempt.quiz.questions;
    const currentQuestion = questions[currentQuestionIndex];

    // 2. Validate input (Should be 1, 2, 3, 4 or names)
    let selectedOption = "";
    const index = parseInt(answer) - 1;
    if (index >= 0 && index < currentQuestion.options.length) {
      selectedOption = currentQuestion.options[index];
    } else {
      // Try to match the text
      selectedOption = currentQuestion.options.find(opt => opt.toLowerCase() === answer.toLowerCase()) || "";
    }

    if (!selectedOption) {
      return { 
        content: "❌ Opção inválida. Por favor, responda com o número da opção (1, 2, 3, 4).", 
        type: 'text' 
      };
    }

    // 3. Save Answer
    const isCorrect = selectedOption === currentQuestion.correctAnswer;
    await prisma.quizAnswer.create({
      data: {
        attemptId: attempt.id,
        questionId: currentQuestion.id,
        answer: selectedOption,
        isCorrect: isCorrect,
        timeTaken: 0, // Placeholder
        pointsEarned: isCorrect ? currentQuestion.points : 0,
      }
    });

    // 4. Update Attempt Score
    const updatedScore = attempt.score + (isCorrect ? 1 : 0);
    const updatedPoints = attempt.totalPoints + (isCorrect ? currentQuestion.points : 0);
    
    await prisma.quizAttempt.update({
      where: { id: attempt.id },
      data: { 
        score: updatedScore,
        totalPoints: updatedPoints,
      }
    });

    // 5. Feedback and Next Question
    let feedback = isCorrect ? "✅ *Correto!*" : `❌ *Errado!* A resposta certa era: *${currentQuestion.correctAnswer}*`;
    feedback += "\n\n";

    if (currentQuestionIndex + 1 < questions.length) {
      const nextQuestion = questions[currentQuestionIndex + 1];
      const nextMsg = formatQuestionMessage(nextQuestion, currentQuestionIndex + 2, questions.length);
      return {
        content: feedback + nextMsg.content,
        type: 'text'
      };
    } else {
      // Finish Quiz
      await prisma.quizAttempt.update({
        where: { id: attempt.id },
        data: { 
          completedAt: new Date(),
          accuracy: (updatedScore / questions.length) * 100
        }
      });

      // Update User Points
      await prisma.user.update({
        where: { id: userId },
        data: { 
          currentAction: null,
          totalPoints: { increment: updatedPoints }
        }
      });

      return {
        content: feedback + `🏁 *Quiz Finalizado!*\n\nVocê acertou ${updatedScore} de ${questions.length} perguntas.\nGanhou *${updatedPoints} pontos*! 🚀`,
        type: 'text'
      };
    }

  } catch (error) {
    console.error('Error processing quiz answer:', error);
    return { content: "Erro ao processar resposta.", type: 'text' };
  }
}

function formatQuestionMessage(question: any, index: number, total: number) {
  let content = `❓ *Pergunta ${index}/${total}*\n\n${question.question}\n\n`;
  question.options.forEach((opt: string, i: number) => {
    content += `${i + 1}. ${opt}\n`;
  });
  content += `\n_Responda com o número da opção._`;
  
  return {
    content,
    type: 'text' as const
  };
}
