# Viabilidade: Monitor de Odds + Monitor de Proxy — Fiel.IA

**Data:** 2026-06-05
**Pedido (Diego):** (1) monitorar de graça o uso do proxy residencial; (2) criar um "monitor das odds" e dar pra IA passar proativamente nos jogos do Timão.
**Decisões do Diego:** odds via scraping primeiro, fallback p/ API pronta grátis; IA comenta odds **proativamente** nos jogos do Corinthians.
**Pendente do Diego:** quem é "ele" e qual foi a ideia original do monitor de odds (pode apontar uma fonte específica e mudar o plano).

---

## Parte 1 — Monitor do proxy residencial (Webshare)

**Viável e barato. Não precisa de ferramenta open source de terceiro.** A própria Webshare expõe API de estatísticas:

- `GET /api/v2/stats/` — por hora: banda, requests totais/sucesso/falha, países, concorrência.
- `GET /api/v2/stats/aggregate/` — acumulado num intervalo (quota consumida no mês).
- Rate limit folgado (240 req/min).

**Dependência:** essas chamadas usam um **API token da conta** (`Authorization: Token …`), que **não existe hoje** no projeto. O código só tem credenciais de *proxy* (`WEBSHARE_PROXY_HOST/USER/PASS/PORT`, em `.env`, usadas por [lib/proxy.ts](../../lib/proxy.ts) e [lib/youtube/transcript.ts](../../lib/youtube/transcript.ts)). É preciso **gerar um API token** na dashboard Webshare (Profile → API Keys) e adicionar como `WEBSHARE_API_KEY`.

**Entrega proposta:** aba em `/admin` que consome `/stats/aggregate/` → banda usada vs. quota, % consumido, taxa de sucesso. ~meio dia. Independente do tema de odds.

---

## Parte 2 — Monitor de odds

### Fonte testada: oddspedia (API interna JSON)

Estrutura é excelente para o produto:
- `GET /api/v1/getMatchList` → jogos: `id`, `md` (data), `ht`/`at` (mandante/visitante), `league_id`.
- `GET /api/v1/getMaxOddsWithPagination` → odds por `matchId`: `{ odd_name: Casa|x|Fora, value, bookie, link, slug }`.
- Cruzando os dois: "Corinthians x Adversário, dd/mm, melhor odd Casa/Empate/Fora + casa que paga".
- Casas BR vistas na amostra (1 página): **bet365, Sportingbet, Betsson, Stake**. ⚠️ **Betano (maior casa do BR, patrocinadora do Brasileirão) NÃO apareceu** — cobertura completa não confirmada (varredura bloqueada, ver abaixo).
- `geoCode=BR&bookmakerGeoCode=BR` retorna casas brasileiras (não cotações internacionais).

### Bloqueio medido (Cloudflare) — testado a fundo

| Transporte | HTTP | Resultado |
|---|---|---|
| `fetch` IP residencial local + UA de browser | 200 | ✅ JSON |
| `fetch` **sem** UA de browser | — | ❌ challenge |
| `fetch` via proxy Webshare **rotativo** + UA | 403 | ❌ `"Just a moment..."` |
| `fetch` via proxy Webshare **sticky, 12 IPs distintos** (método idêntico ao YouTube, UA Chrome 131) | 403 | ❌ **0/12 passaram** (IPs residenciais BR reais confirmados: 179.105.x, 138.117.x, 177.128.x) |

**Por que o YouTube funciona e isto não, com o mesmo proxy:** são bloqueios diferentes. YouTube barra por **IP de datacenter** (residencial resolve). Cloudflare faz **bot-detection por JS challenge** + mantém feeds dos ranges de **proxies residenciais comerciais** (Webshare incluso). O IP é residencial, mas é um proxy *vendido* — o Cloudflare sabe e exige JS. IP residencial de usuário real (PC do Diego) passa.

**Fontes alternativas testadas pelo mesmo proxy (buscando uma sem Cloudflare):**
- SofaScore API → HTTP 403 (bot-detection própria)
- betexplorer / Academia das Apostas → `fetch failed` (proxy rejeitado no transporte)

**Conclusão definitiva:** scraping *leve* (`fetch` + proxy) **não é viável para odds**, em nenhuma das fontes testadas. Sites de odds são domínio adversarial (anti-bot pesado). NÃO retentar essa abordagem.
POCs reproduzíveis: `tmp/test-odds-proxy.mjs` (12 IPs sticky), `tmp/test-odds-sources.mjs` (fontes alt).

### Opções reais (todas grátis ou quase)

| # | Caminho | Custo/infra | Casas BR | Risco |
|---|---|---|---|---|
| A | **API-Football** (api-sports.io) free 100 req/dia | signup grátis (Diego gera key) | a confirmar (pode não ter Betano) | baixo; dado estruturado e legítimo |
| B | **The Odds API** free ~500 req/mês | signup grátis | ❌ só us/uk/eu/au (internacionais) | baixo, mas casas erradas pro torcedor |
| C | **Browser headless** (Playwright + Chromium no container) raspando oddspedia | ~300MB+ RAM, mais lento, manutenção de selectors | ✅ reais (bet365, Sportingbet…) | ToS do oddspedia (ver abaixo) + Cloudflare pode endurecer |
| D | **Unblocker pago** (Webshare/Bright Data Web Unlocker) | $ recorrente | ✅ | custo; some o "grátis" |

### Rejeitados

- **OpenRouter web search** (já existe em `fetchJogosWebSearch`, [lib/chat/live-data.ts](../../lib/chat/live-data.ts)): zero infra, mas LLM **pode alucinar valores numéricos de odds** — inaceitável pra dado de aposta. Não usar como fonte primária de cotações.
- **Scraping direto de casas** (Betano/bet365.bet.br): anti-bot pesado + odds via API com tokens. Mais frágil que agregador.

### Riscos a decidir (Diego é advogado)

- **ToS do oddspedia:** é agregador comercial; o `link` no payload é **link de afiliado deles** (`mediaserver.entainpartners.com`). Raspar a API interna e exibir as mesmas odds **sem** o link deles compete com o modelo de receita deles. Risco some se o caminho final for **afiliação direta** com casa licenciada.
- **Promoção de apostas:** Lei 14.790/2023 (casas precisam de licença SIGAP), jogo responsável, público +18. "Passar odds proativamente" tende a "produto de aposta". Oportunidade: afiliação como receita.

### Restrição de calendário

Brasileirão **pausado até ~22/07/2026** (Copa do Mundo). Dá pra construir a infra agora, mas só dá pra **validar com odds reais do Corinthians a partir do jogo vs. Remo (22/07)**.

---

## Recomendação

1. **Monitor de proxy:** seguir já (depende só do `WEBSHARE_API_KEY` que o Diego precisa gerar).
2. **Odds:** descartar o scraping leve (medido como inviável). Antes de implementar, **desbloquear o contexto do "ele"** (pode já haver fonte definida). Default técnico recomendado: começar pela **Opção A (API-Football)** por ser grátis, estruturada e sem ToS cinza — confirmando cobertura de odds do Brasileirão e presença de casas BR. Se a cobertura de casas BR for insuficiente, escalar para **Opção C (browser headless)** assumindo o custo de infra + risco de ToS.
3. **Integração IA:** reusar o padrão de [lib/chat/live-data.ts](../../lib/chat/live-data.ts) (injeção de contexto + cache), proativo nos jogos do Timão. Independente da fonte escolhida.

---

## ATUALIZAÇÃO — testes de implementação (browser headless + fonte alternativa)

**Browser headless do oddspedia: TESTADO e INVIÁVEL em produção.**
- Stealth básico (`navigator.webdriver=undefined` + `--disable-blink-features=AutomationControlled`) passa o Cloudflare nos endpoints de **metadados** (getLeagues/getBookmakers/getCategories → 200).
- Mas o endpoint de **odds** (`getMaxOddsWithPagination`) dá **403 mesmo na chamada natural da app**, em headless **e** headful (chromium do Playwright). Só funciona no Playwright **MCP** (Chrome real persistente) ou em IP residencial limpo — nenhum é o ambiente de produção.
- Veredito: exigiria Chrome real headful + xvfb (pesado no Alpine) ou unblocker pago. Descartado. POCs: `tmp/test-odds-*.mjs`.

**✅ FONTE VENCEDORA — Academia das Apostas (`academiadasapostas.com`, SEM o `.br`):**
- nginx **sem Cloudflare**. Odds renderizadas no **HTML server-side** (não JS).
- **Funciona via `fetch` + proxy Webshare** (mesmo transporte leve do YouTube/notícias) — testado: HTML idêntico via browser e via proxy, status 200. POC: `tmp/test-academia-proxy.mjs`.
- **Odds 1x2 pre-match reais e parseáveis** (parser estruturado, confirmado — não regex genérico): ex. jogo de 06/06 → **Casa 2.35 / Empate 2.75 / Fora 3.5 @ bet365**. Markup: `<div class="bookmaker-odds"> <div class="odd"> <a href="/redirect/<casa>/...">VALOR</a> <p>MERCADO</p>`. Casa identificável pelo slug do redirect; mercado pelo `<p>`.
- **Não precisa de Chromium no container.** Reusa `getProxyDispatcher()` de [lib/proxy.ts](../../lib/proxy.ts) e o padrão de [lib/news/scrape.ts](../../lib/news/scrape.ts).
- Estrutura: competição em `/stats/competition/brasil/<id>`; odds na página de jogo `/stats/match/.../preview`.
- **Ressalvas (honestas):** a página de preview destaca **1 casa por jogo** (bet365 no exemplo) — comparar Betano vs bet365 exigiria outra aba/página (a confirmar). Série A em pausa até 22/07: estrutura é a mesma da Série B testada, mas validar com jogo real do Corinthians quando voltar. ToS: Academia vive de afiliação de casa de aposta, mesmo nível de cinza do oddspedia — decisão do Diego (advogado), não suavizar.

**Recomendação revisada:** implementar scraping **leve** (fetch+proxy, sem browser) da Academia das Apostas. Riscos: parser de HTML é mais frágil que API (mitigar com seletor direcionado + fallback); ainda há ToS de agregador (mesmo nível de cinza do oddspedia — decisão do Diego). Cobertura do Brasileirão Série A confirmada na listagem; validar odds de jogo do Corinthians quando a Série A voltar (22/07).

---

## ESCOPO CLARIFICADO (Diego, 05/06) — feature é "best odds", prioridade v2

O pedido real (do "ele" + Diego): **comparação de odds entre casas** — pro jogo do Corinthians, mostrar **em qual casa a odd está melhor** pra orientar o torcedor (estilo sites de "best odds / value bet"). **Atualização diária.** Diego há um **site específico** que faz isso (nome a confirmar). **Prioridade: v2** ("mais pra frente", ~2 meses, num compilado de atualizações — NÃO urgente).

**Implicação na fonte (medido):** "melhor odd" exige **múltiplas casas com odd estruturada por mercado**. Teste na aba `/odds` da Academia (HTML cru via fetch): **bet365 domina (221 menções, 76 odds estruturadas)**; betano (5) e betfair (12) aparecem só esparsos — **insuficiente para ranking multi-casa**. A comparação completa provavelmente é JS-rendered (exigiria browser, que descartamos).

**Caminho recomendado p/ a feature de comparação (v2):**
1. **API de odds** (The Odds API / API-Football / OddsAPI) — retornam *array de bookmakers por mercado* → calcular best odd é trivial; legítimo; atualização diária trivial com [lib/scheduler.ts](../../lib/scheduler.ts). É o caminho sólido.
2. **OU** o "site específico" que o Diego viu — avaliar quando ele lembrar o nome.
3. Scraping leve da Academia serve para **"a odd do Timão" (1 casa, bet365)** — possível MVP simples, mas NÃO entrega o ranking multi-casa que é o objetivo.

**Pendências:** (a) nome do site de comparação que o Diego mencionou; (b) decisão de ToS/promoção de aposta (Diego); (c) v2 — não implementar agora.
