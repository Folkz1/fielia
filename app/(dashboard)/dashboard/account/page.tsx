import { Button } from "@/components/ui/button";
import { CreditCard, Crown, ShieldCheck, User } from "lucide-react";

export default function AccountPage() {
  const benefits = [
    "Newsletter diária com curadoria",
    "Quiz semanal com pontuação extra",
    "Memes exclusivos do Timão",
    "Prioridade nas respostas da IA",
  ];

  const recentPoints = [
    { label: "Quiz Semanal #32", points: 150, date: "27/01/2026" },
    { label: "Quiz Semanal #31", points: 120, date: "20/01/2026" },
    { label: "Quiz Semanal #30", points: 100, date: "13/01/2026" },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading text-white">Conta</h1>
          <p className="text-gray-400 mt-2">
            Gerencie seu perfil, assinatura e histórico de pontos.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary">Atualizar dados</Button>
          <Button>Assinar Premium</Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="card-corinthians lg:col-span-2">
          <div className="flex items-center gap-3 text-corinthians-gold">
            <User className="w-5 h-5" />
            <h2 className="font-heading text-2xl">Perfil do Torcedor</h2>
          </div>
          <p className="text-gray-400 mt-2">
            Dados utilizados para personalizar o conteúdo no WhatsApp.
          </p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400">Nome</label>
              <input
                className="w-full mt-2 rounded-lg bg-corinthians-gray-dark border border-gray-700 px-3 py-2 text-white"
                defaultValue="Fiel Torcedor"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Email</label>
              <input
                className="w-full mt-2 rounded-lg bg-corinthians-gray-dark border border-gray-700 px-3 py-2 text-white"
                defaultValue="fiel@torcida.com"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Telefone</label>
              <input
                className="w-full mt-2 rounded-lg bg-corinthians-gray-dark border border-gray-700 px-3 py-2 text-white"
                defaultValue="(11) 99999-9999"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Time favorito</label>
              <input
                className="w-full mt-2 rounded-lg bg-corinthians-gray-dark border border-gray-700 px-3 py-2 text-white"
                defaultValue="Corinthians"
              />
            </div>
          </div>
        </section>

        <section className="card-corinthians">
          <div className="flex items-center gap-3 text-corinthians-gold">
            <Crown className="w-5 h-5" />
            <h2 className="font-heading text-2xl">Plano atual</h2>
          </div>
          <p className="text-gray-400 mt-2">
            Controle o status do seu acesso premium.
          </p>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Status</span>
              <span className="px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-200">
                Ativo
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Renovação</span>
              <span className="text-sm text-white">03/02/2026</span>
            </div>
            <div className="border-t border-white/10 pt-4">
              <p className="text-sm text-gray-400 mb-3">Benefícios premium</p>
              <ul className="space-y-2 text-sm text-gray-200">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-corinthians-gold" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
            <Button variant="secondary" className="w-full">
              Cancelar plano
            </Button>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="card-corinthians">
          <div className="flex items-center gap-3 text-corinthians-gold">
            <CreditCard className="w-5 h-5" />
            <h2 className="font-heading text-2xl">Pagamento</h2>
          </div>
          <p className="text-gray-400 mt-2">
            Gerencie o cartão e o status da assinatura.
          </p>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Cartão cadastrado</span>
              <span className="text-sm text-white">**** 3829</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Status da assinatura</span>
              <span className="px-3 py-1 rounded-full text-xs bg-blue-500/20 text-blue-200">
                Teste
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Button>Assinar Premium</Button>
              <Button variant="secondary">Atualizar cartão</Button>
            </div>
          </div>
        </section>

        <section className="card-corinthians">
          <div className="flex items-center gap-3 text-corinthians-gold">
            <Crown className="w-5 h-5" />
            <h2 className="font-heading text-2xl">Histórico de pontos</h2>
          </div>
          <p className="text-gray-400 mt-2">
            Últimos quizzes respondidos e pontuação recebida.
          </p>

          <div className="mt-6 space-y-3">
            {recentPoints.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between bg-corinthians-gray-dark rounded-lg px-4 py-3"
              >
                <div>
                  <p className="text-white font-semibold">{item.label}</p>
                  <p className="text-xs text-gray-400">{item.date}</p>
                </div>
                <span className="text-corinthians-gold font-semibold">+{item.points}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
