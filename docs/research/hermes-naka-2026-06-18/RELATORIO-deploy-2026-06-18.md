# Relatório — Conversão Fiel.IA: Lotes 1, 2 e 3 em produção

**Sessão/deploys:** 2026-06-23 · **Ambiente:** produção (`fielchat.com`) · **Status:** ✅ no ar e validado
**Base:** análise de conversão (Naka, 12/06) + roadmap de produto (Naka, 18/06), extraídos do agente Hermes.

> **TL;DR:** os itens **P0/P1** (confiança/legal + primeira dobra) **e a instrumentação de funil** do roadmap do Naka estão no ar em produção, validados. Agora dá pra **medir** o funil — antes não havia nenhuma medição.

---

## 1. Lote 1 — Confiança & Legal (P0) ✅
| Achado do Naka | O que mudou |
|---|---|
| Checkout sem consentimento/termos | Checkbox **obrigatório** de Termos + Privacidade (links) + autorização WhatsApp/e-mail; submit travado sem aceite |
| CPF sem explicação | Microcopy: "só pra cobrança via Asaas; não guardamos cartão" |
| Claims absolutos ("verificado em tempo real", "sem fake news", "a IA sabe tudo") | → linguagem de classificação: **confirmado / rumor / não verificado** |
| Números fabricados (12.000+, 12.847, 48k, 4.2M, 15.000) | **Removidos** → selos qualitativos |

## 2. Lote 2 — Primeira dobra (P1) ✅
| Achado do Naka | O que mudou |
|---|---|
| H1 genérico | **"Pare de caçar notícia do Timão. Pergunte pra FIEL IA."** |
| 2 CTAs competindo | CTA primário = **Assinar**; grupo grátis vira secundário |
| Paga antes de ver o produto | **Chips de perguntas-exemplo** (demo) na hero |

## 3. Lote 3 — Instrumentação de funil (P0) ✅
- Tabela **`funnel_events`** criada em produção (migração **cirúrgica** — `CREATE TABLE` isolado).
- **`/api/track`**: endpoint que grava eventos (best-effort, **sem IP/User-Agent** por privacidade — respeitando o contrato do Naka).
- Eventos no front: `page_view`, `hero_cta_assinar`, `hero_cta_grupo`, `chip_click`, `checkout_view`, `checkout_submit`.
- Tracking **próprio** (anonId em localStorage + `sendBeacon`), sem ferramenta externa/terceiro.
- **Agora dá pra medir:** quantos veem a landing → quantos vão ao checkout → quantos convertem.

> ⚠️ Decisão técnica de segurança: **não** usei `prisma db push` (fluxo padrão), porque o banco tem **drift** — o push tentaria apagar a tabela `whatsapp_webhook_events` e o índice de busca vetorial. Apliquei só o `CREATE TABLE` da tabela nova, isolado, sem risco ao resto.

---

## 4. Validação em produção (objetiva)
- `fielchat.com/` e `/assinar` → **HTTP 200**.
- Textos novos no ar ✅ · claims e números antigos → **0 ocorrências** ✅.
- Checkout: consentimento + microcopy do CPF presentes ✅.
- `/api/track`: POST real → **204** e evento **gravado** na `funnel_events` (teste E2E feito e limpo) ✅.

## 5. Deploy técnico
- **Commits (main):** `c03a38e` (Lotes 1+2) · `ca1009b` (docs) · `ccc77c0` (relatório) · `2c5f29c` (Lote 3).
- **Imagem em produção:** `ghcr.io/folkz1/fielia:sha-2c5f29c`.
- **Fluxo:** push → CI (GitHub Actions) builda → EasyPanel `updateSourceImage` + webhook.
- **🔄 Rollback código (~30s):** apontar `scrapers/fielia` → `sha-51670b7` + webhook.
- **🔄 Rollback Lote 3:** `DROP TABLE funnel_events;` (aditiva, reversível, zero impacto no resto).

---

## 6. Para o Naka (dono do produto)

Henry — subi pra produção os **P0/P1** da sua análise (12/06) e do seu roadmap (18/06): checkout com consentimento + CPF explicado, claims de notícia em linguagem de status (confirmado/rumor/não verificado), números fabricados removidos, novo H1 e CTA priorizando assinatura. E já **instrumentei o funil** — a partir de agora cada etapa (landing → checkout → conversão) é medida.

**Decisões já tomadas (confirma ou ajusta):**
- CTA primário = Assinar (foco receita) — grupo grátis virou secundário.
- Removi o "12.000+" e contadores (sem dado comprovável). Se tiver o número real, me passa.
- Instrumentação = tracking próprio, sem ferramenta externa.
- **Checkout fica como está**: mantém o consentimento + o CPF no formulário; **sem** redesign "em etapas".

**Ainda preciso da sua decisão (4 pontos) pra fechar o roadmap:**
1. Capacidade operacional pra garantia / trial / preço de entrada?
2. WhatsApp já é funcional no premium ou ainda é promessa?
3. Promessa central do produto: notícia confiável, chat especialista ou comunidade gamificada — em que ordem?
4. Quais fontes a IA usa (ou deve usar) pra classificar notícia como confirmado/rumor/não verificado?

---

## 7. Próximo — Lote 4 (depende das 4 decisões acima)
Garantia/trial, sistema de classificação de notícias no produto core e fontes nas respostas da IA. Aguarda as respostas do Naka.

> O **checkout não entra no Lote 4** — decisão do Diego de mantê-lo como está (com o consentimento + CPF do Lote 1).

**Fontes (no repo):** `docs/research/hermes-naka-2026-06-18/` — transcripts das conversas, documentos do Naka (roadmap + análise) e a síntese com o mapa achado→código.
