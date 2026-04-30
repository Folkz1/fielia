# Fiel.IA - Technical Research: NotebookLM e Conteudo Diario

Data: 2026-04-30
Escopo: audio diario, imagem/infografico e envio no grupo WhatsApp.

## Decisao Recomendada

Para o MVP do Fiel.IA, nao depender do NotebookLM consumer nem de automacao por navegador.

Implementar primeiro uma rotina propria:

1. Sincronizar noticias via FreshRSS.
2. Curar as principais noticias do dia com IA.
3. Gerar texto curto do boletim com OpenRouter.
4. Gerar audio curto usando o pipeline existente de podcast/TTS.
5. Gerar imagem/infografico com pipeline proprio de imagem ou template server-side.
6. Salvar artefatos no banco/storage.
7. Enviar no grupo WhatsApp via Evolution API.
8. Registrar log operacional para retry e auditoria.

NotebookLM/Google Podcast API fica como caminho Growth se houver acesso oficial.

## Validacao Local Do MCP

Em 2026-04-30, o MCP `notebooklm-mcp` foi instalado no Codex e autenticado com Google.

- Servidor MCP: `notebooklm`
- Comando: `npx notebooklm-mcp@latest`
- Ferramentas expostas: `ask_question`, `add_notebook`, `list_notebooks`, `get_health`, `setup_auth`, entre outras.
- Health: `authenticated: true`
- Estado pendente: biblioteca sem notebook (`notebooks: []`), portanto `ask_question` ainda retorna `Notebook URL is required to create a session`.

Proximo passo: registrar o link compartilhado do notebook Fiel.IA no MCP.

## Achados Oficiais

- NotebookLM Enterprise tem API oficial para criar/listar/deletar notebooks, mas exige setup e licencas do NotebookLM Enterprise.
  Fonte: https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-notebooks
- NotebookLM Enterprise tem API oficial para adicionar fontes, incluindo texto, web, arquivos, Google Docs/Slides, audio, video e imagens.
  Fonte: https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-notebooks-sources
- Audio Overview via API existe, mas esta em Preview/Pre-GA e depende de um notebook com fontes.
  Fonte: https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-audio-overview
- Podcast API e uma API standalone que gera MP3 a partir de contexto, mas o acesso esta restrito a clientes Google Cloud selecionados.
  Fonte: https://docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/podcast-api

## O Que Ja Existe No Projeto

- `lib/news/sync.ts`: sincroniza noticias a partir do FreshRSS.
- `lib/news/curation.ts`: escolhe noticias top e pode melhorar itens ruins.
- `lib/podcast/daily.ts`: gera podcast diario a partir das noticias curadas.
- `lib/podcast/generate.ts`: gera roteiro e audio via OpenRouter/TTS e salva na tabela `podcasts`.
- `lib/news/newsletter.ts`: monta newsletter e envia para usuarios premium no privado.
- `lib/evolution-api.ts`: envia texto, midia, audio e sticker pela Evolution.
- `lib/bot/services/meme.service.ts`: ja tem exemplo de geracao de imagem via OpenRouter.
- `docs/operations/notebooklm-mcp-fielia.md`: guia operacional com estado do MCP e prompts do formato Panorama Alvinegro.

## Gap Atual

Ainda nao existe um orquestrador de conteudo diario para o grupo.

Faltam:

1. Modelo/registro de `DailyGroupContent` ou equivalente.
2. Geracao de imagem/infografico diario fora do fluxo de meme.
3. Envio de audio para grupo usando o podcast gerado.
4. Envio de imagem para grupo usando Evolution media.
5. Retry/idempotencia por data e grupo.
6. Modo aprovacao manual opcional no admin.
7. Documentacao de reinstalacao/migracao para credenciais, cron e storage.

## Slice Recomendada Para Implementar Depois Do MVP De Quiz/Funil

### Story 1 - Conteudo Diario Basico No Grupo

Given noticias curadas do dia existem
When a rotina diaria roda
Then o sistema envia uma mensagem textual com 3 manchetes no grupo Fiel.IA
And registra data, grupo, status e erro quando houver.

### Story 2 - Audio Diario No Grupo

Given existe podcast diario gerado
When a rotina de envio roda
Then o sistema envia o audio para o grupo via Evolution
And nao reenvia o mesmo podcast duas vezes no mesmo dia.

### Story 3 - Imagem/Infografico Diario

Given existem 3 noticias curadas
When a rotina de imagem roda
Then o sistema gera uma imagem/infografico com titulo, escudo/branding e manchetes
And envia a imagem no grupo apos aprovacao automatica ou manual.

### Story 4 - Admin e Reprocessamento

Given um envio diario falhou
When o admin acessa a fila
Then ele pode reenviar texto, audio ou imagem individualmente.

## Regra De Documentacao

Se qualquer rotina local/proxy/NotebookLM for usada, criar antes:

- `docs/operations/content-automation.md`
- variaveis de ambiente necessarias;
- como autenticar Google Cloud/NotebookLM;
- como trocar numero/instancia Evolution;
- como rodar localmente;
- como desligar com seguranca;
- plano de fallback para voltar ao pipeline proprio.
