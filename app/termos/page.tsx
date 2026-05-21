import type { Metadata } from "next";
import Link from "next/link";
import { FielLogo } from "@/components/fiel-logo";

export const metadata: Metadata = {
  title: "Termos de Uso - FIEL.IA",
  description: "Termos de uso da plataforma FIEL.IA",
};

export default function TermosPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <Link href="/" className="inline-flex items-center gap-3">
          <FielLogo size="sm" className="mx-0 shadow-none" />
          <span className="font-heading text-2xl text-white tracking-wide">FIEL IA</span>
        </Link>

        <h1 className="font-heading text-4xl md:text-5xl mt-10 mb-8">Termos de Uso</h1>
        <p className="text-white/40 text-sm mb-10">Atualizado em 16 de março de 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-white/70 leading-relaxed">
          <section>
            <h2 className="text-white text-xl font-bold mb-3">1. Aceitação dos Termos</h2>
            <p>Ao acessar e utilizar a plataforma FIEL.IA (&ldquo;Plataforma&rdquo;), você concorda com estes Termos de Uso. Se não concordar com qualquer parte destes termos, não utilize a Plataforma.</p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">2. Descrição do Serviço</h2>
            <p>A FIEL.IA é uma plataforma de entretenimento e informação destinada a torcedores do Sport Club Corinthians Paulista, oferecendo:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Chat com inteligência artificial especializada</li>
              <li>Notícias verificadas sobre o Corinthians</li>
              <li>Quizzes, rankings e recursos premium</li>
              <li>Geração de memes com IA</li>
              <li>Acesso via site e WhatsApp</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">3. Cadastro e Conta</h2>
            <p>Para utilizar os serviços, é necessário criar uma conta com informações verdadeiras. Você é responsável pela segurança da sua senha e por todas as atividades realizadas em sua conta.</p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">4. Assinatura e Pagamento</h2>
            <p>A assinatura premium é cobrada mensalmente no valor vigente (atualmente R$ 56,90/mês). O pagamento é processado pela Asaas Gestão Financeira S.A. O cancelamento pode ser feito a qualquer momento sem multa, com acesso mantido até o fim do período pago.</p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">5. Quiz e Ranking</h2>
            <p>Os quizzes e rankings existem para entretenimento, engajamento e acompanhamento de desempenho dos usuarios. A FIEL.IA nao oferece sorteios, free trial ou beneficio financeiro automatico em dinheiro, ingressos ou produtos fisicos.</p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">6. Uso Aceitável</h2>
            <p>É proibido utilizar a Plataforma para disseminar conteúdo ilegal, ofensivo, discriminatório ou que viole direitos de terceiros. Tentativas de manipular o quiz, ranking ou qualquer sistema da Plataforma resultarão em banimento.</p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">7. Propriedade Intelectual</h2>
            <p>Todo o conteúdo da Plataforma (textos, código, design, marca) é propriedade da FIEL.IA. A FIEL.IA não possui vínculo oficial com o Sport Club Corinthians Paulista. Marcas e nomes do clube são utilizados para fins informativos.</p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">8. Limitação de Responsabilidade</h2>
            <p>A FIEL.IA não garante que as informações fornecidas pela IA sejam 100% precisas. O serviço é fornecido &ldquo;como está&rdquo; e não nos responsabilizamos por decisões tomadas com base em conteúdo da Plataforma.</p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">9. Alterações nos Termos</h2>
            <p>Podemos atualizar estes termos a qualquer momento. Alterações significativas serão comunicadas por e-mail ou dentro da Plataforma.</p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">10. Contato</h2>
            <p>Para dúvidas sobre estes termos, entre em contato pelo e-mail <a href="mailto:suporte@fielchat.com" className="text-orange-500 hover:underline">suporte@fielchat.com</a>.</p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 text-center">
          <Link href="/" className="text-sm text-white/50 hover:text-white transition-colors">
            ← Voltar para o início
          </Link>
        </div>
      </div>
    </main>
  );
}
