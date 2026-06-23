# Roadmap potencial de produto — FIEL IA

Data: 2026-06-18 13:48:24 -03
Status: rascunho estratégico para transformar em roadmap priorizado
Fonte principal: análise de conversão de `fielchat.com` em `produto/analise-conversao-fielchat-2026-06-12.md`

## Objetivo

Transformar as oportunidades já identificadas em uma base de roadmap de produto, priorizada por impacto em receita, redução de risco e velocidade de lançamento.

Este documento não é um compromisso de entrega. É uma lista estruturada do que pode virar roadmap após decisão do Henry.

## Princípios de priorização

1. **Destravar receita antes de sofisticação.** Tudo que reduz atrito de compra, aumenta confiança ou melhora ativação vem antes de features “legais”.
2. **Não prometer mais do que o produto entrega.** Claims sobre tempo real, verificação, IA, ranking e WhatsApp precisam ser defensáveis.
3. **Mostrar valor antes de pedir dados sensíveis.** O usuário precisa entender e confiar antes de informar CPF ou pagar.
4. **Criar uma jornada clara entre grátis e pago.** O grupo grátis deve alimentar conversão, não apenas tirar o usuário da landing.
5. **Medir eventos mínimos desde cedo.** Sem instrumentação, ficamos opinando em vez de aprender.

---

# Roadmap proposto

## Fase 0 — Confiança, risco e fundação de conversão

**Tese:** antes de escalar tráfego ou adicionar features, a experiência precisa parecer confiável, defensável e segura.

### 0.1 Corrigir prova social e números inconsistentes

**Problema:** a landing comunica `12.000+ torcedores`, mas também mostra contadores zerados. Isso derruba confiança.

**Possíveis entregas:**
- Remover contadores zerados ou substituir por prova real verificável.
- Se o número `12.000+` não estiver documentado, trocar por copy sem número.
- Criar regra interna: só usar números que possam ser comprovados.

**Critério de pronto:** nenhum número público sem fonte interna validada.

**Prioridade:** P0

### 0.2 Ajustar claims absolutos de notícia/verificação/tempo real

**Problema:** frases como “sem fake news”, “notícias verificadas em tempo real” e “a IA sabe tudo” podem gerar risco legal e quebra de expectativa.

**Possíveis entregas:**
- Trocar promessa absoluta por linguagem de classificação: confirmado, rumor, não verificado.
- Explicar o que significa “verificado” dentro do produto.
- Alinhar landing, termos e respostas da IA.

**Critério de pronto:** copy pública compatível com a capacidade real do produto e com termos/política.

**Prioridade:** P0

### 0.3 Melhorar checkout com consentimento e privacidade

**Problema:** o checkout pede CPF, WhatsApp e dados pessoais sem explicar bem o motivo nem exibir consentimento claro próximo ao botão.

**Possíveis entregas:**
- Adicionar links de Termos e Política de Privacidade no checkout.
- Adicionar texto de consentimento para contato e acesso via WhatsApp/e-mail.
- Explicar por que CPF é solicitado.
- Avaliar mover CPF para a etapa do provedor de pagamento, se tecnicamente possível.

**Critério de pronto:** usuário entende por que fornece dados e aceita os termos antes de seguir.

**Prioridade:** P0

### 0.4 Instrumentação mínima de funil

**Problema:** sem eventos, não dá para saber onde a jornada quebra.

**Possíveis eventos:**
- Visualização da landing.
- Clique no CTA principal.
- Clique no CTA do grupo grátis.
- Visualização do checkout.
- Envio do formulário de checkout.
- Redirecionamento para pagamento.
- Retorno ou confirmação de pagamento, se disponível.

**Critério de pronto:** cada etapa crítica do funil gera evento rastreável.

**Prioridade:** P0

---

## Fase 1 — Primeira dobra e demonstração do valor

**Tese:** a landing precisa vender o produto real em segundos, não só a ideia genérica de “IA do Corinthians”.

### 1.1 Novo posicionamento da hero

**Problema:** o H1 atual é amplo e não comunica o ganho imediato.

**Possíveis direções:**
- “A IA do corinthiano que separa notícia real de boato.”
- “Pare de caçar notícia do Timão. Pergunte para a FIEL IA.”
- “Tudo sobre o Corinthians, respondido na hora com contexto.”

**Critério de pronto:** acima da dobra, o usuário entende o que é, para quem é e por que pagar.

**Prioridade:** P1

### 1.2 CTA primário único

**Problema:** “Entrar no grupo grátis” e “Assinar Premium” competem entre si na primeira dobra.

**Possíveis entregas:**
- Definir um CTA primário conforme objetivo do momento: teste, assinatura ou grupo como funil.
- Deixar o CTA secundário visualmente menos forte.
- Evitar dois caminhos equivalentes na hero.

**Critério de pronto:** a landing tem uma ação principal óbvia.

**Prioridade:** P1

### 1.3 Demo real do produto

**Problema:** o usuário é convidado a pagar antes de ver uma resposta, print, vídeo ou amostra concreta.

**Possíveis entregas:**
- Print de conversa real ou mock fiel aprovado.
- Card “Confirmado / Rumor / Não verificado”.
- Bloco com 3 perguntas prontas.
- Mini-demo sem login, se tecnicamente simples.

**Exemplos de perguntas:**
- “O Yuri Alberto está suspenso?”
- “Qual é o próximo jogo do Corinthians?”
- “Esse rumor de contratação é confirmado?”

**Critério de pronto:** antes do preço, o usuário vê uma amostra clara do valor.

**Prioridade:** P1

### 1.4 Reordenar narrativa da landing

**Problema:** a página mistura muitos benefícios antes de consolidar confiança.

**Ordem sugerida:**
1. Dor: boato, tempo perdido, informação espalhada.
2. Demo do produto.
3. Benefícios principais.
4. Prova/confiança.
5. Oferta/preço.
6. FAQ e risco reduzido.

**Critério de pronto:** a página conduz da dor para prova e depois para compra.

**Prioridade:** P1

---

## Fase 2 — Conversão e ativação

**Tese:** depois que a promessa fica clara, a compra precisa parecer simples, segura e reversível.

### 2.1 Reduzir fricção do checkout

**Problema:** muitos campos antes de o usuário estar plenamente convencido podem reduzir conversão.

**Possíveis entregas:**
- Fluxo em etapas: primeiro contato, depois pagamento.
- CPF apenas quando necessário para cobrança.
- Mensagens de erro amigáveis para dados inválidos.
- Resumo dos benefícios ao lado do botão de pagamento.

**Critério de pronto:** checkout deixa claro o que acontece depois e reduz campo sensível antes da hora.

**Prioridade:** P1/P2

### 2.2 Garantia, cancelamento e redução de risco

**Problema:** R$ 56,90/mês é uma compra fria relativamente alta se o usuário ainda não testou valor.

**Possíveis entregas:**
- Reforçar “cancele quando quiser”.
- Avaliar garantia de 7 dias, se operacionalmente suportada.
- Avaliar oferta fundador ou primeiro mês promocional.
- Explicar acesso após pagamento em 3 bullets.

**Critério de pronto:** usuário entende o risco de compra como baixo.

**Prioridade:** P2

### 2.3 Plano de entrada ou teste controlado

**Problema:** pode haver demanda interessada, mas não pronta para pagar R$ 56,90/mês imediatamente.

**Possíveis opções:**
- 3 perguntas grátis antes de assinar.
- Primeira semana por preço reduzido.
- Plano básico com grupo + quiz, sem IA completa.
- Trial com limite de uso.

**Cuidado:** não criar plano barato que canibalize o premium antes de medir intenção real.

**Critério de pronto:** existe uma ponte entre curiosidade e assinatura.

**Prioridade:** P2

### 2.4 Onboarding pós-pagamento

**Problema:** se o usuário paga e não entende rapidamente como usar, o churn começa no primeiro dia.

**Possíveis entregas:**
- Tela ou mensagem pós-pagamento com próximos passos.
- Guia “comece perguntando isso”.
- WhatsApp/e-mail de boas-vindas com 3 usos imediatos.
- Explicação de ranking, quiz e limitações da IA.

**Critério de pronto:** novo assinante sabe exatamente onde clicar, o que perguntar e o que esperar.

**Prioridade:** P2

---

## Fase 3 — Funil grátis, comunidade e retenção

**Tese:** o grupo grátis deve virar um canal de aquisição e conversão, não uma saída sem controle.

### 3.1 Página intermediária do grupo grátis

**Problema:** o botão do grupo grátis leva direto ao WhatsApp, reduzindo controle da jornada.

**Possíveis entregas:**
- Página `/grupo` própria antes do WhatsApp.
- Explicar o que recebe no grátis.
- Comparar grátis vs premium.
- Captura opcional de e-mail/WhatsApp.
- Evento de clique para entrada no grupo.

**Critério de pronto:** a ida ao grupo vira etapa mensurável do funil.

**Prioridade:** P2

### 3.2 Conteúdo recorrente dentro do grupo grátis

**Problema:** sem cadência, o grupo pode virar audiência passiva.

**Possíveis entregas:**
- Quadro diário: “boato ou confirmado?”
- Quiz semanal com ranking.
- Resumo pré-jogo e pós-jogo.
- CTA editorial para premium quando fizer sentido.

**Critério de pronto:** grupo grátis gera hábito e intenção de upgrade.

**Prioridade:** P2/P3

### 3.3 Mecânica de ranking e quiz como retenção

**Problema:** ranking e quiz podem ser bons diferenciais, mas precisam estar conectados a hábito, não só aparecer como feature.

**Possíveis entregas:**
- Ranking semanal.
- Temporadas mensais.
- Badges simples.
- Prêmios simbólicos ou status dentro da comunidade.

**Critério de pronto:** usuário tem motivo para voltar sem depender apenas de notícia.

**Prioridade:** P3

---

## Fase 4 — Produto premium e diferenciação

**Tese:** depois de arrumar conversão e ativação, o premium precisa ter diferenciais que justifiquem recorrência.

### 4.1 Sistema de classificação de notícias/rumores

**Possível entrega central:** cada informação relevante pode ser marcada como:
- Confirmado.
- Rumor forte.
- Rumor fraco.
- Não verificado.
- Desmentido.

**Valor:** transforma “IA que responde” em “produto que reduz ansiedade e fake news”.

**Prioridade:** P2/P3

### 4.2 Fontes e contexto nas respostas da IA

**Problema:** respostas sem fonte reduzem confiança, especialmente em temas de notícia.

**Possíveis entregas:**
- Mostrar fonte quando houver.
- Mostrar data/hora da última atualização.
- Sinalizar incerteza.
- Separar fato, opinião e rumor.

**Prioridade:** P2/P3

### 4.3 WhatsApp como canal premium

**Problema:** WhatsApp é uma promessa forte, mas também aumenta risco operacional e expectativa de disponibilidade.

**Possíveis entregas:**
- Definir claramente o que funciona no WhatsApp.
- Limite de uso, se necessário.
- Mensagens de fallback quando a IA não souber.
- Logs e monitoramento básico de falhas.

**Prioridade:** P3, a menos que já seja parte crítica da venda atual.

### 4.4 Personalização do torcedor

**Possíveis entregas futuras:**
- Preferências: notícias, base, mercado, escalação, história, memes.
- Alertas personalizados.
- Times/competições de interesse.
- Histórico de perguntas.

**Prioridade:** P4 — só depois de validar conversão e retenção básica.

---

# Backlog por área

## Conversão

- Corrigir prova social inconsistente.
- Trocar H1 da hero.
- Reduzir competição entre CTAs.
- Adicionar demo real.
- Reordenar landing.
- Criar FAQ com objeções de compra.
- Fortalecer garantias e cancelamento.
- Testar plano de entrada ou trial.

## Legal/confiança

- Ajustar claims absolutos.
- Exibir vínculo não oficial de forma clara quando relevante.
- Explicar CPF e dados pessoais.
- Adicionar consentimento no checkout.
- Alinhar termos, política e copy da landing.

## Produto core

- Classificação de notícias e rumores.
- Fontes/contexto nas respostas.
- Mini-demo ou perguntas grátis.
- Onboarding pós-pagamento.
- Melhor tratamento de incerteza da IA.

## Comunidade

- Página intermediária do grupo grátis.
- Conteúdo recorrente para grupo.
- CTA de upgrade dentro da cadência editorial.
- Ranking semanal.
- Quiz como hábito.

## Operação/métricas

- Instrumentar eventos do funil.
- Definir painel mínimo de conversão.
- Registrar decisões de preço/oferta.
- Registrar incidentes de pagamento, WhatsApp e IA.

---

# Sequência recomendada de execução

## Agora

1. Corrigir inconsistências de confiança na landing.
2. Ajustar claims de verificação/tempo real.
3. Colocar termos, privacidade e consentimento no checkout.
4. Explicar CPF.
5. Definir CTA principal da hero.

## Próximo ciclo

1. Adicionar demo real do produto.
2. Reescrever hero e narrativa da landing.
3. Instrumentar eventos básicos.
4. Melhorar checkout com resumo de benefícios e mensagens amigáveis.
5. Criar FAQ orientado a objeções.

## Depois

1. Criar página intermediária para grupo grátis.
2. Testar ponte grátis → premium.
3. Estruturar onboarding pós-pagamento.
4. Criar rotina de conteúdo do grupo.
5. Evoluir ranking/quiz para retenção.

## Futuro

1. Sistema robusto de classificação de rumores.
2. Fontes e contexto nas respostas da IA.
3. WhatsApp premium mais completo.
4. Personalização e alertas.

---

# Decisões pendentes para transformar em roadmap fechado

1. O objetivo imediato é assinatura direta, teste grátis ou grupo grátis como funil?
2. O número `12.000+` é comprovável e deve continuar na página?
3. O CPF é obrigatório antes do Asaas ou pode ser deslocado para etapa posterior?
4. Existe capacidade operacional para garantia, trial ou preço de entrada?
5. O WhatsApp já é parte funcional do premium ou ainda é promessa de roadmap?
6. Qual é a principal promessa do produto: notícia confiável, chat especialista, comunidade gamificada ou tudo isso em ordem de prioridade?
7. Quais eventos de analytics já existem hoje?
8. Quais fontes a IA usa ou deve usar para classificar notícias e rumores?

---

# Métricas a definir sem inventar baseline

Não há baseline validado neste documento. As métricas abaixo são sugestões de acompanhamento:

- Conversão landing → checkout.
- Conversão checkout → pagamento iniciado.
- Conversão pagamento iniciado → pagamento concluído.
- Cliques no CTA do grupo grátis.
- Conversão grupo grátis → premium.
- Ativação pós-pagamento: primeiro acesso ou primeira pergunta.
- Uso nos primeiros 7 dias.
- Cancelamento no primeiro mês.
- Perguntas respondidas com fonte/contexto.
- Incidentes ou reclamações sobre notícia incorreta.

---

# Minha recomendação

O roadmap deve começar menos por “mais features” e mais por **confiança + demonstração + checkout**.

A FIEL IA já tem uma ideia vendável: ajudar o corinthiano a escapar de boato, acompanhar o time e se divertir com IA. O gargalo provável está em provar isso rápido e reduzir medo de compra. Portanto, eu priorizaria:

1. **P0:** limpar risco e inconsistência.
2. **P1:** mostrar demo real e reposicionar a hero.
3. **P2:** simplificar checkout e medir funil.
4. **P3:** transformar grupo/quiz/ranking em retenção e upgrade.

Features novas só deveriam ganhar prioridade quando ajudarem diretamente uma dessas quatro frentes.
