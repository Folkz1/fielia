"use client";

import { useState, useEffect } from "react";
import { Shield, Database, Upload, Trash2, Search, FileText, RefreshCw, Plus } from "lucide-react";

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

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<"rag" | "ingest">("rag");
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchKnowledge();
      fetchStats();
    }
  }, [isAdmin, searchQuery]);

  async function checkAdminStatus() {
    try {
      const res = await fetch("/api/admin/check");
      const data = await res.json();
      setIsAdmin(data.isAdmin);
    } catch {
      setIsAdmin(false);
    }
  }

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

  // Verificando status de admin
  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary"></div>
      </div>
    );
  }

  // Nao e admin
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Shield className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
        <p className="text-gray-400">
          Esta area e exclusiva para administradores do sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8 text-accent-primary" />
            Painel Admin
          </h1>
          <p className="text-gray-400 mt-1">Gerencie o conhecimento do FIEL.IA</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card-corinthians p-4">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-accent-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.totalDocuments}</p>
                <p className="text-sm text-gray-400">Documentos</p>
              </div>
            </div>
          </div>
          {stats.categories.slice(0, 3).map((cat) => (
            <div key={cat.name} className="card-corinthians p-4">
              <div>
                <p className="text-xl font-bold">{cat.count}</p>
                <p className="text-sm text-gray-400 capitalize">{cat.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        <button
          onClick={() => setActiveTab("rag")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "rag"
              ? "text-accent-primary border-b-2 border-accent-primary"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Database className="w-4 h-4 inline mr-2" />
          Base de Conhecimento
        </button>
        <button
          onClick={() => setActiveTab("ingest")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "ingest"
              ? "text-accent-primary border-b-2 border-accent-primary"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Adicionar Documento
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "rag" && (
        <div className="space-y-4">
          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar documentos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-accent-primary"
              />
            </div>
            <button
              onClick={fetchKnowledge}
              className="p-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"
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
                  className="card-corinthians p-4 hover:border-accent-primary/50 transition-colors"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{item.title}</h3>
                        <span className="badge-accent text-xs px-2 py-0.5 rounded capitalize">
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
      )}

      {activeTab === "ingest" && (
        <div className="card-corinthians p-6">
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
            <div>
              <label className="block text-sm font-medium mb-1">Titulo *</label>
              <input
                type="text"
                value={ingestForm.title}
                onChange={(e) => setIngestForm({ ...ingestForm, title: e.target.value })}
                required
                placeholder="Ex: Historia do Sport Club Corinthians Paulista"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-accent-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Categoria *</label>
              <select
                value={ingestForm.category}
                onChange={(e) => setIngestForm({ ...ingestForm, category: e.target.value })}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-accent-primary"
              >
                <option value="history">Historia</option>
                <option value="players">Jogadores</option>
                <option value="titles">Titulos</option>
                <option value="stadium">Estadio</option>
                <option value="torcida">Torcida</option>
                <option value="general">Geral</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Conteudo *</label>
              <textarea
                value={ingestForm.content}
                onChange={(e) => setIngestForm({ ...ingestForm, content: e.target.value })}
                required
                rows={10}
                placeholder="Cole aqui o conteudo do documento. O sistema ira dividir automaticamente em chunks e gerar embeddings para busca semantica."
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-accent-primary resize-y"
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
                  placeholder="Ex: Wikipedia, Site Oficial"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-accent-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">URL da Fonte (opcional)</label>
                <input
                  type="url"
                  value={ingestForm.sourceUrl}
                  onChange={(e) => setIngestForm({ ...ingestForm, sourceUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-accent-primary"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={ingesting || !ingestForm.title || !ingestForm.content}
              className="w-full sm:w-auto px-6 py-2 btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {ingesting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Ingerir Documento
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
