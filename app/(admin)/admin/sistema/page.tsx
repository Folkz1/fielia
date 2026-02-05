"use client";

import { useState, useEffect } from "react";
import { Settings, Clock, RefreshCw, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface SchedulerStatus {
  cronEnabled: boolean;
  nodeEnv: string;
  schedules: {
    newsSync: string;
    newsCuration: string;
    newsletter: string;
    weeklyQuiz: string;
  };
  freshRss: {
    url: string;
    categoryId: string;
  };
}

export default function AdminSistemaPage() {
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchSchedulerStatus() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/scheduler");
      if (res.ok) {
        const data = await res.json();
        setSchedulerStatus(data);
      }
    } catch (error) {
      console.error("Erro ao buscar status do scheduler:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSchedulerStatus();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <Settings className="w-8 h-8 text-orange-500" />
            Sistema
          </h1>
          <p className="text-gray-400">Configuracoes e status do sistema</p>
        </div>
        <button
          onClick={fetchSchedulerStatus}
          className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Status do Scheduler */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
          <Clock className="w-5 h-5 text-orange-500" />
          Status do Scheduler
        </h2>

        {loading ? (
          <div className="text-center py-8 text-gray-400">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
            Carregando status...
          </div>
        ) : schedulerStatus ? (
          <div className="space-y-6">
            {/* Status Geral */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-black/30 rounded-lg">
                {schedulerStatus.cronEnabled ? (
                  <CheckCircle className="w-6 h-6 text-green-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-400" />
                )}
                <div>
                  <p className="font-medium text-white">CRON Habilitado</p>
                  <p className="text-sm text-gray-400">{schedulerStatus.cronEnabled ? "Ativo" : "Desativado"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-black/30 rounded-lg">
                {schedulerStatus.nodeEnv === "production" ? (
                  <CheckCircle className="w-6 h-6 text-green-400" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-yellow-400" />
                )}
                <div>
                  <p className="font-medium text-white">Ambiente</p>
                  <p className="text-sm text-gray-400">{schedulerStatus.nodeEnv || "development"}</p>
                </div>
              </div>
            </div>

            {/* Agendamentos */}
            <div>
              <h3 className="font-medium mb-3 text-white">Agendamentos Configurados</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-black/30 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Sync Noticias</p>
                  <code className="text-orange-400">{schedulerStatus.schedules.newsSync}</code>
                </div>
                <div className="p-3 bg-black/30 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Curacao de Noticias</p>
                  <code className="text-orange-400">{schedulerStatus.schedules.newsCuration}</code>
                </div>
                <div className="p-3 bg-black/30 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Newsletter</p>
                  <code className="text-orange-400">{schedulerStatus.schedules.newsletter}</code>
                </div>
                <div className="p-3 bg-black/30 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Quiz Semanal</p>
                  <code className="text-orange-400">{schedulerStatus.schedules.weeklyQuiz}</code>
                </div>
              </div>
            </div>

            {/* FreshRSS */}
            <div>
              <h3 className="font-medium mb-3 text-white">Configuracao FreshRSS</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-black/30 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">URL</p>
                  <span className={schedulerStatus.freshRss.url === "configured" ? "text-green-400" : "text-red-400"}>
                    {schedulerStatus.freshRss.url}
                  </span>
                </div>
                <div className="p-3 bg-black/30 rounded-lg">
                  <p className="text-sm text-gray-400 mb-1">Categoria</p>
                  <code className="text-orange-400">{schedulerStatus.freshRss.categoryId}</code>
                </div>
              </div>
            </div>

            {schedulerStatus.nodeEnv !== "production" && (
              <div className="p-4 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Ambiente de Desenvolvimento</p>
                    <p className="text-sm mt-1">
                      O scheduler automatico so roda em producao (NODE_ENV=production).
                      Use as funcoes de sincronizacao manual nas paginas de Noticias e Quizzes.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Erro ao carregar status do scheduler</p>
          </div>
        )}
      </div>

      {/* Environment Info */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-orange-500" />
          Informacoes do Sistema
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3 bg-black/30 rounded-lg">
            <p className="text-sm text-gray-400">Versao</p>
            <p className="font-medium text-white">FIEL.IA v1.0.0</p>
          </div>
          <div className="p-3 bg-black/30 rounded-lg">
            <p className="text-sm text-gray-400">Framework</p>
            <p className="font-medium text-white">Next.js 16</p>
          </div>
          <div className="p-3 bg-black/30 rounded-lg">
            <p className="text-sm text-gray-400">Database</p>
            <p className="font-medium text-white">PostgreSQL + Prisma</p>
          </div>
          <div className="p-3 bg-black/30 rounded-lg">
            <p className="text-sm text-gray-400">AI Provider</p>
            <p className="font-medium text-white">OpenRouter</p>
          </div>
        </div>
      </div>
    </div>
  );
}
