"use client";

import { useState } from "react";
import { MobileSidebar } from "./mobile-sidebar";
import { Settings, Eye, Shield } from "lucide-react";
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
  "/dashboard": "Inicio",
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

  // Estado para toggle "ver como torcedor"
  const [viewAsFan, setViewAsFan] = useState(false);

  // Admin vendo como torcedor esconde funcionalidades admin
  const showAsAdmin = isAdmin && !viewAsFan;

  // Verifica se esta na area admin
  const isAdminArea = pathname.startsWith("/dashboard/admin");

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Sidebar Responsiva */}
      <MobileSidebar
        userName={userName}
        userEmail={userEmail}
        onSignOut={onSignOut}
        isAdmin={showAsAdmin}
      />

      {/* Main Content - com margin left para desktop */}
      <main className="lg:ml-64 min-h-screen">
        {/* Header */}
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-4 md:px-8 bg-black/50 backdrop-blur-md sticky top-0 z-30">
          {/* Spacer para o botao hamburger em mobile */}
          <div className="lg:hidden w-12" />

          {/* Titulo da pagina - sem "Admin /" para torcedores */}
          <h2 className="text-sm font-medium text-gray-400">
            {isAdminArea ? (
              <>
                <Shield className="w-4 h-4 inline mr-1 text-orange-400" />
                <span className="text-orange-400">Admin</span> / <span className="text-white">{pageTitle}</span>
              </>
            ) : (
              <span className="text-white">{pageTitle}</span>
            )}
          </h2>

          {/* Acoes do header */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Toggle Ver como Torcedor - apenas para admins fora da area admin */}
            {isAdmin && !isAdminArea && (
              <button
                onClick={() => setViewAsFan(!viewAsFan)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewAsFan
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                }`}
                title={viewAsFan ? "Voltar para visao admin" : "Ver como torcedor"}
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {viewAsFan ? "Visao Torcedor" : "Visao Admin"}
                </span>
              </button>
            )}

            {/* Link para Admin - apenas para admins no modo admin */}
            {showAsAdmin && !isAdminArea && (
              <Link
                href="/dashboard/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30 transition-all"
              >
                <Shield className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            )}

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
