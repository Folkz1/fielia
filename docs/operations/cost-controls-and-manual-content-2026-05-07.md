# Fiel.IA - Controle de custos e envio manual de conteudo

Data: 2026-05-07
Status: importante / operacional

## Resumo executivo

O Fiel.IA ainda esta sem clientes ativos, entao os custos recorrentes de IA foram pausados em producao. A chave OpenRouter continua configurada para uso sob demanda, mas as rotinas automaticas que poderiam gastar creditos sem usuario ativo foram desligadas.

Credito OpenRouter consultado em 2026-05-07 via endpoint oficial `GET /api/v1/credits`:

- total comprado: US$ 41.50
- total usado: US$ 34.4663
- saldo aproximado: US$ 7.0337

Observacao: esse saldo e da chave configurada no servico de producao. Se a mesma chave for reutilizada fora do Fiel.IA, o numero nao representa custo exclusivo do projeto.

## O que foi desligado em producao

Servico EasyPanel: `scrapers/fielia`

Variaveis ajustadas:

- `CRON_ENABLED=false`
- `WHATSAPP_FUNNEL_ENABLED=false`
- `NEWS_CURATION_USE_AI=false`
- `NEWS_REWRITE_ENABLED=false`
- `BLOG_AUTO_GENERATE=false`

Redeploy disparado apos a alteracao de env.

## Automacoes que estavam rodando ou prontas para rodar

Com `CRON_ENABLED=true`, o scheduler interno agenda:

- sync de noticias do FreshRSS a cada 6 horas;
- curadoria diaria das noticias com IA;
- geracao diaria de podcast;
- envio diario de newsletter;
- geracao semanal de quiz;
- processamento da fila WhatsApp do funil, quando `WHATSAPP_FUNNEL_ENABLED=true`.

Riscos de custo antes da pausa:

- sync de noticias reescrevia noticias com OpenRouter quando havia fonte suficiente;
- curadoria diaria podia chamar OpenRouter para escolher e reescrever noticias;
- podcast diario usa IA/voz para roteiro e audio;
- quiz semanal usa IA para gerar perguntas;
- blog automatico podia gerar posts a partir de noticias novas.

## O que continua funcionando sob demanda

Sem custo recorrente automatico:

- login/cadastro;
- quiz e ranking ja existentes;
- noticias ja salvas;
- pagamentos/checkout;
- webhook Asaas;
- bot WhatsApp em modo grupo, quando provocado;
- admin, desde que as acoes com IA sejam acionadas manualmente.

Ainda pode gastar OpenRouter se alguem acionar manualmente:

- chat IA do app;
- resposta livre do bot no grupo via gatilho `fielia` ou `/ia`;
- geracao de imagem/meme;
- geracao manual de post/podcast;
- ingestao RAG/embeddings.

## Combinado no grupo Fiel.IA

Pontos extraidos da conversa do Orquestra:

- Em 2026-04-28 o cliente pediu: "No WhatsApp quero enviar nesse formato irmao as News (imagem e audio)."
- Em 2026-04-30 foi explicado no grupo que o NotebookLM ainda nao permite automatizar upload de fontes de forma confiavel via API/MCP.
- Em 2026-05-01 foi alinhado que o cliente pode enviar o conteudo para o bot; o bot recebe e envia no grupo e para os premium no privado.
- A alternativa mencionada foi criar um form para upload manual.
- O futuro desejado e automatizar com noticias da semana, geracao de imagem e audio, possivelmente usando ElevenLabs/Google/NotebookLM quando o custo fizer sentido.
- O NotebookLM deve ficar como ferramenta de producao/manual por enquanto, nao como dependencia automatica critica do produto.

## Decisao operacional recomendada

Primeira versao sem custo recorrente:

1. Admin ou cliente envia imagem, audio e legenda por formulario web ou WhatsApp.
2. Fiel.IA salva o pacote como conteudo manual.
3. Admin revisa antes de publicar.
4. Bot envia no grupo Fiel.IA.
5. Bot envia no privado apenas para usuarios premium quando essa base estiver ativa.

Isso entrega o formato pedido pelo cliente sem depender de NotebookLM automatizado e sem reativar crons de IA.

## Implementado nesta sessao

Primeiro corte web/admin:

- rota admin `POST /api/admin/manual-content`;
- tela `/admin/envio-manual`;
- upload de imagem salvo como `Meme` com `prompt=manual-content-upload`;
- upload de audio salvo como `Podcast` com `ttsModel=manual-upload`;
- opcao manual de enviar no grupo Fiel.IA;
- opcao manual de enviar para usuarios premium ativos;
- listagem dos ultimos audios/imagens manuais.
- envio de imagem pela Evolution v2 usando `media`;
- envio de audio pela Evolution v2 usando `sendWhatsAppAudio`.
- URLs publicas de midia usam `FRONTEND_URL`/`NEXTAUTH_URL` ou headers de proxy, evitando `0.0.0.0` em producao.

Essa versao nao cria custo OpenRouter. Ela apenas recebe arquivos prontos, salva e envia via Evolution quando o admin marca a opcao.

Validacao local:

- `npx tsc --noEmit`
- `npx eslint "app\api\admin\manual-content\route.ts" "app\api\admin\scheduler\route.ts" "app\(admin)\admin\envio-manual\page.tsx" "app\(admin)\admin\layout.tsx" "lib\evolution-api.ts" "lib\news\sync.ts"`

## Validacao em producao

Validado em 2026-05-07:

- GitHub Actions passou com sucesso para a imagem publicada em `main`.
- EasyPanel aceitou deploy via webhook.
- `GET https://fielchat.com/admin/envio-manual` retornou 200.
- `GET https://fielchat.com/api/admin/manual-content` sem login retornou 401, como esperado.
- Login admin temporario funcionou e acessou `/admin/envio-manual`.
- Upload manual sem envio salvou imagem e audio.
- URLs publicas criadas:
  - imagem retornou 200 com `image/jpeg`;
  - audio retornou 200 com `audio/wav`.
- Envio pelo endpoint admin para o grupo Fiel.IA retornou:
  - imagem `ok: true`;
  - audio `ok: true`;
  - target `120363422991914861@g.us`.
- Conta admin temporaria usada no teste foi removida.
- Registros de podcast manual de teste foram removidos do banco apos a validacao.
- Freios de custo confirmados no EasyPanel apos o deploy:
  - `CRON_ENABLED=false`;
  - `WHATSAPP_FUNNEL_ENABLED=false`;
  - `NEWS_CURATION_USE_AI=false`;
  - `NEWS_REWRITE_ENABLED=false`;
  - `BLOG_AUTO_GENERATE=false`;
  - `FRONTEND_URL=https://fielchat.com`.

## Reativacao segura quando houver cliente ativo

Antes de religar:

- confirmar saldo OpenRouter;
- definir teto diario de gasto;
- validar se a Evolution correta esta conectada;
- decidir se o funil WhatsApp deve enviar privado automaticamente;
- testar um pacote manual de imagem + audio no grupo;
- reativar apenas o necessario, preferencialmente nesta ordem:
  1. `WHATSAPP_FUNNEL_ENABLED=true`, se o funil privado estiver pronto;
  2. `CRON_ENABLED=true`, se as rotinas realmente forem necessarias;
  3. `NEWS_CURATION_USE_AI=true`, se a curadoria por IA estiver aprovada;
  4. `NEWS_REWRITE_ENABLED=true`, se o custo de reescrita de noticias for aceito;
  5. `BLOG_AUTO_GENERATE=true`, se o blog automatico for parte da operacao.

## Mensagem pronta para o grupo, se Diego decidir enviar

Pessoal, fiz uma pausa tecnica nos custos automaticos do Fiel.IA porque ainda estamos sem base ativa de usuarios. A plataforma continua funcionando, mas deixei desligadas as rotinas que poderiam consumir credito de IA sozinhas: curadoria automatica, reescrita de noticias, podcast diario, quiz semanal automatico, newsletter e funil WhatsApp recorrente.

Sobre o audio + imagem no estilo Panorama Alvinegro: o NotebookLM ficou muito bom para produzir, mas hoje ele ainda nao nos da uma automacao confiavel para subir fontes e gerar tudo via API. Entao o caminho mais seguro agora e simples: voces mandam o audio/imagem/legenda pelo WhatsApp ou por uma pagina de upload, o Fiel.IA recebe, salva, e o bot envia no grupo e depois no privado dos premium quando a base estiver ativa.

Assim a gente entrega o formato que voce quer sem deixar custo rodando sozinho. Depois, quando fizer sentido, evoluimos para automatizar a criacao com ElevenLabs/geracao de imagem/NotebookLM ou outro fluxo de voz.
