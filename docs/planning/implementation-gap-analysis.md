# Implementation Gap Analysis - Fiel.IA v2

Data: 2026-04-28

## Contexto

Analise do repositorio atual contra o PRD reconciliado. Este arquivo e operacional; nao substitui o PRD nem a arquitetura BMAD.

## Ja Existe

### Billing / Premium

- `app/api/subscription/route.ts`
  - cria assinatura Asaas por cartao;
  - usa valor default R$56,90;
  - impede nova assinatura se premium ativo;
  - salva `asaasCustomerId`, `asaasSubscriptionId`, pagamentos locais.
- `app/api/webhooks/asaas/route.ts`
  - valida token quando configurado;
  - salva evento idempotente;
  - ativa premium apos pagamento confirmado;
  - envia magic link por email/WhatsApp.
- `lib/billing.ts`
  - centraliza estados de billing e premium ativo.

### Quiz / Ranking

- `prisma/schema.prisma`
  - modelos `Quiz`, `QuizQuestion`, `QuizAttempt`, `QuizAnswer`.
- `app/api/quiz/route.ts`
  - lista quiz ativo e cria quiz.
- `app/api/quiz/submit/route.ts`
  - salva tentativa e respostas.
- `app/api/ranking/route.ts`
  - ranking por `totalPoints`.
- `app/(dashboard)/dashboard/quiz/*`
  - UI do quiz ja existe.

### Conteudo / IA / WhatsApp

- `lib/evolution-api.ts`
  - envio via Evolution API.
- `lib/bot/router.ts`
  - roteamento do bot WhatsApp.
- `app/api/webhooks/whatsapp/route.ts`
  - webhook WhatsApp.
- `lib/news/*`
  - sync, curadoria, enriquecimento e newsletter.
- `app/api/admin/youtube/route.ts`
  - ingestao de YouTube para RAG.
- `app/api/admin/podcast/route.ts`
  - geracao/lista de podcast.
- `lib/podcast/generate.ts`
  - roteiro + TTS.

### Admin

- Admin ja tem rotas/paginas para assinaturas, usuarios, noticias, podcast, RAG, quiz, sistema e divulgacao.

## Gaps Criticos Para MVP

### Cadastro Free

Falta:

- rota `/cadastro-free`;
- endpoint de cadastro free;
- validacao de CPF;
- hash de CPF;
- aceite de termos;
- dedupe por telefone/CPF hash;
- redirecionamento para quiz aberto ou confirmacao.

Risco atual:

- `User.cpfCnpj` pode conter CPF em texto puro. O PRD reconciliado exige hash exclusivo.

### Modelo de Usuario

Falta decidir:

- migrar `cpfCnpj` para `cpfHash`;
- manter `email` obrigatorio ou permitir usuario free sem email;
- como gerar login/magic link para free;
- campos para `termsAcceptedAt`, `source`, `funnelStage`, `freeRegisteredAt`.

### Premium Gating

Existe:

- `isPremium` + `subscriptionEnd`;
- helper em `lib/billing.ts`.

Falta:

- helper unico exportado para UI/API;
- bloquear backend, nao apenas esconder tela;
- remover textos de sorteio/trial do bot e UI;
- revisar mensagens premiumRequired em `lib/bot/router.ts`.

### Quiz Mensal Free

Falta:

- diferenciar quiz free vs premium;
- janela mensal dia 15;
- uma tentativa por usuario/quiz;
- validacao server-side real do timer;
- progresso incremental;
- ranking por quiz/campanha, nao so `User.totalPoints`.

### WhatsApp Funnel

Falta:

- entidade/estado de funil;
- 6 mensagens automatizadas;
- agendamento/lembretes;
- fila/retry de mensagens;
- CTA pos-quiz 2-4h sem trial/sorteio.

### WhatsApp Group Agent

Existe:

- webhook WhatsApp com suporte a grupo allowlisted;
- escopo `WHATSAPP_BOT_SCOPE=group` para ignorar DMs;
- modo `WHATSAPP_GROUP_REPLY_MODE=mention` para responder so a gatilhos explicitos;
- historico de conversa com plataforma `whatsapp_group`;
- modo `WHATSAPP_WEBHOOK_DRY_RUN=true` para smoke sem envio real.

Status:

- GuyFolkz Evolution validado como `open`.
- Grupo Fiel.IA configurado em `FIELIA_WHATSAPP_GROUP_ID` e `WHATSAPP_ALLOWED_GROUP_IDS`.
- Smoke local retornou `processed_group` sem envio real.
- Smoke live simulou inbound `fielia menu` e enviou o menu real no grupo Fiel.IA via GuyFolkz.
- Usuarios fake do smoke foram apagados do banco de producao.
- Relay seletivo preparado em `D:\projetos\orquestra` para encaminhar apenas mensagens inbound do grupo allowlisted ao Fiel.IA, mantendo a Orquestra como webhook principal.
- Diego autorizou usar a instancia Evolution pessoal para o Fiel.IA.
- `.env.local` agora usa `diego pessoal` para envio local e registra o sender JID pessoal.
- Instancia pessoal esta `open`, enxerga o grupo Fiel.IA, e enviou o menu real no grupo em smoke controlado.
- Opcoes soltas do menu (`1`, `2`, `4`) foram liberadas no filtro de grupo; dry-run da opcao `4` retornou `processed_group`.

Falta:

- publicar o webhook novo em producao;
- configurar producao Fiel.IA com escopo `group`, grupo allowlisted e credenciais da instancia pessoal;
- decidir se a instancia pessoal sai da Orquestra e aponta direto para Fiel.IA, ou se tambem usa relay seletivo;
- validar inbound real com um membro do grupo enviando `fielia menu`.

### Content Studio

Status:

- Pausado por Diego nesta sessao; tratar depois do fechamento do agente WhatsApp.

Falta:

- entidades para fontes, drafts, assets, aprovacoes e publicacao/exportacao;
- UI admin dedicada;
- gerador de carrossel 4-5 imagens;
- export package;
- conectores oficiais de publicacao em fase posterior.

## Primeira Slice Recomendada

### Story 1 - Cadastro Free seguro - implementada em 2026-04-28

Escopo:

- criar `/cadastro-free`;
- criar API de cadastro;
- validar CPF/telefone/nome/termos;
- armazenar `cpfHash`;
- criar ou atualizar usuario free;
- mostrar estado de quiz aberto/fechado.

Arquivos provaveis:

- `prisma/schema.prisma`
- `lib/cpf.ts`
- `lib/premium.ts`
- `app/cadastro-free/page.tsx`
- `app/api/cadastro-free/route.ts`
- testes unitarios para CPF/hash/dedupe
- teste Playwright do cadastro

Bloqueio:

- resolvido: `.env` confirmado em producao e migration aplicada com aprovacao de Diego.

### Story 2 - Remover trial/sorteio do produto visivel - implementada em 2026-04-28

Escopo:

- revisar textos do bot;
- revisar CTAs premium;
- revisar admin se existir concessao/trial;
- ajustar PRD/fixtures se houver.

Status:

- textos ativos de landing, dashboard, ranking, bot, termos e OpenGraph revisados.
- documentos canonicos atualizados para refletir 15 minutos no magic link e ausencia de trial/sorteio.

### Story 3 - Premium gating central - implementada em 2026-04-28

Escopo:

- criar helper unico;
- aplicar em ranking completo, quiz premium, chat IA app e memes;
- garantir enforcement em API.

Status:

- `lib/premium.ts` virou helper central para premium/admin.
- `/api/chat`, `/api/memes`, `/api/memes/generate` e `/api/ranking` usam o helper.
- chat app e gerador de memes exigem Premium no backend; ranking completo e capado para free.

### Story 4 - Quiz free mensal - implementada em 2026-04-28

Escopo:

- diferenciar audiencia/tipo de quiz;
- validar timer no servidor;
- ranking por tentativa/quiz;
- resultado free com Top 10 e posicao propria.

Status:

- `Quiz` ganhou `audience` (`free`/`premium`) e `cadence` (`monthly`/`weekly`/`on_demand`).
- `/api/quiz` seleciona quiz por audiencia e bloqueia quiz premium para free.
- `/api/ranking?quizId=...` calcula ranking por tentativa/quiz e limita free ao Top 10.
- tela de resultado mostra Top 10 do quiz e posicao propria quando aplicavel.
- migration `20260428173500_add_quiz_audience_cadence` aplicada em producao.

### Story 5 - WhatsApp funnel - base implementada em 2026-04-28

Escopo:

- modelar etapas;
- templates das 6 mensagens;
- fila/retry;
- CTA pos-quiz paga.

Status:

- `WhatsAppFunnelMessage` criado para fila, tentativas, erro e auditoria.
- Templates das 6 mensagens criados em `lib/funnel/templates.ts`.
- Cadastro free enfileira mensagens iniciais; submit do quiz enfileira CTA pos-quiz em 2h.
- Processador com retry/backoff criado em `lib/funnel/queue.ts`.
- Envio real fica desligado por padrao e so roda com `WHATSAPP_FUNNEL_ENABLED=true`.
- Rota admin `/api/admin/funnel` criada para status/processamento manual.
- Smoke validou 3 mensagens pendentes e 0 enviadas; fila teste foi limpa.

### Story 6 - WhatsApp group agent - implementada localmente em 2026-04-28

Escopo:

- limitar bot ao grupo Fiel.IA;
- ignorar DMs e grupos fora da allowlist;
- responder apenas a gatilhos explicitos no grupo;
- validar envio real pelo GuyFolkz sem ativar funil em massa.

Status:

- `app/api/webhooks/whatsapp/route.ts` roteia grupo allowlisted e usa `whatsapp_group`.
- `.env.local` configurado para grupo unico em modo `mention`.
- `WHATSAPP_WEBHOOK_DRY_RUN=true` adicionado para smoke local seguro.
- Smoke local sem envio real passou.
- Smoke live enviou o menu do bot no grupo Fiel.IA via GuyFolkz.

Bloqueio:

- Falta deploy/publicacao do Fiel.IA; hoje os webhooks GuyFolkz e pessoal apontam para a Orquestra.

### Story 7 - Content Studio Draft/Export - pausada

Escopo:

- fonte -> briefing -> carrossel -> aprovacao -> export.
- sem auto-publicacao no primeiro corte.

## Validacao Necessaria

- Unit tests: CPF, hash, premium helper, timer.
- API smoke: cadastro free, quiz submit, ranking.
- Playwright: cadastro free e quiz free.
- Read-only DB check antes de qualquer migration.
- Codex review obrigatorio apos L1+ conforme skill `orquestrar`.
