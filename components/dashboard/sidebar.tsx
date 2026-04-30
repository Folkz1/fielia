"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { Home, MessageSquare, Trophy, Crown, Newspaper, Settings, LogOut, User, Sparkles } from "lucide-react";
import Image from "next/image";

const NAV_ITEMS = [
  { href: "/dashboard", icon: Home, label: "Dashboard" },
  { href: "/dashboard/chat", icon: MessageSquare, label: "Chat IA" },
  { href: "/dashboard/memes", icon: Sparkles, label: "Memes IA" },
  { href: "/dashboard/quiz", icon: Trophy, label: "Quiz" },
  { href: "/dashboard/ranking", icon: Crown, label: "Ranking" },
  { href: "/dashboard/news", icon: Newspaper, label: "Notícias" },
  { href: "/dashboard/account", icon: User, label: "Conta" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-corinthians-gray-dark border-r border-corinthians-gray-light px-6 py-4 flex flex-col z-50 overflow-y-auto scrollbar-thin">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 mb-8 group">
        <div className="relative w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden ring-2 ring-orange-500/50 group-hover:ring-orange-500 transition-all bg-gray-900">
          <Image
            src="/images/logo-fiel-ia.png"
            alt="FIEL.IA"
            fill
            className="object-contain p-0.5 group-hover:scale-105 transition-transform"
          />
        </div>
        <div>
          <h1 className="font-heading text-2xl text-gradient-gold">
            FIEL.IA
          </h1>
          <p className="text-xs text-gray-500">Assistente do Torcedor</p>
        </div>
      </Link>

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
                "flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-smooth",
                isActive
                  ? "bg-corinthians-gold text-corinthians-black"
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
        {/* Settings */}
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:bg-corinthians-gray-medium hover:text-white transition-smooth"
        >
          <Settings className="w-5 h-5" />
          <span className="font-semibold">Configurações</span>
        </Link>

        {/* User Profile Card */}
        <div className="glass rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center flex-shrink-0">
              <span className="font-heading text-lg text-corinthians-black">F</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">Fiel Torcedor</p>
              <p className="text-xs text-gray-400">Membro desde 2025</p>
            </div>
          </div>
          
          {/* Streak Counter */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-gold mt-3">
            <span className="text-lg flex-shrink-0">🔥</span>
            <span className="text-sm font-bold text-corinthians-black whitespace-nowrap">7 dias de streak!</span>
          </div>
        </div>

        {/* Logout */}
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-smooth">
          <LogOut className="w-5 h-5" />
          <span className="font-semibold">Sair</span>
        </button>
      </div>
    </aside>
  );
}
