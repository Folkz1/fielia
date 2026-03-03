"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Megaphone, Plus, Trash2, Edit3, ExternalLink,
  ToggleLeft, ToggleRight, MousePointerClick, TrendingUp
} from "lucide-react";

type Affiliate = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  baseUrl: string;
  trackingParam: string | null;
  trackingValue: string | null;
  ctaText: string;
  ctaDescription: string | null;
  disclaimer: string | null;
  isActive: boolean;
  showInBlog: boolean;
  showInNews: boolean;
  showInChat: boolean;
  showInNewsletter: boolean;
  revenueModel: string | null;
  revenueDetails: string | null;
  _count: { clicks: number };
};

type Stats = {
  total: number;
  active: number;
  clicksToday: number;
  clicksMonth: number;
  clicksBySource: { source: string; count: number }[];
};

const EMPTY_FORM = {
  name: "",
  slug: "",
  description: "",
  logoUrl: "",
  baseUrl: "",
  trackingParam: "",
  trackingValue: "",
  ctaText: "Aposte agora",
  ctaDescription: "",
  disclaimer: "",
  isActive: true,
  showInBlog: true,
  showInNews: true,
  showInChat: true,
  showInNewsletter: true,
  revenueModel: "",
  revenueDetails: "",
};

export default function DivulgacaoPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState("");

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [affRes, statsRes] = await Promise.all([
        fetch("/api/admin/affiliates"),
        fetch("/api/admin/affiliates/stats"),
      ]);
      if (affRes.ok) setAffiliates(await affRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
    setResult("");
  }

  function openEdit(a: Affiliate) {
    setForm({
      name: a.name,
      slug: a.slug,
      description: a.description || "",
      logoUrl: a.logoUrl || "",
      baseUrl: a.baseUrl,
      trackingParam: a.trackingParam || "",
      trackingValue: a.trackingValue || "",
      ctaText: a.ctaText,
      ctaDescription: a.ctaDescription || "",
      disclaimer: a.disclaimer || "",
      isActive: a.isActive,
      showInBlog: a.showInBlog,
      showInNews: a.showInNews,
      showInChat: a.showInChat,
      showInNewsletter: a.showInNewsletter,
      revenueModel: a.revenueModel || "",
      revenueDetails: a.revenueDetails || "",
    });
    setEditingId(a.id);
    setShowForm(true);
    setResult("");
  }

  async function handleSave() {
    setSaving(true);
    setResult("");
    try {
      const url = editingId
        ? `/api/admin/affiliates/${editingId}`
        : "/api/admin/affiliates";
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        setResult(`Erro: ${err.error || res.statusText}`);
        return;
      }
      setResult(editingId ? "Patrocinador atualizado!" : "Patrocinador criado!");
      setShowForm(false);
      fetchData();
    } catch {
      setResult("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deletar patrocinador permanentemente?")) return;
    await fetch(`/api/admin/affiliates/${id}`, { method: "DELETE" });
    fetchData();
  }

  async function toggleActive(a: Affiliate) {
    await fetch(`/api/admin/affiliates/${a.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...a, isActive: !a.isActive }),
    });
    fetchData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-orange-500" />
            Divulgacao
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Gerencie parceiros de divulgacao e CTAs no blog, chat e newsletter
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Patrocinador
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-gray-900 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-500">Ativos</p>
            <p className="text-2xl font-bold text-green-400">{stats.active}</p>
          </div>
          <div className="bg-gray-900 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-500">Cliques Hoje</p>
            <p className="text-2xl font-bold text-orange-400">{stats.clicksToday}</p>
          </div>
          <div className="bg-gray-900 border border-white/10 rounded-xl p-4">
            <p className="text-xs text-gray-500">Cliques no Mes</p>
            <p className="text-2xl font-bold text-blue-400">{stats.clicksMonth}</p>
          </div>
        </div>
      )}

      {result && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${result.startsWith("Erro") ? "bg-red-500/20 text-red-300" : "bg-green-500/20 text-green-300"}`}>
          {result}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-gray-900 border border-white/10 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">
            {editingId ? "Editar Patrocinador" : "Novo Patrocinador"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Nome *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-") })}
                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="H2Bet"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Slug *</label>
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="h2bet"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">URL Base *</label>
              <input
                value={form.baseUrl}
                onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="https://h2.bet"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Logo URL</label>
              <input
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Param Tracking</label>
              <input
                value={form.trackingParam}
                onChange={(e) => setForm({ ...form, trackingParam: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="btag"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Valor Tracking</label>
              <input
                value={form.trackingValue}
                onChange={(e) => setForm({ ...form, trackingValue: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="fiel_ia"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Texto do CTA</label>
              <input
                value={form.ctaText}
                onChange={(e) => setForm({ ...form, ctaText: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="Aposte agora"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Descricao CTA</label>
              <input
                value={form.ctaDescription}
                onChange={(e) => setForm({ ...form, ctaDescription: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="Bonus de boas-vindas de ate R$ 200"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-400 block mb-1">Disclaimer Legal</label>
              <input
                value={form.disclaimer}
                onChange={(e) => setForm({ ...form, disclaimer: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="Jogue com responsabilidade. 18+"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Modelo Receita</label>
              <select
                value={form.revenueModel}
                onChange={(e) => setForm({ ...form, revenueModel: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="">-</option>
                <option value="CPA">CPA</option>
                <option value="RevShare">RevShare</option>
                <option value="Hybrid">Hibrido</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Detalhes Receita</label>
              <input
                value={form.revenueDetails}
                onChange={(e) => setForm({ ...form, revenueDetails: e.target.value })}
                className="w-full bg-black border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                placeholder="25-35% RevShare"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="mt-6 border-t border-white/10 pt-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Onde exibir</h3>
            <div className="flex flex-wrap gap-4">
              {(["showInBlog", "showInNews", "showInChat", "showInNewsletter"] as const).map((key) => {
                const labels: Record<string, string> = {
                  showInBlog: "Blog",
                  showInNews: "Noticias",
                  showInChat: "Chat/WhatsApp",
                  showInNewsletter: "Newsletter",
                };
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm({ ...form, [key]: !form[key] })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                      form[key]
                        ? "border-orange-500/50 bg-orange-500/10 text-orange-400"
                        : "border-white/10 bg-black text-gray-500"
                    }`}
                  >
                    {form[key] ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    {labels[key]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={handleSave}
              disabled={saving || !form.name || !form.baseUrl}
              className="px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {saving ? "Salvando..." : editingId ? "Atualizar" : "Criar"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {affiliates.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-xl">
          <Megaphone className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-400">Nenhum patrocinador cadastrado</p>
          <p className="text-xs text-gray-600 mt-1">Clique em &quot;Novo Patrocinador&quot; para comecar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {affiliates.map((a) => (
            <div
              key={a.id}
              className={`bg-gray-900 border rounded-xl p-5 transition-colors ${
                a.isActive ? "border-white/10" : "border-red-500/20 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-white">{a.name}</h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        a.isActive
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {a.isActive ? "Ativo" : "Inativo"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      {appUrl}/go/{a.slug}
                    </span>
                    <span className="flex items-center gap-1">
                      <MousePointerClick className="w-3 h-3" />
                      {a._count.clicks} cliques total
                    </span>
                    {a.revenueModel && (
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {a.revenueModel} {a.revenueDetails && `- ${a.revenueDetails}`}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {a.showInBlog && <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">Blog</span>}
                    {a.showInNews && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">Noticias</span>}
                    {a.showInChat && <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">Chat</span>}
                    {a.showInNewsletter && <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400">Newsletter</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(a)}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    title={a.isActive ? "Desativar" : "Ativar"}
                  >
                    {a.isActive ? (
                      <ToggleRight className="w-5 h-5 text-green-400" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                  <button
                    onClick={() => openEdit(a)}
                    className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit3 className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Deletar"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
