"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Coins, AlertCircle, ChevronRight } from "lucide-react";

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
interface OddsResp {
  jogo: OddsJogo | null;
  probabilidades: { casa: number; empate: number; fora: number } | null;
}

export function OddsCard() {
  const [data, setData] = useState<OddsResp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/odds")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setData(d))
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  // não renderiza nada se não houver jogo (não polui o dashboard)
  if (!loading && !data?.jogo) return null;

  const j = data?.jogo;
  const p = data?.probabilidades;

  // perspectiva do torcedor: "Vitória do Corinthians" pode ser casa (mandante) ou fora (visitante)
  const corMandante = j ? /corinthians/i.test(j.mandante) : true;
  const adversario = j ? (corMandante ? j.visitante : j.mandante) : "";
  const probCor = p ? (corMandante ? p.casa : p.fora) : null;
  const probAdv = p ? (corMandante ? p.fora : p.casa) : null;
  const oddCor = j ? (corMandante ? j.casa : j.fora) : null;
  const oddAdv = j ? (corMandante ? j.fora : j.casa) : null;

  const linhas =
    p && j
      ? [
          { label: "Vitória do Corinthians", prob: probCor!, odd: oddCor, cor: "bg-orange-500" },
          { label: "Empate", prob: p.empate, odd: j.empate, cor: "bg-gray-400" },
          { label: `Vitória do ${adversario}`, prob: probAdv!, odd: oddAdv, cor: "bg-gray-600" },
        ]
      : [];

  return (
    <div className="bg-gradient-to-br from-orange-500/20 to-transparent border border-orange-500/30 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <Coins className="w-8 h-8 text-orange-500" />
        <div>
          <h3 className="text-xl font-bold">Probabilidades do próximo jogo</h3>
          <p className="text-sm text-gray-400">
            {loading ? "Carregando..." : j ? `${j.mandante} x ${j.visitante}` : ""}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-9 bg-white/5 rounded-lg" />
          ))}
        </div>
      ) : j && j.temOdds && p ? (
        <>
          <div className="space-y-3">
            {linhas.map((l) => (
              <div key={l.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-200">{l.label}</span>
                  <span className="text-gray-400">
                    <span className="font-bold text-white">{l.prob}%</span>
                    {l.odd ? <span className="ml-2 text-orange-400">odd {l.odd}</span> : null}
                  </span>
                </div>
                <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                  <div className={`h-full ${l.cor} rounded-full transition-all`} style={{ width: `${l.prob}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-500 mt-4 flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            Probabilidades estimadas a partir das odds {j.bookie ? `(${j.bookie})` : ""}. Apostas são para maiores de 18 anos — jogue com responsabilidade.
          </p>
        </>
      ) : (
        <div className="p-4 bg-black/30 rounded-lg text-sm text-gray-300">
          As casas ainda não abriram as odds deste jogo. As probabilidades aparecem aqui assim que o mercado abrir. ⚽
        </div>
      )}
      <Link
        href="/dashboard/jogos"
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-orange-400 hover:underline"
      >
        Ver jogos &amp; odds do dia <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
