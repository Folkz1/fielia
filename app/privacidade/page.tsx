import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade - FIEL.IA",
  description: "Política de privacidade da plataforma FIEL.IA",
};

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <Link href="/" className="font-heading text-2xl text-white tracking-wide">
          FIEL IA<span className="text-orange-500 ml-1">●</span>
        </Link>

        <h1 className="font-heading text-4xl md:text-5xl mt-10 mb-8">Política de Privacidade</h1>
        <p className="text-white/40 text-sm mb-10">Atualizado em 16 de março de 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-white/70 leading-relaxed">
          <section>
            <h2 className="text-white text-xl font-bold mb-3">1. Dados que Coletamos</h2>
            <p>Coletamos os seguintes dados pessoais:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Cadastro:</strong> nome, e-mail, CPF (para pagamento e premiação), telefone (opcional)</li>
              <li><strong>Uso:</strong> histórico de mensagens com a IA, pontuação do quiz, preferências</li>
              <li><strong>Pagamento:</strong> dados de cobrança processados pela Asaas (não armazenamos dados de cartão)</li>
              <li><strong>WhatsApp:</strong> número de telefone e mensagens trocadas com o bot</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">2. Como Usamos seus Dados</h2>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Fornecer e personalizar os serviços da Plataforma</li>
              <li>Processar pagamentos e distribuir prêmios</li>
              <li>Enviar notificações sobre o serviço (e-mail e WhatsApp)</li>
              <li>Melhorar a qualidade das respostas da IA</li>
              <li>Gerar estatísticas anônimas de uso</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">3. Compartilhamento de Dados</h2>
            <p>Seus dados pessoais não são vendidos. Compartilhamos dados apenas com:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>Asaas:</strong> processamento de pagamentos</li>
              <li><strong>OpenRouter/OpenAI:</strong> processamento de mensagens pela IA (sem dados pessoais identificáveis)</li>
              <li><strong>Evolution API:</strong> envio e recebimento de mensagens WhatsApp</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">4. Armazenamento e Segurança</h2>
            <p>Seus dados são armazenados em servidores seguros com criptografia. Senhas são hasheadas com bcrypt. Utilizamos HTTPS em todas as comunicações. Dados de pagamento são processados pela Asaas e não armazenamos dados de cartão de crédito.</p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">5. Seus Direitos (LGPD)</h2>
            <p>De acordo com a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem direito a:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incompletos ou desatualizados</li>
              <li>Solicitar a exclusão dos seus dados</li>
              <li>Revogar o consentimento para uso dos dados</li>
              <li>Solicitar a portabilidade dos dados</li>
            </ul>
            <p className="mt-2">Para exercer esses direitos, entre em contato pelo e-mail <a href="mailto:suporte@fielchat.com" className="text-orange-500 hover:underline">suporte@fielchat.com</a>.</p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">6. Cookies</h2>
            <p>Utilizamos cookies essenciais para autenticação e sessão. Não utilizamos cookies de rastreamento de terceiros.</p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">7. Retenção de Dados</h2>
            <p>Mantemos seus dados enquanto sua conta estiver ativa. Após cancelamento, dados são retidos por 30 dias para possível reativação e então excluídos permanentemente, exceto quando a retenção for exigida por lei.</p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">8. Menores de Idade</h2>
            <p>A Plataforma é destinada a maiores de 18 anos. Não coletamos intencionalmente dados de menores de idade.</p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">9. Alterações nesta Política</h2>
            <p>Podemos atualizar esta política periodicamente. Alterações significativas serão comunicadas por e-mail.</p>
          </section>

          <section>
            <h2 className="text-white text-xl font-bold mb-3">10. Contato do Encarregado (DPO)</h2>
            <p>Para questões de privacidade: <a href="mailto:suporte@fielchat.com" className="text-orange-500 hover:underline">suporte@fielchat.com</a></p>
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
