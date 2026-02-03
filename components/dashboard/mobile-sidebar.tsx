"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  MessageSquare,
  Trophy,
  Crown,
  Newspaper,
  Settings,
  LogOut,
  User,
  Menu,
  X,
  Shield
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/dashboard/chat", icon: MessageSquare, label: "Chat IA" },
  { href: "/dashboard/quiz", icon: Trophy, label: "Quiz Semanal" },
  { href: "/dashboard/ranking", icon: Crown, label: "Ranking" },
  { href: "/dashboard/news", icon: Newspaper, label: "Noticias" },
  { href: "/dashboard/account", icon: User, label: "Conta" },
];

interface MobileSidebarProps {
  userName?: string | null;
  userEmail?: string | null;
  onSignOut?: () => void;
  isAdmin?: boolean;
}

export function MobileSidebar({ userName, userEmail, onSignOut, isAdmin }: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Fechar sidebar ao mudar de rota
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevenir scroll do body quando sidebar esta aberta
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Botao Hamburger - Visivel apenas em mobile */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-lg bg-corinthians-gray-dark border border-white/10 hover:bg-white/5 transition-all"
        aria-label="Abrir menu"
      >
        <Menu className="w-6 h-6 text-white" />
      </button>

      {/* Overlay escuro */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-64 bg-corinthians-gray-dark border-r border-white/10 p-6 flex flex-col z-50 overflow-y-auto scrollbar-thin",
          "transition-transform duration-300 ease-in-out",
          // Desktop: sempre visivel
          "lg:translate-x-0",
          // Mobile: escondido por padrao, visivel quando aberto
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header da Sidebar com botao fechar em mobile */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="block group">
            <h1 className="font-heading text-3xl text-gradient-gold group-hover:scale-105 transition-transform">
              FIEL.IA
            </h1>
            <p className="text-xs text-gray-500 mt-1">Assistente do Torcedor</p>
          </Link>

          {/* Botao fechar - apenas mobile */}
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/5 transition-all"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="space-y-2 flex-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all",
                  isActive
                    ? "bg-[var(--gradient-accent-start)] text-[hsl(var(--accent-primary-foreground))]"
                    : "text-gray-300 hover:bg-corinthians-gray-medium hover:text-white"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="mt-auto space-y-4">
          {/* Admin - Apenas para admins */}
          {isAdmin && (
            <Link
              href="/dashboard/admin"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all",
                pathname === "/dashboard/admin"
                  ? "bg-orange-500 text-white"
                  : "text-orange-400 hover:bg-orange-500/10 hover:text-orange-300"
              )}
            >
              <Shield className="w-5 h-5" />
              <span>Painel Admin</span>
            </Link>
          )}

          {/* Settings */}
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-corinthians-gray-medium hover:text-white transition-all"
          >
            <Settings className="w-5 h-5" />
            <span className="font-semibold">Configuracoes</span>
          </Link>

          {/* User Profile Card */}
          <div className="glass rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-accent flex items-center justify-center flex-shrink-0">
                <span className="font-heading text-lg avatar-text">
                  {userName?.charAt(0).toUpperCase() || "F"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {userName || "Fiel Torcedor"}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {userEmail || "Membro Fiel.IA"}
                </p>
              </div>
            </div>

            {/* Streak Counter */}
            <div className="streak-counter mt-3">
              <span className="text-lg flex-shrink-0">🔥</span>
              <span className="text-sm font-bold whitespace-nowrap">7 dias de streak!</span>
            </div>
          </div>

          {/* Logout */}
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-semibold">Sair</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
