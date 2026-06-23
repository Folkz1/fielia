# Relatório — Deploy dos Lotes 1+2 de conversão · Fiel.IA

**Data:** 2026-06-18 · **Ambiente:** produção (`fielchat.com`) · **Status:** ✅ no ar e validado

> **TL;DR:** os itens **P0 e P1** da análise de conversão e do roadmap que o Naka produziu no Hermes foram implementados e estão **no ar em produção**. Foco: confiança/legal + primeira dobra. Nada de banco/pagamento foi tocado.

---

## 1. O que foi pro ar

### Lote 1 — Confiança & Legal (P0)
| Achado do Naka | O que mudou | Onde |
|---|---|---|
| Checkout pede CPF/dados sem consentimento nem termos | **Checkbox de aceite obrigatório** de Termos + Privacidade (com links) + autorização de contato WhatsApp/e-mail; **submit travado** sem aceite | `/assinar` |
| CPF sem explicação | **Microcopy**: "usado apenas para a cobrança via Asaas; não guardamos dados do cartão" | `/assinar` |
| Claims absolutos ("verificado em tempo real", "sem fake news", "a IA sabe tudo") = risco legal | Trocados por **linguagem de classificação**: confirmado / rumor / não verificado | landing (hero, problema, features, FAQ, plano, mockup, depoimento) |
| Números de prova social fabricados (12.000+, 12.847 assinantes, 48k pontos, 4.2M msgs, 15.000) | **Removidos**; contadores viraram **selos qualitativos** (sem número inventado) | landing |

### Lote 2 — Primeira dobra (P1)
| Achado do Naka | O que mudou | Onde |
|---|---|---|
| H1 genérico ("pronto para saber tudo…") | Novo H1: **"Pare de caçar notícia do Timão. Pergunte pra FIEL IA."** | hero |
| 2 CTAs competindo (grupo grátis × premium) | **CTA primário = Assinar Premium**; grupo grátis vira secundário | hero |
| Paga antes de ver o produto | **Chips de perguntas-exemplo** (demo): "O Yuri tá suspenso?", "Próximo jogo?", "Esse rumor é confirmado?" | hero |
| Subtítulo desalinhado | Reescrito ("…responde na hora…") | hero |

> A ordem da landing (dor → demo → benefícios → prova → oferta) já seguia a recomendação do Naka, então não foi preciso reordenar seções.

---

## 2. Evidência de validação (produção)
- `https://fielchat.com/` → **HTTP 200** · `https://fielchat.com/assinar` → **HTTP 200**
- Textos novos no ar: "Pergunte pra FIEL IA", "Experimente perguntar", "Fontes confiáveis", "por tempo limitado" — todos presentes.
- Textos antigos: "para saber tudo", "verificadas em tempo real", "sem fake news", "12.000", "15.000 assinantes" — **0 ocorrências**.
- Checkout: aceite de Termos/Privacidade + microcopy do CPF — presentes.
- Local antes do deploy: `tsc` limpo, build do CI OK.

---

## 3. Deploy (técnico)
- **Commits (main):** `c03a38e` (código) · `ca1009b` (docs/extração)
- **Imagem em produção:** `ghcr.io/folkz1/fielia:sha-ca1009b` (EasyPanel `scrapers/fielia`)
- **Como foi:** push → CI (GitHub Actions) buildou a imagem → EasyPanel `updateSourceImage` + webhook de deploy.
- **🔄 Rollback (~30s):** apontar `scrapers/fielia` de volta para `ghcr.io/folkz1/fielia:sha-51670b7` + disparar webhook.
- **Escopo/guardrails:** só frontend (landing + checkout). Sem migration, sem mexer em pagamento/webhook/banco/Asaas.

---

## 4. Para o Naka (dono do produto)

Henry — implementei e subi pra produção os itens **P0 (confiança/legal)** e **P1 (primeira dobra)** da sua **análise de conversão (12/06)** e do seu **roadmap (18/06)**. Já está no ar em `fielchat.com`: checkout com consentimento + explicação do CPF, claims de notícia ajustados pra linguagem de status (confirmado/rumor/não verificado), números fabricados removidos, novo H1 focado em "parar de caçar boato" e CTA priorizando a assinatura.

**Decisões que tomei pra conseguir subir agora (confirma ou ajusta):**
- **CTA primário = Assinar** (foco em receita) — grupo grátis virou secundário.
- **Removi o "12.000+" e os contadores** — não havia dado comprovável; troquei por prova qualitativa. Se você tem o número real, me passa que eu coloco.
- **Instrumentação = tracking próprio** (sem ferramenta externa) — entra no Lote 3.
- *Hoje o site tem zero medição de funil* — por isso o Lote 3 é prioridade pra saber o efeito real destas mudanças.

**Ainda preciso da sua decisão (5 pontos) pra fechar o roadmap:**
1. CPF pode sair do formulário e ir só na etapa do Asaas?
2. Há capacidade operacional pra garantia / trial / preço de entrada (ex.: 1ª semana mais barata)?
3. WhatsApp já é funcional no premium ou ainda é promessa de roadmap?
4. Promessa central do produto: notícia confiável, chat especialista ou comunidade gamificada — e em que ordem?
5. Quais fontes a IA usa (ou deve usar) pra classificar notícia como confirmado / rumor / não verificado?

---

## 5. Próximos lotes (pendentes)
- **Lote 3 — Instrumentação:** medir o funil (tabela `FunnelEvent` + `/api/track` + eventos de CTA/checkout/grupo) e criar a **página-ponte `/grupo`**. ⚠️ Exige migration no banco (aprovação do Diego). Sem isso, não dá pra medir o efeito real dos Lotes 1+2.
- **Lote 4:** checkout em etapas, garantia/trial, sistema de classificação de notícias no core, fontes nas respostas da IA.

**Fontes (no repo):** `docs/research/hermes-naka-2026-06-18/` — transcripts das conversas, documentos do Naka (roadmap + análise) e a síntese com o mapa achado→código.
