"use client";

import { useState, useEffect } from "react";
import { Database, Search, RefreshCw, Trash2, FileText, Upload, Plus } from "lucide-react";

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: string;
  source?: string;
  createdAt: string;
}

interface Stats {
  totalDocuments: number;
  categories: { name: string; count: number }[];
}

export default function AdminRAGPage() {
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showIngestForm, setShowIngestForm] = useState(false);

  // Form de ingestao
  const [ingestForm, setIngestForm] = useState({
    title: "",
    content: "",
    category: "history",
    source: "",
    sourceUrl: "",
  });
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<{ success: boolean; message: string } | null>(null);

  async function fetchKnowledge() {
    setLoading(true);
    try {
      const url = searchQuery
        ? `/api/admin/knowledge?search=${encodeURIComponent(searchQuery)}`
        : "/api/admin/knowledge";
      const res = await fetch(url);
      const data = await res.json();
      setKnowledge(data.items || []);
    } catch (error) {
      console.error("Erro ao buscar conhecimento:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const res = await fetch("/api/admin/knowledge/stats");
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Erro ao buscar stats:", error);
    }
  }

  useEffect(() => {
    fetchKnowledge();
    fetchStats();
  }, [searchQuery]);

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja deletar este documento?")) return;

    try {
      const res = await fetch(`/api/admin/knowledge/${id}`, { method: "DELETE" });
      if (res.ok) {
        setKnowledge(knowledge.filter((k) => k.id !== id));
        fetchStats();
      }
    } catch (error) {
      console.error("Erro ao deletar:", error);
    }
  }

  async function handleIngest(e: React.FormEvent) {
    e.preventDefault();
    setIngesting(true);
    setIngestResult(null);

    try {
      const res = await fetch("/api/rag/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ingestForm),
      });

      const data = await res.json();

      if (res.ok) {
        setIngestResult({
          success: true,
          message: `Documento ingerido com sucesso! ${data.chunksCreated} chunks criados.`,
        });
        setIngestForm({ title: "", content: "", category: "history", source: "", sourceUrl: "" });
        setShowIngestForm(false);
        fetchKnowledge();
        fetchStats();
      } else {
        setIngestResult({
          success: false,
          message: data.error || "Erro ao ingerir documento",
        });
      }
    } catch (error) {
      setIngestResult({
        success: false,
        message: "Erro de conexao",
      });
    } finally {
      setIngesting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <Database className="w-8 h-8 text-orange-500" />
            Base de Conhecimento RAG
          </h1>
          <p className="text-gray-400">Gerencie o conhecimento do FIEL.IA</p>
        </div>
        <button
          onClick={() => setShowIngestForm(!showIngestForm)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar Documento
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <Database className="w-6 h-6 text-orange-500 mb-2" />
            <p className="text-2xl font-bold text-white">{stats.totalDocuments}</p>
            <p className="text-sm text-gray-400">Documentos</p>
          </div>
          {stats.categories.slice(0, 3).map((cat) => (
            <div key={cat.name} className="bg-white/5 border border-white/10 rounded-lg p-4">
              <p className="text-xl font-bold text-white">{cat.count}</p>
              <p className="text-sm text-gray-400 capitalize">{cat.name}</p>
            </div>
          ))}
        </div>
      )}

      {/* Ingest Form */}
      {showIngestForm && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Ingerir Novo Documento
          </h2>

          {ingestResult && (
            <div
              className={`p-4 rounded-lg mb-4 ${
                ingestResult.success
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}
            >
              {ingestResult.message}
            </div>
          )}

          <form onSubmit={handleIngest} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Titulo *</label>
                <input
                  type="text"
                  value={ingestForm.title}
                  onChange={(e) => setIngestForm({ ...ingestForm, title: e.target.value })}
                  required
                  placeholder="Ex: Historia do Corinthians"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Categoria *</label>
                <select
                  value={ingestForm.category}
                  onChange={(e) => setIngestForm({ ...ingestForm, category: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                >
                  <option value="history">Historia</option>
                  <option value="players">Jogadores</option>
                  <option value="titles">Titulos</option>
                  <option value="stadium">Estadio</option>
                  <option value="torcida">Torcida</option>
                  <option value="general">Geral</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Conteudo *</label>
              <textarea
                value={ingestForm.content}
                onChange={(e) => setIngestForm({ ...ingestForm, content: e.target.value })}
                required
                rows={8}
                placeholder="Cole aqui o conteudo do documento..."
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg resize-y"
              />
              <p className="text-xs text-gray-500 mt-1">
                {ingestForm.content.length} caracteres | ~{Math.ceil(ingestForm.content.length / 600)} chunks
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Fonte (opcional)</label>
                <input
                  type="text"
                  value={ingestForm.source}
                  onChange={(e) => setIngestForm({ ...ingestForm, source: e.target.value })}
                  placeholder="Ex: Wikipedia"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">URL da Fonte (opcional)</label>
                <input
                  type="url"
                  value={ingestForm.sourceUrl}
                  onChange={(e) => setIngestForm({ ...ingestForm, sourceUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={ingesting || !ingestForm.title || !ingestForm.content}
                className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
              >
                {ingesting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Ingerir
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowIngestForm(false)}
                className="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar documentos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
          />
        </div>
        <button
          onClick={fetchKnowledge}
          className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Knowledge List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-gray-400">Carregando...</div>
        ) : knowledge.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum documento encontrado</p>
          </div>
        ) : (
          knowledge.map((item) => (
            <div
              key={item.id}
              className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-orange-500/30 transition-colors"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white truncate">{item.title}</h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 capitalize">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 line-clamp-2">{item.content}</p>
                  {item.source && (
                    <p className="text-xs text-gray-500 mt-1">Fonte: {item.source}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Deletar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
