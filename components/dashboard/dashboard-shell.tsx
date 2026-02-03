"use client";

import { MobileSidebar } from "./mobile-sidebar";
import { Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface DashboardShellProps {
  children: React.ReactNode;
  userName?: string | null;
  userEmail?: string | null;
  onSignOut?: () => void;
  isAdmin?: boolean;
}

// Mapeamento de rotas para titulos
const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/chat": "Chat IA",
  "/dashboard/quiz": "Quiz Semanal",
  "/dashboard/ranking": "Ranking",
  "/dashboard/news": "Noticias",
  "/dashboard/account": "Minha Conta",
  "/dashboard/settings": "Configuracoes",
  "/dashboard/admin": "Painel Admin",
};

export function DashboardShell({
  children,
  userName,
  userEmail,
  onSignOut,
  isAdmin,
}: DashboardShellProps) {
  const pathname = usePathname();
  const pageTitle = ROUTE_TITLES[pathname] || "Dashboard";

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Sidebar Responsiva */}
      <MobileSidebar
        userName={userName}
        userEmail={userEmail}
        onSignOut={onSignOut}
        isAdmin={isAdmin}
      />

      {/* Main Content - com margin left para desktop */}
      <main className="lg:ml-64 min-h-screen">
        {/* Header */}
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-4 md:px-8 bg-black/50 backdrop-blur-md sticky top-0 z-30">
          {/* Spacer para o botao hamburger em mobile */}
          <div className="lg:hidden w-12" />

          {/* Titulo da pagina */}
          <h2 className="text-sm font-medium text-gray-400">
            Admin / <span className="text-white">{pageTitle}</span>
          </h2>

          {/* Acoes do header */}
          <div className="flex items-center gap-2 md:gap-4">
            <Link
              href="/dashboard/settings"
              className="p-2 rounded-lg hover:bg-white/5 transition-all"
            >
              <Settings className="w-5 h-5 text-gray-400" />
            </Link>
          </div>
        </header>

        {/* Conteudo */}
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
