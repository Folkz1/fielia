"use client";

import { useState, useEffect, useCallback } from "react";
import { Coins, RefreshCw, CheckCircle, XCircle, AlertCircle, ExternalLink, Search } from "lucide-react";

interface OddsJogo {
  mandante: string;
  visitante: string;
  url: string;
  serie: "A" | "B" | null;
  bookie: string | null;
  casa: string | null;
  empate: string | null;
  fora: string | null;
  temOdds: boolean;
}
interface OddsStatus {
  ok: boolean;
  time: string;
  encontrouJogo: boolean;
  jogo: OddsJogo | null;
  latencyMs: number;
  fetchedAt: string;
  fonte: string;
  error?: string;
}

export default function AdminOddsPage() {
  const [status, setStatus] = useState<OddsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState("corinthians");

  const fetchOdds = useCallback(async (alvo: string, fresh = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/odds?time=${encodeURIComponent(alvo)}${fresh ? "&fresh=1" : ""}`);
      const data = await res.json();
      setStatus(res.ok ? data : { ok: false, time: alvo, encontrouJogo: false, jogo: null, latencyMs: 0, fetchedAt: new Date().toISOString(), fonte: "academiadasapostas.com", error: data.error });
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOdds("corinthians");
  }, [fetchOdds]);

  const j = status?.jogo;
  const oddItems = j
    ? [
        { label: `Vitória ${j.mandante}`, value: j.casa },
        { label: "Empate", value: j.empate },
        { label: `Vitória ${j.visitante}`, value: j.fora },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <Coins className="w-8 h-8 text-orange-500" />
            Odds
          </h1>
          <p className="text-gray-400">Monitor do scraper de odds (Academia das Apostas)</p>
        </div>
        <button
          onClick={() => fetchOdds(status?.time || "corinthians", true)}
          className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          title="Atualizar (ignora cache)"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Consulta por time */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (time.trim()) fetchOdds(time.trim().toLowerCase(), true);
        }}
        className="flex gap-2"
      >
        <input
          value={time}
          onChange={(e) => setTime(e.target.value)}
          placeholder="time (ex.: corinthians, operario)"
          className="flex-1 px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50"
        />
        <button type="submit" className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex items-center gap-2 transition-colors">
          <Search className="w-4 h-4" /> Consultar
        </button>
      </form>

      {/* Saúde do scraper */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-white">
          <RefreshCw className="w-5 h-5 text-orange-500" />
          Saúde do scraper
        </h2>
        {loading ? (
          <div className="text-center py-8 text-gray-400">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
            Consultando a fonte...
          </div>
        ) : status ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-black/30 rounded-lg">
              {status.ok ? <CheckCircle className="w-6 h-6 text-green-400" /> : <XCircle className="w-6 h-6 text-red-400" />}
              <div>
                <p className="font-medium text-white">Fonte</p>
                <p className="text-sm text-gray-400">{status.ok ? "respondeu" : "falhou"} · {status.fonte}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-black/30 rounded-lg">
              {status.encontrouJogo ? <CheckCircle className="w-6 h-6 text-green-400" /> : <AlertCircle className="w-6 h-6 text-yellow-400" />}
              <div>
                <p className="font-medium text-white">Jogo de “{status.time}”</p>
                <p className="text-sm text-gray-400">{status.encontrouJogo ? "encontrado" : "não encontrado"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-black/30 rounded-lg">
              <Coins className="w-6 h-6 text-orange-400" />
              <div>
                <p className="font-medium text-white">Latência</p>
                <p className="text-sm text-gray-400">{status.latencyMs} ms · {new Date(status.fetchedAt).toLocaleTimeString("pt-BR")}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Erro ao consultar o scraper</p>
          </div>
        )}
      </div>

      {/* Próximo jogo + odds */}
      {!loading && status?.encontrouJogo && j && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-1 text-white">
            <Coins className="w-5 h-5 text-orange-500" />
            {j.mandante} <span className="text-gray-500">x</span> {j.visitante}
          </h2>
          <p className="text-sm text-gray-400 mb-6">
            {j.serie ? `Série ${j.serie}` : "—"}
            {j.bookie ? ` · casa ${j.bookie}` : ""}
            {j.url && (
              <a href={j.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 ml-2 text-orange-400 hover:underline">
                fonte <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </p>

          {j.temOdds ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                {oddItems.map((o) => (
                  <div key={o.label} className="p-4 bg-black/30 rounded-lg text-center">
                    <p className="text-2xl font-bold text-orange-400">{o.value ?? "-"}</p>
                    <p className="text-xs text-gray-400 mt-1">{o.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-4 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                Apostar é +18. Estes valores são informativos e alimentam a IA do chat.
              </p>
            </>
          ) : (
            <div className="p-4 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Mercado ainda não aberto</p>
                <p className="text-sm mt-1">
                  O scraper encontrou o jogo, mas as casas ainda não publicaram odds (abrem poucos dias antes).
                  A IA avisa o torcedor disso em vez de inventar valores.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && status && !status.encontrouJogo && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center text-gray-400">
          <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>Nenhum jogo de “{status.time}” encontrado na Série A ou B agora.</p>
        </div>
      )}
    </div>
  );
}
