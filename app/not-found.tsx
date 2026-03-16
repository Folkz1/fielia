import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <p className="font-heading text-[120px] leading-none text-orange-500/20">404</p>
        <h1 className="font-heading text-3xl text-white mt-4 mb-3">Página não encontrada</h1>
        <p className="text-white/60 mb-8">
          Essa jogada não existe. Mas a FIEL IA tem muito mais para você.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="bg-orange-600 text-white font-semibold rounded-full px-6 py-3 text-sm hover:bg-orange-500 transition-colors"
          >
            Voltar ao início
          </Link>
          <Link
            href="/dashboard"
            className="border border-white/20 text-white font-semibold rounded-full px-6 py-3 text-sm hover:bg-white/10 transition-colors"
          >
            Ir para o dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
