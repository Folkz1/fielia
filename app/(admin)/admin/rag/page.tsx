"use client";

import { useState, useEffect } from "react";
import { Database, Search, RefreshCw, Trash2, FileText, Upload, Plus, Youtube, Link, Tv, X, CheckSquare, Square } from "lucide-react";

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

interface YouTubeChannel {
  id: string;
  channelId: string;
  name: string;
  url: string;
  isActive: boolean;
  lastSyncAt: string | null;
}

interface YtSource {
  title: string;
  sourceUrl: string;
  chunkCount: number;
  addedAt: string;
}

interface VideoPreview {
  id: string;
  title: string;
  duration?: string;
  thumbnailUrl?: string;
}

type ActiveTab = "documents" | "youtube" | "pdf";

export default function AdminRAGPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("documents");
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

  // YouTube sources (vídeos já no RAG)
  const [ytSources, setYtSources] = useState<YtSource[]>([]);
  const [ytSourcesLoading, setYtSourcesLoading] = useState(false);
  const [deletingSource, setDeletingSource] = useState<string | null>(null);

  // YouTube state
  const [ytUrl, setYtUrl] = useState("");
  const [ytCategory, setYtCategory] = useState("general");
  const [ytLimit, setYtLimit] = useState(5);
  const [ytProcessing, setYtProcessing] = useState(false);
  const [ytResult, setYtResult] = useState<{ success: boolean; message: string } | null>(null);
  const [ytChannels, setYtChannels] = useState<YouTubeChannel[]>([]);
  const [ytVideos, setYtVideos] = useState<VideoPreview[]>([]);
  const [ytLoadingVideos, setYtLoadingVideos] = useState(false);
  const [newChannelUrl, setNewChannelUrl] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [addingChannel, setAddingChannel] = useState(false);

  // PDF state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfCategory, setPdfCategory] = useState("general");
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfResult, setPdfResult] = useState<{ success: boolean; message: string } | null>(null);

  // Batch delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === knowledge.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(knowledge.map(k => k.id)));
    }
  }

  async function handleBatchDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Deletar ${selectedIds.size} documento(s)?`)) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/admin/knowledge", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        setKnowledge(knowledge.filter(k => !selectedIds.has(k.id)));
        setSelectedIds(new Set());
        fetchStats();
      }
    } catch (error) {
      console.error("Erro ao deletar em lote:", error);
    } finally {
      setDeleting(false);
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

  async function fetchChannels() {
    try {
      const res = await fetch("/api/admin/youtube/channels");
      const data = await res.json();
      setYtChannels(data.channels || []);
    } catch (error) {
      console.error("Erro ao buscar canais:", error);
    }
  }

  async function fetchYtSources() {
    setYtSourcesLoading(true);
    try {
      const res = await fetch("/api/admin/youtube/sources");
      const data = await res.json();
      setYtSources(data.sources || []);
    } catch (error) {
      console.error("Erro ao buscar fontes YouTube:", error);
    } finally {
      setYtSourcesLoading(false);
    }
  }

  async function handleDeleteSource(sourceUrl: string) {
    if (!confirm("Remover este vídeo e todos os seus chunks do RAG?")) return;
    setDeletingSource(sourceUrl);
    try {
      const res = await fetch("/api/admin/youtube/sources", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl }),
      });
      if (res.ok) {
        setYtSources((prev) => prev.filter((s) => s.sourceUrl !== sourceUrl));
        fetchStats();
      }
    } catch (error) {
      console.error("Erro ao remover fonte:", error);
    } finally {
      setDeletingSource(null);
    }
  }

  useEffect(() => {
    fetchKnowledge();
    fetchStats();
  }, [searchQuery]);

  useEffect(() => {
    if (activeTab === "youtube") {
      fetchChannels();
      fetchYtSources();
    }
  }, [activeTab]);

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

  // YouTube: detectar tipo de URL e processar
  function isVideoUrl(url: string): boolean {
    return /(?:youtube\.com\/watch|youtu\.be\/|^[a-zA-Z0-9_-]{11}$)/.test(url.trim());
  }

  function isChannelUrl(url: string): boolean {
    return /youtube\.com\/(channel\/|@|c\/|user\/)/.test(url);
  }

  async function handleYtPreview() {
    if (!ytUrl || !isChannelUrl(ytUrl)) return;
    setYtLoadingVideos(true);
    setYtVideos([]);
    try {
      const res = await fetch(`/api/admin/youtube?channelUrl=${encodeURIComponent(ytUrl)}&limit=${ytLimit}`);
      const data = await res.json();
      setYtVideos(data.videos || []);
    } catch (error) {
      console.error("Erro ao listar videos:", error);
    } finally {
      setYtLoadingVideos(false);
    }
  }

  async function handleYtIngest() {
    setYtProcessing(true);
    setYtResult(null);

    try {
      const body: Record<string, unknown> = { category: ytCategory };

      if (isVideoUrl(ytUrl)) {
        body.videoUrl = ytUrl;
      } else if (isChannelUrl(ytUrl)) {
        body.channelUrl = ytUrl;
        body.limit = ytLimit;
      } else {
        setYtResult({ success: false, message: "URL invalida. Cole uma URL de video ou canal do YouTube." });
        setYtProcessing(false);
        return;
      }

      const res = await fetch("/api/admin/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.videosTranscribed !== undefined) {
          setYtResult({
            success: true,
            message: `${data.videosTranscribed}/${data.videosFound} videos transcritos. ${data.totalChunks} chunks criados.`,
          });
        } else {
          setYtResult({
            success: data.success,
            message: data.success
              ? `Video transcrito! ${data.chunks} chunks criados.`
              : data.error || "Falha na transcricao",
          });
        }
        fetchKnowledge();
        fetchStats();
        fetchYtSources();
      } else {
        setYtResult({ success: false, message: data.error || "Erro ao processar" });
      }
    } catch (error) {
      setYtResult({ success: false, message: "Erro de conexao" });
    } finally {
      setYtProcessing(false);
    }
  }

  async function handleAddChannel(e: React.FormEvent) {
    e.preventDefault();
    if (!newChannelUrl) return;
    setAddingChannel(true);

    try {
      const res = await fetch("/api/admin/youtube/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newChannelUrl, name: newChannelName || undefined }),
      });

      if (res.ok) {
        setNewChannelUrl("");
        setNewChannelName("");
        fetchChannels();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao adicionar canal");
      }
    } catch (error) {
      alert("Erro de conexao");
    } finally {
      setAddingChannel(false);
    }
  }

  async function handleDeleteChannel(id: string) {
    if (!confirm("Remover este canal?")) return;

    try {
      await fetch("/api/admin/youtube/channels", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchChannels();
    } catch (error) {
      console.error("Erro ao deletar canal:", error);
    }
  }

  async function handlePdfUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!pdfFile) return;
    setPdfUploading(true);
    setPdfResult(null);

    try {
      const formData = new FormData();
      formData.append("file", pdfFile);
      if (pdfTitle) formData.append("title", pdfTitle);
      formData.append("category", pdfCategory);

      const res = await fetch("/api/admin/pdf", { method: "POST", body: formData });
      const data = await res.json();

      if (res.ok && data.success) {
        setPdfResult({
          success: true,
          message: `PDF processado! ${data.chunksCreated} chunks criados (${data.textLength} chars extraidos).`,
        });
        setPdfFile(null);
        setPdfTitle("");
        fetchKnowledge();
        fetchStats();
      } else {
        setPdfResult({ success: false, message: data.error || "Erro ao processar PDF" });
      }
    } catch {
      setPdfResult({ success: false, message: "Erro de conexao" });
    } finally {
      setPdfUploading(false);
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
        {activeTab === "documents" && (
          <button
            onClick={() => setShowIngestForm(!showIngestForm)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adicionar Documento
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-lg p-1">
        <button
          onClick={() => setActiveTab("documents")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "documents"
              ? "bg-orange-500 text-white"
              : "text-gray-400 hover:text-white hover:bg-white/10"
          }`}
        >
          <FileText className="w-4 h-4" />
          Documentos
        </button>
        <button
          onClick={() => setActiveTab("youtube")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "youtube"
              ? "bg-red-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-white/10"
          }`}
        >
          <Youtube className="w-4 h-4" />
          YouTube
        </button>
        <button
          onClick={() => setActiveTab("pdf")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "pdf"
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-white/10"
          }`}
        >
          <Upload className="w-4 h-4" />
          PDF
        </button>
      </div>

      {/* ==================== TAB: DOCUMENTOS ==================== */}
      {activeTab === "documents" && (
        <>
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

          {/* Search + Batch Actions */}
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
            {selectedIds.size > 0 && (
              <button
                onClick={handleBatchDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Deletar ({selectedIds.size})
              </button>
            )}
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
              <>
                {/* Select all */}
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {selectedIds.size === knowledge.length ? (
                    <CheckSquare className="w-4 h-4 text-orange-500" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                  {selectedIds.size === knowledge.length ? "Desmarcar todos" : "Selecionar todos"}
                </button>
                {knowledge.map((item) => (
                  <div
                    key={item.id}
                    className={`bg-white/5 border rounded-lg p-4 transition-colors cursor-pointer ${
                      selectedIds.has(item.id)
                        ? "border-orange-500/50 bg-orange-500/5"
                        : "border-white/10 hover:border-orange-500/30"
                    }`}
                    onClick={() => toggleSelect(item.id)}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="mt-0.5 shrink-0">
                          {selectedIds.has(item.id) ? (
                            <CheckSquare className="w-5 h-5 text-orange-500" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-500" />
                          )}
                        </div>
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
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}

      {/* ==================== TAB: YOUTUBE ==================== */}
      {activeTab === "youtube" && (
        <>
          {/* YouTube Ingest */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Youtube className="w-5 h-5 text-red-500" />
              Transcrever Video do YouTube
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Cole a URL de um video ou canal. As legendas serao extraidas e adicionadas ao RAG.
            </p>

            {ytResult && (
              <div
                className={`p-4 rounded-lg mb-4 ${
                  ytResult.success
                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                }`}
              >
                {ytResult.message}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">URL ou ID do YouTube *</label>
                <input
                  type="text"
                  value={ytUrl}
                  onChange={(e) => {
                    setYtUrl(e.target.value);
                    setYtVideos([]);
                  }}
                  placeholder="https://youtube.com/watch?v=... ou ID do video ou https://youtube.com/@canal"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                />
                {ytUrl && (
                  <p className="text-xs text-gray-500 mt-1">
                    {isVideoUrl(ytUrl) ? "Video detectado" : isChannelUrl(ytUrl) ? "Canal detectado" : "URL nao reconhecida"}
                  </p>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Categoria</label>
                  <select
                    value={ytCategory}
                    onChange={(e) => setYtCategory(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                  >
                    <option value="general">Geral</option>
                    <option value="history">Historia</option>
                    <option value="players">Jogadores</option>
                    <option value="titles">Titulos</option>
                    <option value="stadium">Estadio</option>
                    <option value="torcida">Torcida</option>
                  </select>
                </div>
                {isChannelUrl(ytUrl) && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Limite de videos</label>
                    <input
                      type="number"
                      value={ytLimit}
                      onChange={(e) => setYtLimit(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
                      min={1}
                      max={20}
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                {isChannelUrl(ytUrl) && (
                  <button
                    onClick={handleYtPreview}
                    disabled={ytLoadingVideos || !ytUrl}
                    className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {ytLoadingVideos ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Ver Videos
                  </button>
                )}
                <button
                  onClick={handleYtIngest}
                  disabled={ytProcessing || !ytUrl || (!isVideoUrl(ytUrl) && !isChannelUrl(ytUrl))}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {ytProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Transcrevendo...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Transcrever e Adicionar ao RAG
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Preview de videos do canal */}
            {ytVideos.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-gray-300">{ytVideos.length} videos encontrados:</p>
                {ytVideos.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                    <Tv className="w-4 h-4 text-red-400 shrink-0" />
                    <span className="text-sm text-white truncate flex-1">{v.title}</span>
                    {v.duration && (
                      <span className="text-xs text-gray-500">{v.duration}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vídeos já no RAG */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Tv className="w-5 h-5 text-red-400" />
              Vídeos no RAG
              {ytSources.length > 0 && (
                <span className="ml-1 text-xs font-normal px-2 py-0.5 rounded-full bg-red-600/20 text-red-400">
                  {ytSources.length}
                </span>
              )}
            </h2>

            {ytSourcesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-14 bg-white/5 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : ytSources.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum vídeo adicionado ainda.</p>
            ) : (
              <div className="space-y-2">
                {ytSources.map((src) => (
                  <div
                    key={src.sourceUrl}
                    className="flex items-center justify-between gap-3 p-3 bg-white/5 rounded-lg"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <Youtube className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <a
                          href={src.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-white hover:text-red-400 transition-colors truncate block"
                        >
                          {src.title}
                        </a>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-500 truncate">{src.sourceUrl.replace("https://www.youtube.com/watch?v=", "youtu.be/")}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-gray-400 shrink-0">
                            {src.chunkCount} chunk{src.chunkCount !== 1 ? "s" : ""}
                          </span>
                          <span className="text-xs text-gray-600 shrink-0">
                            {new Date(src.addedAt).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteSource(src.sourceUrl)}
                      disabled={deletingSource === src.sourceUrl}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                      title="Remover vídeo do RAG"
                    >
                      {deletingSource === src.sourceUrl ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Canais Monitorados */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Link className="w-5 h-5 text-orange-500" />
              Canais Salvos
            </h2>

            {/* Add channel form */}
            <form onSubmit={handleAddChannel} className="flex gap-2 mb-4">
              <input
                type="url"
                value={newChannelUrl}
                onChange={(e) => setNewChannelUrl(e.target.value)}
                placeholder="https://youtube.com/@canal"
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
              />
              <input
                type="text"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="Nome (opcional)"
                className="w-40 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm"
              />
              <button
                type="submit"
                disabled={addingChannel || !newChannelUrl}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 text-sm flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </form>

            {/* Channel list */}
            {ytChannels.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum canal salvo.</p>
            ) : (
              <div className="space-y-2">
                {ytChannels.map((ch) => (
                  <div
                    key={ch.id}
                    className="flex items-center justify-between gap-3 p-3 bg-white/5 rounded-lg"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Youtube className="w-4 h-4 text-red-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{ch.name}</p>
                        <p className="text-xs text-gray-500 truncate">{ch.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setYtUrl(ch.url);
                          setYtVideos([]);
                        }}
                        className="px-3 py-1 text-xs bg-white/10 text-white rounded hover:bg-white/20"
                        title="Usar este canal"
                      >
                        Usar
                      </button>
                      <button
                        onClick={() => handleDeleteChannel(ch.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remover"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ==================== TAB: PDF ==================== */}
      {activeTab === "pdf" && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-500" />
            Upload de PDF para RAG
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            Faca upload de um arquivo PDF. O texto sera extraido e adicionado a base de conhecimento.
          </p>

          {pdfResult && (
            <div
              className={`p-4 rounded-lg mb-4 ${
                pdfResult.success
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}
            >
              {pdfResult.message}
            </div>
          )}

          <form onSubmit={handlePdfUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Arquivo PDF *</label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg file:mr-4 file:py-1 file:px-4 file:rounded file:border-0 file:bg-orange-500 file:text-white file:text-sm"
              />
              {pdfFile && (
                <p className="text-xs text-gray-500 mt-1">
                  {pdfFile.name} ({(pdfFile.size / 1024).toFixed(0)} KB)
                </p>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Titulo (opcional)</label>
                <input
                  type="text"
                  value={pdfTitle}
                  onChange={(e) => setPdfTitle(e.target.value)}
                  placeholder="Titulo do documento (usa nome do arquivo se vazio)"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Categoria</label>
                <select
                  value={pdfCategory}
                  onChange={(e) => setPdfCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg"
                >
                  <option value="general">Geral</option>
                  <option value="history">Historia</option>
                  <option value="players">Jogadores</option>
                  <option value="titles">Titulos</option>
                  <option value="stadium">Estadio</option>
                  <option value="torcida">Torcida</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={pdfUploading || !pdfFile}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {pdfUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processando PDF...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Extrair e Adicionar ao RAG
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
