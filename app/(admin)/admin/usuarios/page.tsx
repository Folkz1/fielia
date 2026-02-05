"use client";

import { useState, useEffect } from "react";
import { Users, Search, Crown, RefreshCw, Mail, Calendar, Star } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  totalPoints: number;
  currentStreak: number;
  isPremium: boolean;
  isAdmin: boolean;
  createdAt: string;
  lastActive: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<'all' | 'premium' | 'free'>('all');

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Erro ao buscar usuarios:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' ||
      (filter === 'premium' && user.isPremium) ||
      (filter === 'free' && !user.isPremium);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <Users className="w-8 h-8 text-orange-500" />
            Usuarios
          </h1>
          <p className="text-gray-400">{users.length} usuarios cadastrados</p>
        </div>
        <button
          onClick={fetchUsers}
          className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'premium', 'free'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === f
                  ? 'bg-orange-500 text-white'
                  : 'bg-white/10 text-gray-400 hover:bg-white/20'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'premium' ? 'Premium' : 'Free'}
            </button>
          ))}
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            Nenhum usuario encontrado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black/30">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Usuario</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Pontos</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Streak</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                          <span className="font-bold text-white">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-white flex items-center gap-2">
                            {user.name}
                            {user.isAdmin && (
                              <span className="text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">Admin</span>
                            )}
                          </p>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {user.isPremium ? (
                        <span className="flex items-center gap-1 text-yellow-400">
                          <Crown className="w-4 h-4" />
                          Premium
                        </span>
                      ) : (
                        <span className="text-gray-500">Free</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-orange-400 font-bold">
                        <Star className="w-4 h-4" />
                        {user.totalPoints}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-white">{user.currentStreak} dias</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-400 text-sm flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
