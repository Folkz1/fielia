# Análise de conversão — fielchat.com

Data: 2026-06-12 22:47:07 -03
Escopo verificado: landing `/`, checkout inicial `/assinar`, grupo grátis `/grupo`, privacidade `/privacidade`, termos `/termos`, contato `/contato`.

## Diagnóstico executivo

A landing tem boa estética, identidade forte e uma proposta emocional clara para corinthiano fanático. O maior problema de conversão não é visual: é falta de prova concreta e excesso de promessa ampla antes do pagamento.

Principais gargalos:

1. Hero não mostra o produto nem o ganho imediato.
2. CTA divide atenção entre grupo grátis e assinatura premium.
3. A página usa números/provas que podem gerar desconfiança: `12.000+ torcedores`, mas contadores aparecem como `0` assinantes, `0` pontos e `0` mensagens.
4. Checkout pede CPF antes de criar confiança suficiente.
5. Falta uma etapa de demonstração ou amostra real antes do preço.
6. Promessas de “notícias verificadas em tempo real” e IA “atualizada em tempo real” precisam de cuidado legal/produto para não prometer mais do que o sistema entrega.
7. Não há garantia, trial, plano de entrada ou oferta intermediária para reduzir risco percebido.

## O que foi observado

### Landing

Pontos fortes:
- Visual escuro/vermelho combina com Corinthians e torcida.
- Linguagem tem tom de torcedor, com bom encaixe emocional.
- Dor inicial é boa: fake news, boatos, informação atrasada.
- Preço aparece com ancoragem simples: menos de R$ 2 por dia.
- Há termos, privacidade e contato acessíveis no rodapé.
- Console sem erros JavaScript no fluxo visitado.

Pontos fracos:
- H1: “Você está pronto para saber tudo sobre o Corinthians?” é genérico. Não comunica claramente o que o usuário recebe hoje.
- O subtítulo explica melhor que o H1: “Chat com IA especialista... Notícias verificadas... Quiz...”
- Hero não mostra print, vídeo, demo, conversa real ou exemplo de resposta.
- Dois CTAs competem na primeira dobra: “Entrar no grupo grátis” e “Assinar Premium”. Isso pode capturar curiosos, mas dilui compra se não houver estratégia clara.
- Prova social está inconsistente: “12.000+ torcedores” no título/depoimento, mas métricas aparecem zeradas. Isso derruba confiança.
- Depoimentos parecem genéricos; sem contexto, foto, print ou origem verificável.
- A seção “Funciona em 3 passos” começa com “Assine o plano”, antes de mostrar valor concreto. Parece venda antes de demonstração.
- Recursos listados são muitos: chat, notícias, quiz, ranking, memes, WhatsApp. A oferta fica ampla demais e menos memorável.

### Página /assinar

Pontos fortes:
- Página limpa, direta e com preço claro: R$ 56,90/mês.
- Informa Asaas, cancelamento e acesso por e-mail + WhatsApp.
- Visual coerente com a marca.

Pontos fracos:
- Pede Nome, E-mail, WhatsApp e CPF antes do pagamento. CPF é uma fricção forte, especialmente sem explicar por que é necessário.
- Não há link visível para Termos/Privacidade no formulário antes do pagamento.
- Não há checkbox de aceite dos termos/política nem consentimento claro para contato por WhatsApp.
- Não há resumo dos principais benefícios no momento de checkout além de “Acesso completo à IA do Corinthians”.
- Não há selo/explicação de segurança forte, reembolso, garantia, cancelamento detalhado ou política de privacidade próxima ao botão.
- Validação visual é fraca: ao tentar enviar vazio/inválido, o navegador usa validação nativa, mas não há mensagens amigáveis do produto. CPF com `123` não acusa erro no HTML antes de envio.

### /grupo

- O CTA “Entrar no grupo grátis” leva direto para página externa do WhatsApp: convite do grupo “FIEL IA FREE”.
- Isso é útil para captação, mas perde controle da jornada: o usuário sai da landing sem uma ponte de conversão, pixel/evento explícito ou página intermediária explicando o valor do grupo e o caminho para premium.

### Legal/risco

- Termos declaram que FIEL.IA não possui vínculo oficial com o Sport Club Corinthians Paulista.
- Termos dizem que a IA não garante 100% de precisão.
- Política de privacidade menciona CPF, WhatsApp, histórico de mensagens, ranking e fornecedores.
- Risco: a landing promete “notícias verificadas em tempo real”, “sem fake news” e “a IA sabe tudo/atualizada em tempo real”. Isso deve ser alinhado com termos, capacidade real e UX para evitar promessa absoluta.

## Melhorias priorizadas por impacto na conversão

### P0 — Corrigir confiança antes de escalar tráfego

1. Remover ou ajustar a inconsistência `12.000+` versus contadores `0`.
   - Se 12.000+ ainda não for comprovável, trocar por copy sem número: “Torcedores do Timão já estão testando a FIEL IA”.
   - Se for comprovável, fazer os contadores baterem ou remover os contadores zerados.

2. Trocar promessa absoluta por promessa defensável.
   - De: “Sem fake news” / “verificadas em tempo real”.
   - Para: “monitoramos fontes confiáveis e sinalizamos o que está confirmado, rumor ou não verificado”.
   - Isso aumenta confiança e reduz risco legal.

3. Colocar Termos, Privacidade e consentimento no checkout.
   - Texto próximo ao botão: “Ao continuar, você concorda com os Termos e Política de Privacidade e aceita receber comunicações de acesso pelo WhatsApp.”
   - Linkar Termos e Política.

4. Explicar CPF no checkout.
   - Microcopy: “CPF usado apenas para emissão/cobrança via Asaas. Não armazenamos dados de cartão.”
   - Melhor ainda: pedir CPF só na etapa Asaas, se tecnicamente possível.

### P1 — Melhorar primeira dobra

5. Alterar o H1 para proposta de valor mais concreta.
   Sugestões:
   - “A IA do corinthiano que separa notícia real de boato.”
   - “Tudo sobre o Corinthians, verificado e respondido na hora.”
   - “Pare de caçar notícia do Timão. Pergunte para a FIEL IA.”

6. Usar um CTA primário único na hero.
   Recomendação: se a prioridade é receita, CTA principal deve ser premium ou teste guiado.
   - Primário: “Testar a FIEL IA agora” ou “Assinar por R$ 56,90/mês”
   - Secundário discreto: “Entrar no grupo grátis”

7. Inserir demonstração real acima da dobra ou logo abaixo.
   Exemplos:
   - Print de conversa: “O Yuri Alberto está suspenso?” → resposta com fonte/status.
   - Card de notícia com selo: Confirmado / Rumor / Não verificado.
   - Mini-demo com 3 perguntas prontas.

8. Reordenar a narrativa.
   Ordem sugerida:
   - Dor: boato e perda de tempo.
   - Demonstração do produto.
   - Benefícios principais.
   - Prova/confiança.
   - Oferta/preço.

### P2 — Aumentar conversão do checkout

9. Reduzir campos iniciais.
   Fluxo recomendado:
   - Etapa 1: Nome + WhatsApp/e-mail.
   - Etapa 2: pagamento/CPF quando necessário.
   - Ou usar checkout Asaas para dados sensíveis.

10. Adicionar “o que acontece depois de pagar” em 3 bullets antes do botão.
   - Recebe link de acesso por e-mail.
   - Recebe instrução no WhatsApp.
   - Pode cancelar quando quiser.

11. Adicionar garantias de redução de risco.
   - “Cancele quando quiser” já existe, mas deve ficar mais forte.
   - Avaliar: “7 dias de garantia” ou “primeiro mês preço fundador”, se operacionalmente suportado.

12. Criar plano/entrada mais barato ou trial controlado.
   R$ 56,90/mês pode ser alto para compra fria. Alternativas:
   - R$ 9,90 primeira semana.
   - R$ 19,90 grupo + quiz sem IA completa.
   - 3 perguntas grátis antes de assinar.

### P3 — Melhorar prova e conteúdo

13. Trocar depoimentos genéricos por prova real.
   - Prints autorizados de conversa no WhatsApp/grupo.
   - Depoimento com contexto: “usei para checar rumor X”.
   - Se não houver prova real, evitar nomes/cidades que pareçam fabricados.

14. Transformar “meme generator” em benefício secundário.
   Hoje ele pode distrair do valor principal: informação confiável + IA + quiz. Usar como bônus, não pilar central.

15. Melhorar FAQ com objeções de compra.
   Adicionar:
   - “Por que preciso informar CPF?”
   - “A FIEL IA é oficial do Corinthians?”
   - “O que significa notícia verificada?”
   - “Como cancelo?”
   - “Funciona no WhatsApp mesmo?”

## Experimentos recomendados

### Experimento A — Hero orientado a dor

H1: “Cansou de cair em boato do Corinthians?”
Sub: “A FIEL IA monitora fontes confiáveis, resume o que importa e responde suas dúvidas sobre o Timão no site e no WhatsApp.”
CTA: “Testar agora”
Secundário: “Ver como funciona”

### Experimento B — Hero orientado a produto

H1: “Pergunte qualquer coisa sobre o Corinthians.”
Sub: “Notícias, escalações, história, quiz e memes. Uma IA feita para torcedor fiel.”
CTA: “Assinar por R$ 56,90/mês”
Secundário: “Entrar no grupo grátis”

### Experimento C — Free group como funil

Antes de mandar para o WhatsApp, criar uma página `/grupo` própria com:
- promessa clara do grupo grátis;
- o que recebe no grátis;
- diferença para premium;
- botão “Entrar no WhatsApp”;
- captura opcional de e-mail/WhatsApp;
- evento de analytics.

## Checklist de implementação rápida

- [ ] Corrigir/remover contadores zerados.
- [ ] Ajustar claims absolutos de verificação/tempo real.
- [ ] Adicionar links de Termos/Privacidade e aceite no checkout.
- [ ] Explicar uso do CPF ou mover CPF para etapa de pagamento.
- [ ] Trocar H1 da hero por proposta mais concreta.
- [ ] Inserir print/demo real do produto.
- [ ] Fortalecer CTA premium e reduzir competição com CTA grátis.
- [ ] Adicionar FAQ sobre vínculo não oficial, CPF, verificação e cancelamento.
- [ ] Criar página intermediária para `/grupo` em vez de redirect direto ao WhatsApp.
- [ ] Instrumentar eventos: hero CTA, grupo CTA, checkout view, checkout submit, payment redirect.
