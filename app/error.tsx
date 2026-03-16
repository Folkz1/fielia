"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[FIEL.IA Error]", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="font-heading text-[120px] leading-none text-red-500/20">500</p>
        <h1 className="font-heading text-3xl text-white mt-4 mb-3">Algo deu errado</h1>
        <p className="text-white/60 mb-8">
          Um erro inesperado aconteceu. Nossa equipe já foi notificada.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-orange-600 text-white font-semibold rounded-full px-6 py-3 text-sm hover:bg-orange-500 transition-colors"
          >
            Tentar novamente
          </button>
          <Link
            href="/"
            className="border border-white/20 text-white font-semibold rounded-full px-6 py-3 text-sm hover:bg-white/10 transition-colors"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </main>
  );
}
