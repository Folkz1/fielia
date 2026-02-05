"use client";

import { useState, useEffect } from "react";
import {
  Users, Crown, Activity, MessageSquare, Trophy, Target,
  Newspaper, CreditCard, Star, TrendingUp, RefreshCw, AlertCircle
} from "lucide-react";

interface Analytics {
  users: {
    total: number;
    premium: number;
    activeToday: number;
    activeThisWeek: number;
    newThisWeek: number;
    newThisMonth: number;
    expiringSubscriptions: number;
    conversionRate: string | number;
  };
  quiz: {
    totalAttempts: number;
    attemptsThisWeek: number;
    avgAccuracy: string | number;
    activeQuizzes: any[];
    upcomingQuizzes: any[];
  };
  chat: {
    totalMessages: number;
    messagesThisWeek: number;
    totalChats: number;
    avgMessagesPerChat: string | number;
  };
  news: {
    total: number;
    thisWeek: number;
  };
  topUsers: any[];
  recentUsers: any[];
}

export default function AdminDashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/analytics");
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Erro ao buscar analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-20 text-gray-400">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Erro ao carregar analytics</p>
        <button onClick={fetchAnalytics} className="mt-4 text-orange-500 hover:underline">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400">Visao geral do FIEL.IA</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <p className="text-gray-400 text-xs mb-1">Total Usuarios</p>
          <h3 className="text-2xl font-bold text-white">{analytics.users.total}</h3>
          <p className="text-xs text-blue-400 mt-1">+{analytics.users.newThisWeek} esta semana</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <Crown className="w-5 h-5 text-yellow-400" />
            </div>
          </div>
          <p className="text-gray-400 text-xs mb-1">Usuarios Premium</p>
          <h3 className="text-2xl font-bold text-white">{analytics.users.premium}</h3>
          <p className="text-xs text-yellow-400 mt-1">{analytics.users.conversionRate}% conversao</p>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Activity className="w-5 h-5 text-green-400" />
            </div>
          </div>
          <p className="text-gray-400 text-xs mb-1">Ativos Hoje</p>
          <h3 className="text-2xl font-bold text-white">{analytics.users.activeToday}</h3>
          <p className="text-xs text-green-400 mt-1">{analytics.users.activeThisWeek} na semana</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <MessageSquare className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <p className="text-gray-400 text-xs mb-1">Mensagens IA</p>
          <h3 className="text-2xl font-bold text-white">{analytics.chat.totalMessages}</h3>
          <p className="text-xs text-purple-400 mt-1">+{analytics.chat.messagesThisWeek} esta semana</p>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-gray-400">Quiz Attempts</span>
          </div>
          <p className="text-xl font-bold">{analytics.quiz.totalAttempts}</p>
          <p className="text-xs text-gray-500">+{analytics.quiz.attemptsThisWeek} esta semana</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-gray-400">Precisao Media</span>
          </div>
          <p className="text-xl font-bold">{analytics.quiz.avgAccuracy}%</p>
          <p className="text-xs text-gray-500">nos quizzes completos</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Newspaper className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-gray-400">Noticias</span>
          </div>
          <p className="text-xl font-bold">{analytics.news.total}</p>
          <p className="text-xs text-gray-500">+{analytics.news.thisWeek} esta semana</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 text-red-400" />
            <span className="text-sm text-gray-400">Expirando</span>
          </div>
          <p className="text-xl font-bold text-red-400">{analytics.users.expiringSubscriptions}</p>
          <p className="text-xs text-gray-500">nos proximos 7 dias</p>
        </div>
      </div>

      {/* Detailed Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Users */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Top 5 Usuarios
          </h3>
          <div className="space-y-3">
            {analytics.topUsers.map((user, index) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                    index === 0 ? 'bg-yellow-500 text-black' :
                    index === 1 ? 'bg-gray-400 text-black' :
                    index === 2 ? 'bg-orange-600 text-white' :
                    'bg-gray-700 text-gray-300'
                  }`}>
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-white">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-orange-400">{user.totalPoints} pts</p>
                  {user.isPremium && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">PRO</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Users */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Usuarios Recentes
          </h3>
          <div className="space-y-3">
            {analytics.recentUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-white">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                  {user.isPremium && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">PRO</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Quizzes */}
      {analytics.quiz.activeQuizzes.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-green-500" />
            Quizzes Ativos ({analytics.quiz.activeQuizzes.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics.quiz.activeQuizzes.map((quiz) => (
              <div key={quiz.id} className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <h4 className="font-bold text-white mb-2">{quiz.title}</h4>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span>{quiz._count.questions} perguntas</span>
                  <span>{quiz._count.attempts} tentativas</span>
                </div>
                <p className="text-xs text-green-400 mt-2">
                  Ate {new Date(quiz.endDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
