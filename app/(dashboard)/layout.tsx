import Link from "next/link";
import { 
  BarChart3, 
  Users, 
  Settings, 
  LogOut, 
  LayoutDashboard, 
  MessageSquare, 
  Trophy,
  Newspaper,
  User
} from "lucide-react";
import { auth, signOut } from "@/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 flex flex-col">
        <div className="p-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-black text-xs">F-IA</span>
            </div>
            Fiel IA
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white"
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link 
            href="/dashboard/news" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all text-gray-400 hover:text-white"
          >
            <Newspaper className="w-5 h-5" />
            Notícias
          </Link>
          <Link 
            href="/dashboard/quiz" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all text-gray-400 hover:text-white"
          >
            <Trophy className="w-5 h-5" />
            Quizzes
          </Link>
          <Link 
            href="/dashboard/chat" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all text-gray-400 hover:text-white"
          >
            <MessageSquare className="w-5 h-5" />
            Chat IA
          </Link>
          <Link
            href="/dashboard/account"
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all text-gray-400 hover:text-white"
          >
            <User className="w-5 h-5" />
            Conta
          </Link>
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-4 py-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{session?.user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
            </div>
          </div>
          <form action={async () => {
            "use server";
            await signOut({ redirectTo: "/auth/login" });
          }}>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 transition-all text-gray-400 hover:text-red-500">
              <LogOut className="w-5 h-5" />
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-black/50 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-sm font-medium text-gray-400 capitalize">
            Admin / Dashboard
          </h2>
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-lg hover:bg-white/5 transition-all">
              <Settings className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </header>

        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
