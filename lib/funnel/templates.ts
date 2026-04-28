export type FunnelStage =
  | 'welcome'
  | 'why_register'
  | 'registration_link'
  | 'quiz_reminder'
  | 'quiz_open'
  | 'post_quiz_cta';

export type FunnelTemplateParams = {
  name?: string | null;
  registrationUrl?: string | null;
  quizUrl?: string | null;
  score?: number | null;
  correctAnswers?: number | null;
  totalQuestions?: number | null;
};

function firstName(name?: string | null) {
  return String(name || 'Fiel').trim().split(/\s+/)[0] || 'Fiel';
}
export function buildFunnelMessage(stage: FunnelStage, params: FunnelTemplateParams = {}) {
  const name = firstName(params.name);
  const registrationUrl = params.registrationUrl || '';
  const quizUrl = params.quizUrl || registrationUrl;

  if (stage === 'welcome') {
    return `Fala, ${name}! Bem-vindo ao Fiel.IA. Aqui voce recebe conteudo do Corinthians, participa dos quizzes e acompanha seu desempenho no ranking.`;
  }

  if (stage === 'why_register') {
    return `O cadastro gratuito libera o quiz mensal e salva sua pontuacao com seguranca. Nao tem sorteio, nao tem trial: Premium e assinatura paga para quem quiser ranking completo, quiz semanal e IA no app.`;
  }

  if (stage === 'registration_link') {
    return `Para entrar no desafio, finalize seu cadastro aqui: ${registrationUrl}`;
  }

  if (stage === 'quiz_reminder') {
    return `O quiz mensal da Fiel abre no dia 15. Separe 2 minutos, responda rapido e veja sua posicao no Top 10.`;
  }

  if (stage === 'quiz_open') {
    return `Quiz liberado, ${name}. Responda agora e veja seu resultado: ${quizUrl}`;
  }

  const scoreText =
    typeof params.score === 'number'
      ? `Voce fez ${params.score} pontos`
      : 'Seu resultado ja esta salvo';
  const hitsText =
    typeof params.correctAnswers === 'number' && typeof params.totalQuestions === 'number'
      ? ` (${params.correctAnswers}/${params.totalQuestions} acertos)`
      : '';

  return `${scoreText}${hitsText}. Premium libera quiz semanal, ranking completo e chat IA no app. Assine quando quiser continuar disputando em nivel mais alto: ${registrationUrl}`;
}
