# Fiel.IA v2 - Finalization Status

Data: 2026-04-30
Projeto: D:\projetos\fiel-ia
Producao: https://fielchat.com

## Estado BMAD

- PRD: completo em `_bmad-output/planning-artifacts/prd.md`.
- Architecture: iniciado em `_bmad-output/planning-artifacts/architecture.md`.
- BMad Help recomendou como proximos passos formais:
  - `[CE] Create Epics and Stories` para transformar pendencias em historias.
  - `[SP] Sprint Planning` para ordenar execucao.
  - `[TR] Technical Research` para NotebookLM/audio/imagem, porque ainda ha decisao tecnica aberta.
- Technical Research NotebookLM/conteudo diario salvo em `notebooklm-content-automation-research.md`.

## Validado em Producao

- Cadastro free cria usuario com email real, telefone e CPF hash.
- Magic link autentica usuario e leva para criar senha.
- Login posterior fica por email e senha.
- CPF nao e exibido; a UI mostra que existe CPF cadastrado por seguranca.
- Quiz free esta acessivel por login.
- Ranking free limita visibilidade a Top 10 + posicao propria.
- Noticias estao sincronizadas, reescritas por IA e com imagens.
- Blog posts gerados a partir de noticias existem em producao.
- Podcast existe no banco.
- Bot no grupo responde gatilhos como menu, quiz e ranking.
- WhatsApp funnel privado foi ativado:
  - `WHATSAPP_FUNNEL_ENABLED=true`
  - `CRON_WHATSAPP_FUNNEL_SCHEDULE=* * * * *`
- Erro de numero sem DDI foi corrigido no cliente Evolution.
- Fila do cadastro do Diego enviou `welcome`, `why_register` e `quiz_open`.
- Gating de quiz foi reforcado:
  - Usuario free recebe apenas historico/quiz free na API e dashboard.
  - Usuario premium ve premium quando existir e cai para free se nao houver premium ativo.
  - Bot WhatsApp nao inicia quiz premium para usuario free.
  - Finalizacao de quiz via bot tambem agenda CTA pos-quiz para usuario free.

## Decisoes Atuais

- Sem sorteio.
- Sem free trial.
- Premium paga desde o inicio.
- Grupo WhatsApp e canal de aquisicao/engajamento.
- Mensagens pessoais de funil e CTA pos-quiz devem ir no privado.
- Link do quiz pode ir no privado, mas o quiz so abre de fato apos login/sessao.
- Content Studio fica fora desta etapa.

## Em Aberto Para Fechar MVP

1. Garantir CTA pos-quiz com templates por faixa de score, sem trial/desconto automatico.
2. Validar quiz ponta a ponta com usuario real: iniciar, responder, resultado, ranking, fila `post_quiz_cta`.
3. Validar checkout Asaas ponta a ponta: assinatura, pagamento, webhook, usuario premium.
4. Validar bot do grupo com o numero oficial Fiel.IA quando conectado.
5. Definir regra final da IA no grupo:
   - Grupo free pode perguntar livremente, como PRD pede; ou
   - IA livre vira premium e o grupo responde apenas comandos/CTA.
6. Implementar rotina diaria de conteudo no grupo:
   - Noticias curadas.
   - Audio curto.
   - Imagem/infografico.
7. Implementar a primeira story de conteudo diario do grupo usando `notebooklm-content-automation-research.md`:
   - MVP proprio com noticias curadas + podcast/TTS existente + imagem/infografico proprio.
   - NotebookLM/Podcast API oficial apenas se houver acesso Google Cloud habilitado.
   - Automacao local/browser somente como experimento documentado e com fallback.
8. Criar documentacao de reinstalacao/migracao para qualquer ponte local, proxy, NotebookLM ou rotina externa.

## Riscos

- Funil privado depende da instancia Evolution conectada e do numero correto.
- A instancia atual de teste usa numero pessoal; trocar para numero oficial exige revalidar webhook e envio.
- NotebookLM sem API consumer oficial pode quebrar se usado via automacao local.
- PRD legado ainda contem referencias antigas a sorteio/trial; usar referencia sanitizada como fonte de verdade.

## Proxima Execucao Recomendada

1. Rodar `[CE] bmad-create-epics-and-stories` com base neste status e no PRD atualizado.
2. Implementar as historias MVP restantes em ordem:
   - gating free/premium do quiz bank;
   - CTA pos-quiz por desempenho sem trial;
   - validacao Asaas real;
   - grupo IA + conteudo diario;
   - pesquisa NotebookLM e arquitetura da rotina de conteudo.
3. Rodar `[QA] bmad-qa-generate-e2e-tests` para cadastro, quiz, ranking e assinatura.
