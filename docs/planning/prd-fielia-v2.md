---
stepsCompleted:
  - prd-reconciled-from-updated-pdfs
  - orquestra-sanitized
  - removed-obsolete-trial-and-sorteio
workflowType: prd
projectName: Fiel.IA v2
date: 2026-04-28
sourceOfTruth: updated-pdfs-plus-diego-corrections
---

# PRD Reconciliado - Fiel.IA v2

## Status Desta Versao

Esta versao substitui o PRD anterior para planejamento BMAD e implementacao.

Entradas consideradas:

- `docs/reference/FielIA_v2_PRD.pdf`
- `docs/reference/estrutura-funil-fielia.pdf`
- `docs/reference/orquestra-fielia-sanitized.md`
- Correcao explicita de Diego em 2026-04-28: nao tera sorteio, nao tera free trial, premium paga desde o inicio.

O PDF atualizado ainda continha algumas referencias antigas a sorteio, trial gratis, premios e concessao premium. Essas referencias estao obsoletas e nao devem ser implementadas.

## Regras Inviolaveis

- Nao existe sorteio no produto.
- Nao existe free trial.
- Nao existe premio de premium temporario.
- Usuario premium paga desde o inicio.
- Cadastro gratuito e quiz gratuito sao topo de funil, nao acesso premium temporario.
- CPF nao pode ser salvo em texto puro.
- Deploy, migracao Prisma e alteracao de banco compartilhado exigem aprovacao explicita de Diego.

## Executive Summary

Fiel.IA e uma plataforma SaaS B2C para torcedores do Corinthians, combinando grupo WhatsApp, quiz competitivo, ranking, conteudo diario e IA conversacional. A v2 transforma a base existente em um funil completo:

1. Criativos pagos e organicos levam torcedores para grupo WhatsApp.
2. Grupo recebe conteudo diario, audio curto e imagem informativa.
3. IA responde no grupo e conduz para cadastro gratuito.
4. Usuario free faz quiz mensal e ve resultado/ranking limitado.
5. CTA personalizada leva para assinatura premium paga desde o inicio.
6. Premium desbloqueia app completo, ranking completo, quiz semanal e recursos avancados.

Stack existente: Next.js 16, Prisma 7, PostgreSQL, NextAuth v5, OpenRouter, Evolution API, Asaas e rotas admin ja iniciadas para noticias, podcast, RAG, YouTube, quizzes e assinaturas.

## Publico-Alvo

- Torcedores do Corinthians ativos em WhatsApp, Instagram, TikTok e YouTube.
- Perfil principal: 18-45 anos, acompanha noticias do clube diariamente, participa de grupos e gosta de provar conhecimento.
- Motivacao: demonstrar que sabe mais que outros torcedores, receber conteudo util e competir em ranking.

## Proposta de Valor

- Quiz como prova publica de conhecimento.
- Ranking como elemento de status e recorrencia.
- Conteudo diario de Corinthians direto no WhatsApp.
- IA no grupo para responder duvidas e manter engajamento.
- Premium como assinatura paga clara, sem trial, para quem quer competir mais e acessar tudo.

## Funil Principal

### F1 - Aquisicao

- Canais: TikTok, Meta/Instagram/Facebook, YouTube e trafego organico.
- Destino principal: grupo WhatsApp do Fiel.IA.
- Criativos devem destacar quiz, ranking, conhecimento sobre Corinthians e comunidade.

### F2 - Grupo WhatsApp

- Usuario entra no grupo e recebe contexto do Fiel.IA.
- Grupo recebe conteudo diario:
  - audio curto em estilo podcast/radio;
  - imagem/infografico com principais noticias;
  - chamadas para cadastro e quiz.
- IA responde perguntas sobre Corinthians no grupo.
- IA deve usar busca externa quando necessario, com fallback claro quando nao conseguir validar.

### F3 - Cadastro Gratuito

- Link principal: `/cadastro-free`.
- Campos: telefone/WhatsApp, nome completo, CPF e aceite de termos.
- Validacoes:
  - telefone BR com 11 digitos;
  - nome com minimo de 3 caracteres;
  - CPF matematicamente valido;
  - termos obrigatorios.
- CPF deve ser normalizado, validado e salvo apenas como hash.
- Ao concluir:
  - se quiz estiver aberto, redirecionar para `/quiz-free`;
  - se quiz estiver fechado, mostrar confirmacao e proxima data.

### F4 - Quiz Free

- Periodicidade: mensal, preferencialmente no dia 15.
- Formato: 10 perguntas, 10 segundos por pergunta, sem voltar.
- Salvar progresso/respostas de modo resiliente.
- Validacao server-side do tempo: resposta fora do limite nao pontua.
- Resultado imediato apos envio.

### F5 - Resultado e Ranking

- Usuario free ve:
  - pontuacao;
  - acertos;
  - tempo medio;
  - sua posicao;
  - Top 10 geral;
  - ranking completo bloqueado.
- Usuario premium ve ranking completo.
- Rankings free e premium devem ser separados quando fizer sentido para campanha e recorrencia.

### F6 - CTA Premium

- CTA enviada 2-4h apos o quiz, conforme desempenho.
- Todas as CTAs levam para assinatura paga.
- Nao prometer teste gratis, premio, sorteio ou premium temporario.
- A CTA deve reforcar:
  - quiz semanal;
  - ranking completo;
  - evolucao no conhecimento;
  - acesso completo ao app;
  - IA e conteudos premium conforme plano.

### F7 - Premium

- Preco base: R$56,90/mes via Asaas, salvo nova decisao comercial.
- Premium so ativa apos confirmacao de pagamento.
- Magic link libera acesso apos pagamento confirmado.
- Cancelamento/inadimplencia remove acesso conforme regra de ciclo de cobranca definida em arquitetura.

## Matriz Free vs Premium

| Feature | Free | Premium |
|---|---:|---:|
| Entrar no grupo WhatsApp | Sim | Sim |
| Receber conteudo diario no grupo | Sim | Sim |
| Cadastro no app | Sim | Sim |
| Quiz mensal free | Sim | Sim |
| Resultado do quiz free | Sim | Sim |
| Ver sua posicao | Sim | Sim |
| Ver Top 10 free | Sim | Sim |
| Ranking completo | Bloqueado | Sim |
| Quiz semanal | Nao | Sim |
| Chat IA no app | Bloqueado ou limitado | Sim |
| Memes/imagens | Bloqueado | Sim |
| Historico/badges | Bloqueado | Sim |
| Admin/content tools | Nao | Admin |
| Sorteio | Nao existe | Nao existe |
| Free trial | Nao existe | Nao existe |

## Jornadas

### J1 - Usuario Free converte

1. Ve um criativo sobre quiz do Corinthians.
2. Entra no grupo WhatsApp.
3. Recebe mensagens do funil e link `/cadastro-free`.
4. Cadastra telefone, nome, CPF e termos.
5. Faz quiz mensal.
6. Ve score, sua posicao e Top 10.
7. Recebe CTA personalizada para assinatura paga.
8. Assina premium via Asaas.
9. Recebe magic link e acessa recursos premium.

### J2 - Usuario Free nao converte no primeiro contato

1. Faz cadastro e quiz.
2. Tem desempenho baixo ou medio.
3. Recebe CTA de melhoria, sem trial.
4. Continua no grupo recebendo audio/imagem diaria.
5. Interage com IA no grupo.
6. Retorna no proximo quiz mensal e recebe nova CTA.

### J3 - Usuario Premium

1. Assina desde o inicio, sem trial.
2. Acessa app completo.
3. Participa de quiz semanal.
4. Ve ranking completo.
5. Recebe conteudo e interacoes premium.
6. Mantem assinatura pela recorrencia do ranking e competicao.

### J4 - Admin/Operacao

1. Configura quiz mensal/free e quiz premium.
2. Monitora cadastros, assinaturas e ranking.
3. Acompanha funil WhatsApp.
4. Gera ou aprova conteudo diario.
5. Usa modulo de automacao de posts para carrosseis e videos curtos.

## Escopo MVP

1. Cadastro free (`/cadastro-free`).
2. Hash de CPF e aceite de termos.
3. Quiz mensal free com timer server-side.
4. Resultado e ranking free limitado.
5. Helper central `isPremium(userId)` usando a regra real do usuario.
6. Gating visual e backend para recursos premium.
7. Checkout premium pago via Asaas.
8. Webhook Asaas idempotente ativando premium somente apos pagamento.
9. Sequencia WhatsApp com 6 mensagens do funil.
10. CTA personalizada pos-quiz sem trial/sorteio.
11. IA no grupo WhatsApp com fallback.
12. Audio diario + imagem diaria no grupo, inicialmente com geracao interna ou fluxo semi-manual.

## Escopo Growth

1. Modulo SaaS de automacao de posts.
2. Geracao de carrossel de 4-5 imagens a partir de video, link, noticia ou briefing.
3. Aprovacao no admin antes de publicar.
4. Publicacao/schedule para Instagram, TikTok, Facebook e YouTube quando credenciais e aprovacoes oficiais permitirem.
5. Pipeline de shorts/reels a partir de video enviado.
6. Historico de campanhas, templates, fontes e desempenho.
7. Integracao NotebookLM/Google Podcast API se o projeto tiver acesso oficial.

## Fora de Escopo

- Sorteios.
- Free trial.
- Premium temporario como premio.
- Pagamento Pix de premio.
- App mobile nativo.
- Multiclubes.
- Automacao por scraping/browser em redes sociais sem aprovacao explicita.

## Requisitos Funcionais

### Cadastro e Identidade

- FR01: O usuario acessa `/cadastro-free` por link do WhatsApp.
- FR02: O formulario coleta telefone/WhatsApp, nome completo, CPF e aceite de termos.
- FR03: O sistema valida telefone BR, nome, CPF matematico e aceite.
- FR04: O CPF e armazenado exclusivamente como hash.
- FR05: O sistema impede cadastro duplicado por telefone ou CPF hash.
- FR06: Ao cadastrar, o usuario recebe confirmacao por WhatsApp quando houver numero valido.
- FR07: O usuario free pode acessar app com permissoes limitadas.

### Quiz

- FR08: Admin cria quiz mensal free com janela de abertura.
- FR09: Quiz free exibe 10 perguntas por tentativa.
- FR10: Cada pergunta tem timer de 10 segundos.
- FR11: Usuario nao pode voltar para pergunta anterior.
- FR12: Resposta fora do prazo nao pontua.
- FR13: Tentativa e salva incrementalmente para reduzir perda de progresso.
- FR14: Usuario so pode completar uma tentativa por quiz free, salvo reset admin.
- FR15: Resultado aparece em ate 3 segundos apos conclusao.

### Ranking

- FR16: Ranking free calcula posicao do usuario.
- FR17: Free visualiza Top 10 e propria posicao.
- FR18: Ranking completo fica bloqueado para free.
- FR19: Premium visualiza ranking completo.
- FR20: Ranking deve diferenciar campanhas free/premium quando houver quizzes separados.

### Premium e Billing

- FR21: Usuario pode iniciar assinatura premium pelo app/CTA.
- FR22: Assinatura premium custa R$56,90/mes por padrao.
- FR23: Premium so ativa apos pagamento confirmado no Asaas.
- FR24: Webhook Asaas e idempotente.
- FR25: Cancelamento/inadimplencia atualiza estado premium conforme regra de ciclo.
- FR26: Magic link e gerado apos confirmacao de pagamento.
- FR27: Nao ha endpoint ou regra de trial gratis.
- FR28: Nao ha concessao premium por sorteio/premio.

### WhatsApp e IA

- FR29: Sistema envia 6 mensagens do funil.
- FR30: Mensagens incluem boas-vindas, explicacao, link de cadastro, confirmacao, lembrete e liberacao do quiz.
- FR31: IA responde no grupo quando acionada.
- FR32: IA usa busca externa para fatos recentes quando necessario.
- FR33: Em falha de busca/LLM, IA responde com fallback claro.
- FR34: Mensagens automaticas devem ter fila/retry quando Evolution API falhar.

### Conteudo Diario

- FR35: Sistema gera ou registra audio diario para o grupo.
- FR36: Sistema gera ou registra imagem/infografico diario para o grupo.
- FR37: Admin pode revisar conteudo antes de envio quando o modo aprovacao estiver ativo.
- FR38: Envio diario deve ser agendavel.

### Automacao de Posts

- FR39: Admin cria uma campanha/post a partir de video, link, noticia ou briefing.
- FR40: Sistema gera roteiro/copy do post.
- FR41: Sistema gera carrossel de 4-5 imagens no estilo Fiel.IA.
- FR42: Sistema permite edicao/aprovacao antes de publicar.
- FR43: Sistema armazena assets, prompts, fonte e status.
- FR44: Publicacao em Instagram/TikTok/Facebook/YouTube so ocorre por API oficial ou fluxo aprovado.
- FR45: Se API oficial nao estiver disponivel, sistema exporta pacote pronto para publicacao manual.

### Admin

- FR46: Admin gerencia usuarios, quizzes, conteudos e assinaturas.
- FR47: Admin visualiza cadastros free, assinantes premium e status de funil.
- FR48: Admin pode consultar logs operacionais sem dados sensiveis.
- FR49: Admin pode configurar templates de CTA.
- FR50: Admin pode reprocessar conteudo/filas com seguranca.

## Requisitos Nao Funcionais

- NFR01: Ranking final deve carregar em ate 3 segundos apos o quiz.
- NFR02: Timer server-side deve rejeitar respostas fora de prazo com tolerancia documentada.
- NFR03: IA no grupo deve responder em ate 15 segundos em condicoes normais.
- NFR04: Mensagens do funil devem ser enviadas em ate 30 segundos apos gatilho.
- NFR05: CPF, tokens, chaves e dados de pagamento nao aparecem em logs ou respostas publicas.
- NFR06: Webhook Asaas valida token em toda requisicao.
- NFR07: Sistema suporta 500 usuarios simultaneos no quiz sem degradacao acima de 20%.
- NFR08: Eventos Asaas nao podem ser descartados silenciosamente.
- NFR09: Falha de Evolution API coloca mensagens em fila.
- NFR10: Toda integracao externa usa variaveis de ambiente.
- NFR11: Toda automacao externa tem guia de reinstalacao/migracao.
- NFR12: Modulo de posts mantem audit trail de fonte, prompt, aprovador, horario e status.

## NotebookLM e Podcast

O objetivo do cliente e chegar no efeito de audio/imagem diaria semelhante ao NotebookLM. A implementacao deve seguir esta ordem de seguranca:

1. MVP: geracao interna com OpenRouter/TTS ou upload manual aprovado pelo admin.
2. Growth validado: Google Podcast API/NotebookLM Enterprise se a conta tiver acesso oficial.
3. Ponte local/proxy: apenas se aprovada por Diego, documentada e com fallback, porque pode quebrar por login, cookies, UI ou termos.

Achados oficiais em 2026-04-28:

- NotebookLM Enterprise permite criar notebooks e adicionar fontes via API.
- Audio Overview via API esta em Preview/Pre-GA e exige notebook com fontes.
- Podcast API gera MP3 a partir de contexto, mas esta em GA com allowlist para clientes selecionados do Google Cloud.

## Automacao de Posts - Direcao de Produto

Modulo proposto: `Content Studio`.

Fluxo:

1. Admin adiciona fonte: video YouTube, upload local, link de noticia, texto ou pauta.
2. Sistema extrai transcript/resumo e cria briefing.
3. Sistema gera copy, legenda, hashtags e roteiro visual.
4. Sistema gera carrossel 4-5 imagens.
5. Admin revisa slides/copy.
6. Admin aprova para publicacao ou exporta pacote.
7. Sistema publica/schedula quando houver API oficial habilitada.

Primeira entrega recomendada:

- Gerar carrossel e pacote exportavel.
- Nao depender de publicacao automatica em redes sociais na primeira slice.
- Usar o que ja existe: RAG/YouTube, noticias, podcast, admin e armazenamento local/banco.

## Riscos e Decisoes Pendentes

- Confirmar se a assinatura sera apenas cartao no Asaas ou tambem Pix recorrente/link de pagamento.
- Regra de expiracao de magic link resolvida: links expiram em 15 minutos e sao invalidados no primeiro uso.
- Confirmar se `cpfCnpj` atual deve ser migrado para `cpfHash` sem manter texto puro.
- Confirmar dominio final dos links: `fielchat.com`, `fiel.ia` ou outro.
- Confirmar se grupo WhatsApp permite IA respondendo todos ou apenas mencoes/comandos.
- Confirmar acesso a Google Podcast API/NotebookLM Enterprise antes de prometer integracao automatica.
- Confirmar credenciais oficiais e escopos para Meta/TikTok/YouTube antes da publicacao automatica.

## Proxima Sequencia BMAD

1. `bmad-create-architecture` para registrar decisoes tecnicas da v2.
2. `bmad-create-epics-and-stories` para quebrar MVP e Content Studio.
3. `bmad-check-implementation-readiness` depois de arquitetura/epicos.
4. `bmad-create-story` para primeira story: cadastro free + CPF hash + gating basico.
