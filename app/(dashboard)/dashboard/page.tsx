import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Trophy,
  Crown,
  Newspaper,
  Star,
  Target,
  Flame,
  ChevronRight
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;

  // Buscar dados do usuario
  let userData = null;
  let userRanking = 0;
  let totalRanked = 0;
  let recentNews: { id: string; title: string; publishedAt: Date }[] = [];
  let activeQuiz = null;

  if (userId) {
    userData = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        totalPoints: true,
        currentStreak: true,
        maxStreak: true,
        isPremium: true,
        quizAttempts: {
          take: 5,
          orderBy: { startedAt: 'desc' },
          include: { quiz: true }
        }
      }
    });

    // Calcular ranking do usuario
    if (userData) {
      const usersAbove = await prisma.user.count({
        where: { totalPoints: { gt: userData.totalPoints } }
      });
      userRanking = usersAbove + 1;
      totalRanked = await prisma.user.count({ where: { totalPoints: { gt: 0 } } });
    }

    // Quiz ativo da semana
    activeQuiz = await prisma.quiz.findFirst({
      where: {
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
        isActive: true
      },
      include: {
        _count: { select: { questions: true } }
      }
    });
  }

  // Ultimas noticias
  recentNews = await prisma.news.findMany({
    take: 3,
    orderBy: { publishedAt: 'desc' }
  });

  const streak = userData?.currentStreak || 0;
  const points = userData?.totalPoints || 0;

  return (
    <div className="space-y-8">
      {/* Header de boas vindas */}
      <div>
        <h1 className="text-3xl font-bold mb-2">
          Fala, {userData?.name || 'Fiel'}! 🖤🤍
        </h1>
        <p className="text-gray-400">Continue jogando e suba no ranking da Fiel Torcida!</p>
        <div className="mt-2">
          {userData?.isPremium ? (
            <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
              <Crown className="w-3 h-3 mr-1" /> Premium
            </Badge>
          ) : (
            <Badge variant="outline" className="text-gray-400 border-white/20">
              Plano Gratuito
            </Badge>
          )}
        </div>
      </div>

      {/* WhatsApp Bot Banner */}
      <a
        href="https://wa.me/5511982129134?text=Ol%C3%A1%20FIEL%20IA!"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-4 bg-green-600/10 border border-green-600/30 rounded-2xl p-4 hover:bg-green-600/20 transition-colors"
      >
        <div className="p-2.5 rounded-xl bg-green-600/20 flex-shrink-0">
          <MessageSquare className="w-5 h-5 text-green-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Converse com a FIEL IA no WhatsApp!</p>
          <p className="text-xs text-gray-400">Toque para abrir o chat e perguntar qualquer coisa sobre o Timão</p>
        </div>
        <ChevronRight className="w-5 h-5 text-green-500 flex-shrink-0" />
      </a>

      {/* Cards do Torcedor */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pontos */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-[var(--gradient-accent-start)]/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-[var(--gradient-accent-start)]/20">
              <Star className="w-5 h-5 text-[var(--gradient-accent-start)]" />
            </div>
          </div>
          <p className="text-gray-400 text-xs mb-1">Meus Pontos</p>
          <h3 className="text-2xl font-bold">{points.toLocaleString()}</h3>
        </div>

        {/* Ranking */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-[var(--gradient-accent-start)]/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-yellow-500/20">
              <Crown className="w-5 h-5 text-yellow-500" />
            </div>
          </div>
          <p className="text-gray-400 text-xs mb-1">Meu Ranking</p>
          <h3 className="text-2xl font-bold">
            {userRanking > 0 ? `#${userRanking}` : '-'}
            {totalRanked > 0 && <span className="text-sm text-gray-500 font-normal"> / {totalRanked}</span>}
          </h3>
        </div>

        {/* Streak */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-[var(--gradient-accent-start)]/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-orange-500/20">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
          </div>
          <p className="text-gray-400 text-xs mb-1">Sequência</p>
          <h3 className="text-2xl font-bold">{streak} dias 🔥</h3>
        </div>

        {/* Quiz */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-[var(--gradient-accent-start)]/50 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-green-500/20">
              <Target className="w-5 h-5 text-green-500" />
            </div>
          </div>
          <p className="text-gray-400 text-xs mb-1">Quizzes</p>
          <h3 className="text-2xl font-bold">{userData?.quizAttempts?.length || 0}</h3>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quiz da Semana */}
        <div className="lg:col-span-2">
          <div className="bg-gradient-to-br from-[var(--gradient-accent-start)]/20 to-transparent border border-[var(--gradient-accent-start)]/30 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="w-8 h-8 text-[var(--gradient-accent-start)]" />
              <div>
                <h3 className="text-xl font-bold">Quiz da Semana</h3>
                <p className="text-sm text-gray-400">
                  {activeQuiz ? `${activeQuiz._count.questions} perguntas disponíveis` : 'Nenhum quiz ativo'}
                </p>
              </div>
            </div>

            {activeQuiz ? (
              <div className="space-y-4">
                <p className="text-gray-300">{activeQuiz.title}</p>
                <Link
                  href="/dashboard/quiz"
                  className="inline-flex items-center gap-2 btn-primary"
                >
                  Jogar Agora
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <p className="text-gray-500">O próximo quiz será liberado em breve!</p>
            )}
          </div>

          {/* Chat IA */}
          <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-[var(--gradient-accent-start)]" />
                <h3 className="text-lg font-bold">Chat com a IA do Timão</h3>
              </div>
              <Link href="/dashboard/chat" className="text-sm text-[var(--gradient-accent-start)] hover:underline">
                Abrir Chat
              </Link>
            </div>
            <p className="text-gray-400 text-sm">
              Tire suas dúvidas sobre o Corinthians, história, jogadores, títulos e muito mais!
            </p>
          </div>
        </div>

        {/* Noticias */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-[var(--gradient-accent-start)]" />
              <h3 className="text-lg font-bold">Últimas Notícias</h3>
            </div>
            <Link href="/dashboard/news" className="text-xs text-gray-400 hover:text-white">
              Ver todas
            </Link>
          </div>

          <div className="space-y-4">
            {recentNews.map((news) => (
              <div key={news.id} className="border-b border-white/5 pb-4 last:border-0 last:pb-0">
                <h4 className="text-sm font-medium mb-1 line-clamp-2 hover:text-[var(--gradient-accent-start)] transition-colors cursor-pointer">
                  {news.title}
                </h4>
                <p className="text-xs text-gray-500">
                  {new Date(news.publishedAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            ))}
            {recentNews.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">Nenhuma notícia ainda.</p>
            )}
          </div>
        </div>
      </div>

      {/* Premium CTA - apenas para nao premium */}
      {!userData?.isPremium && (
        <div className="bg-gradient-to-r from-[var(--gradient-accent-start)]/20 to-yellow-500/20 border border-[var(--gradient-accent-start)]/30 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Crown className="w-6 h-6 text-yellow-500" />
                Seja Fiel Premium!
              </h3>
              <p className="text-gray-400 text-sm mt-1">
                Desbloqueie chat ilimitado, quiz semanal e ranking completo.
              </p>
            </div>
            <Link href="/dashboard/settings" className="btn-primary whitespace-nowrap">
              Assinar por R$ 56,90/mês
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
