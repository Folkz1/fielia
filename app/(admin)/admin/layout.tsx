"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield, BarChart3, Trophy, Database, Newspaper, Users,
  Settings, ChevronLeft, Menu, X, Sparkles, Megaphone
} from "lucide-react";
import Image from "next/image";

const ADMIN_NAV_ITEMS = [
  { href: "/admin", icon: BarChart3, label: "Dashboard", exact: true },
  { href: "/admin/quizzes", icon: Trophy, label: "Quizzes" },
  { href: "/admin/usuarios", icon: Users, label: "Usuarios" },
  { href: "/admin/noticias", icon: Newspaper, label: "Noticias" },
  { href: "/admin/blog", icon: Sparkles, label: "Blog IA" },
  { href: "/admin/afiliados", icon: Megaphone, label: "Afiliados" },
  { href: "/admin/rag", icon: Database, label: "Base RAG" },
  { href: "/admin/sistema", icon: Settings, label: "Sistema" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch("/api/admin/check");
        const data = await res.json();
        setIsAdmin(data.isAdmin);
      } catch {
        setIsAdmin(false);
      }
    }
    checkAdmin();
  }, []);

  // Fechar sidebar ao mudar de rota em mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center px-4">
        <Shield className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2 text-white">Acesso Restrito</h1>
        <p className="text-gray-400 mb-4">
          Esta area e exclusiva para administradores do sistema.
        </p>
        <Link href="/dashboard" className="text-orange-500 hover:underline">
          Voltar ao Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Mobile Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-50 p-3 bg-orange-500 text-white rounded-full shadow-lg"
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay Mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Admin */}
      <aside
        className={`fixed lg:relative top-0 left-0 h-screen w-64 bg-gray-900 border-r border-orange-500/20 z-50 transition-transform duration-300 flex-shrink-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-4 flex flex-col h-full overflow-y-auto">
          {/* Header com Logo */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-11 h-11 rounded-xl overflow-hidden ring-2 ring-orange-500/50 bg-gray-800">
                <Image
                  src="/images/logo-fiel-ia.png"
                  alt="FIEL.IA"
                  fill
                  className="object-contain p-0.5"
                />
              </div>
              <div>
                <h2 className="font-heading text-xl text-gradient-gold">FIEL.IA</h2>
                <p className="text-[10px] text-orange-400 font-medium">Painel Admin</p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar ao App
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1">
            {ADMIN_NAV_ITEMS.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href) && pathname !== "/admin";
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all ${
                    isActive || (item.exact && pathname === "/admin")
                      ? "bg-orange-500 text-white"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="pt-4 border-t border-white/10 mt-4">
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-xs text-gray-500">Admin v1.0</p>
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-orange-500/50" />
                <span className="text-[10px] text-gray-600">Restrito</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto min-h-screen">
        {children}
      </main>
    </div>
  );
}
