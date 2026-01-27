import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Users,
  MessageSquare,
  Zap,
  TrendingUp,
  Clock
} from "lucide-react";

export default async function DashboardPage() {
  // Fetch real-time metrics
  const totalUsers = await prisma.user.count();
  const premiumUsers = await prisma.user.count({ where: { isPremium: true } });
  const totalMessages = await prisma.aIMessage.count();
  
  // Latest messages
  const latestInteractions = await prisma.aIMessage.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      chat: {
        include: {
          user: true
        }
      }
    }
  });

  const cards = [
    {
      title: "Total de Torcedores",
      value: totalUsers,
      icon: Users,
      trend: "+12%",
      color: "blue"
    },
    {
      title: "Assinantes Premium",
      value: premiumUsers,
      icon: Zap,
      trend: "+5%",
      color: "yellow"
    },
    {
      title: "Interações Totais",
      value: totalMessages,
      icon: MessageSquare,
      trend: "+25%",
      color: "green"
    },
    {
      title: "Taxa de Engajamento",
      value: "84%",
      icon: TrendingUp,
      trend: "+2%",
      color: "purple"
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Bem-vindo, Fiel!</h1>
        <p className="text-gray-400">Aqui estão as métricas de hoje do seu ecossistema IA.</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:border-white/20 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-xl bg-white/5 group-hover:bg-white text-white group-hover:text-black transition-all">
                <card.icon className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
                {card.trend}
              </span>
            </div>
            <p className="text-gray-400 text-sm mb-1">{card.title}</p>
            <h3 className="text-2xl font-bold">{card.value}</h3>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Interactions */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold">Últimas Interações</h3>
            <Link href="/dashboard/chat" className="text-sm text-gray-400 hover:text-white transition-colors">
              Ver todas
            </Link>
          </div>

          <div className="space-y-6">
            {latestInteractions.map((msg) => (
              <div key={msg.id} className="flex items-start gap-4 p-4 rounded-2xl hover:bg-white/5 transition-all">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-xs font-bold">
                  {msg.chat.user.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium">{msg.chat.user.name}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 truncate">{msg.content}</p>
                </div>
              </div>
            ))}
            {latestInteractions.length === 0 && (
              <p className="text-center text-gray-500 py-8">Nenhuma interação registrada ainda.</p>
            )}
          </div>
        </div>

        {/* Quick Actions / Status */}
        <div className="space-y-8">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h3 className="text-xl font-bold mb-6">Status do Sistema</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Bot WhatsApp</span>
                <span className="flex items-center gap-2 text-green-500 text-sm">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">OpenRouter API</span>
                <span className="flex items-center gap-2 text-green-500 text-sm">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  98ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 text-sm">Base de Conhecimento</span>
                <span className="text-white text-sm">152 Vetores</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white/10 to-transparent border border-white/10 rounded-3xl p-8 relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-2 text-white">Prêmio Fiel IA</h3>
              <p className="text-gray-400 text-sm mb-6">Atualize os prêmios do quiz semanal para os torcedores.</p>
              <button className="w-full bg-white text-black font-bold py-3 rounded-xl hover:scale-105 transition-all">
                Configurar Prêmios
              </button>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                <Trophy className="w-32 h-32" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Trophy(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
    )
}
