"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Coins, RefreshCw, AlertCircle, ChevronLeft, ExternalLink } from "lucide-react";

interface JogoDoDia {
  liga: string;
  mandante: string;
  visitante: string;
  url: string;
  bookie: string | null;
  casa: string | null;
  empate: string | null;
  fora: string | null;
  probabilidades: { casa: number; empate: number; fora: number } | null;
}
interface LigaJogos {
  liga: string;
  jogos: JogoDoDia[];
}

function JogoRow({ j }: { j: JogoDoDia }) {
  const p = j.probabilidades;
  const linhas = [
    { nome: j.mandante, prob: p?.casa ?? null, odd: j.casa, cor: "bg-orange-500" },
    { nome: "Empate", prob: p?.empate ?? null, odd: j.empate, cor: "bg-gray-500" },
    { nome: j.visitante, prob: p?.fora ?? null, odd: j.fora, cor: "bg-gray-600" },
  ];
  return (
    <div className="bg-black/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium text-white text-sm">
          {j.mandante} <span className="text-gray-500">x</span> {j.visitante}
        </span>
        {j.url && (
          <a href={j.url} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-orange-400">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
      <div className="space-y-2">
        {linhas.map((l) => (
          <div key={l.nome}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-gray-300 truncate pr-2">{l.nome}</span>
              <span className="text-gray-400 whitespace-nowrap">
                {l.prob != null && <span className="font-bold text-white">{l.prob}%</span>}
                {l.odd && <span className="ml-2 text-orange-400">{l.odd}</span>}
              </span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className={`h-full ${l.cor} rounded-full`} style={{ width: `${l.prob ?? 0}%` }} />
            </div>
          </div>
        ))}
      </div>
      {j.bookie && <p className="text-[10px] text-gray-600 mt-2">odds: {j.bookie}</p>}
    </div>
  );
}

export default function JogosPage() {
  const [ligas, setLigas] = useState<LigaJogos[] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchJogos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/odds/jogos-do-dia");
      const data = res.ok ? await res.json() : null;
      setLigas(data?.ligas ?? []);
    } catch {
      setLigas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJogos();
  }, [fetchJogos]);

  const vazio = !loading && (!ligas || ligas.length === 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-1">
            <ChevronLeft className="w-4 h-4" /> Voltar
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <Coins className="w-7 h-7 text-orange-500" />
            Jogos & Odds
          </h1>
          <p className="text-gray-400 text-sm">Probabilidades dos próximos jogos (Brasileirão, Libertadores, seleções e mais)</p>
        </div>
        <button onClick={fetchJogos} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 bg-white/5 rounded-2xl" />
          ))}
        </div>
      ) : vazio ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-gray-500" />
          <p className="text-gray-300 font-medium">Nenhum jogo com mercado aberto agora</p>
          <p className="text-gray-500 text-sm mt-1">
            As casas abrem as odds poucos dias antes de cada jogo. Volte mais perto das rodadas — o painel enche sozinho. ⚽
          </p>
        </div>
      ) : (
        <>
          {ligas!.map((lg) => (
            <div key={lg.liga} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-orange-500 rounded-full" />
                {lg.liga}
                <span className="text-xs font-normal text-gray-500">({lg.jogos.length})</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {lg.jogos.map((j, i) => (
                  <JogoRow key={`${j.mandante}-${j.visitante}-${i}`} j={j} />
                ))}
              </div>
            </div>
          ))}
          <p className="text-[11px] text-gray-500 flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            Probabilidades estimadas a partir das odds (bet365). Apostas são para maiores de 18 anos — jogue com responsabilidade.
          </p>
        </>
      )}
    </div>
  );
}
