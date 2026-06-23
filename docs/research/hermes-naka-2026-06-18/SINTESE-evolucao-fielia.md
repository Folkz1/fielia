# Síntese — O que o Naka produziu no Hermes e como usar pra evoluir o FIEL IA

**Extraído em:** 2026-06-18 · **Fonte:** agente "Naka" (Hermes Agent v0.15.1) do Henry Nakao, em `hermes-naka.7exngm.easypanel.host` · **Acesso:** API REST do dashboard (session token), o volume não foi acessível por SSH.

---

## 1. O que existe no Hermes do Naka

- **8 sessões / 252 mensagens** — 6 via Telegram (Henry Nakao, ID `7828024973`) + 2 via TUI (setup inicial 03/06).
- **LLM configurado pelo próprio Naka:** `gpt-5.5` via `openai-codex` (OAuth) — feito via dashboard, por isso não aparecia nas env vars. O bot **responde**.
- **Persona definida** ([04-contrato-operacional-fiel-ia.md](04-contrato-operacional-fiel-ia.md)): "assistente executivo do Henry Nakao", focado 100% no FIEL IA, com regra de prioridade `receita > risco > prazo > caos > alavancagem`.
- **Workspace operacional** em `/opt/data/fiel-ia/` (BOOTLOADER, inbox, ideas, log + pasta `produto/`).

## 2. Os dois documentos que importam

| Documento | O que é |
|---|---|
| [documentos/produto__analise-conversao-fielchat-2026-06-12.md](documentos/produto__analise-conversao-fielchat-2026-06-12.md) | Auditoria de conversão real do `fielchat.com` (landing, `/assinar`, `/grupo`, termos, privacidade), página-a-página, com achados verificados e priorizados P0–P3. |
| [documentos/produto__roadmap-produto-2026-06-18.md](documentos/produto__roadmap-produto-2026-06-18.md) | Roadmap de produto em 5 fases (0→4) derivado da análise, com critérios de pronto, backlog por área e 8 decisões pendentes. |

**Tese central do Naka:** o gargalo não é visual — é **falta de prova concreta + excesso de promessa antes do pagamento**. Priorizar **confiança + demonstração + checkout** antes de novas features.

## 3. Ações acionáveis no código do FIEL IA (P0 = quick wins)

| # | Achado do Naka | Onde no produto | Tipo |
|---|---|---|---|
| P0 | `12.000+ torcedores` na copy vs contadores em `0` (assinantes/pontos/msgs) | landing (`app/page.tsx`) | remover contador zerado ou usar número comprovável |
| P0 | Claims absolutos: "sem fake news", "verificado em tempo real", "IA sabe tudo" → risco legal | landing + respostas da IA + termos | trocar por linguagem de classificação (confirmado/rumor/não verificado) |
| P0 | Checkout pede CPF/WhatsApp **sem** links de Termos/Privacidade nem consentimento | página `/assinar` | adicionar aceite + microcopy explicando o CPF |
| P0 | Funil sem instrumentação ponta-a-ponta | já existe `/api/admin/funnel` — validar cobertura | eventos: hero CTA, grupo CTA, checkout view/submit, payment redirect |
| P1 | H1 genérico ("pronto pra saber tudo…") | landing hero | proposta concreta (ver Experimentos A/B na análise) |
| P1 | Dois CTAs competindo (grupo grátis × premium) | landing hero | um CTA primário + secundário discreto |
| P1 | Paga **antes** de ver o produto | landing | demo real (print de conversa, card confirmado/rumor, 3 perguntas) |
| P2 | `/grupo` redireciona direto ao WhatsApp, sem ponte de funil | rota `/grupo` | página intermediária com captura + evento |
| P2 | R$ 56,90/mês frio, sem trial/garantia | `/assinar` | "cancele quando quiser" forte, avaliar trial/preço de entrada |

## 4. Decisões que dependem de você + Naka (bloqueiam roadmap fechado)

1. Objetivo imediato: assinatura direta, trial grátis ou grupo como funil?
2. O `12.000+` é comprovável? Mantém na página?
3. CPF pode sair do form e ir só pro Asaas?
4. Há capacidade operacional pra garantia/trial/preço de entrada?
5. WhatsApp já é funcional no premium ou ainda é promessa?
6. Promessa central do produto: notícia confiável, chat especialista ou comunidade gamificada?
7. Quais eventos de analytics já existem hoje?
8. Quais fontes a IA usa pra classificar notícia/rumor?

## 5. Próximos passos sugeridos

1. **Validar os P0 contra o código atual** — cruzar cada achado com `app/page.tsx`, a página `/assinar` e `/api/admin/funnel` pra confirmar o que ainda procede (a análise é de 12/06).
2. **Atacar os 4 P0** como um lote de quick wins (copy + consentimento + instrumentação) — baixo esforço, destrava confiança e medição.
3. **Responder as 8 decisões pendentes** com o Naka pra fechar o roadmap.
4. Conversa-fonte de 204 msgs (12/06) em [05-sessao-telegram.md](05-sessao-telegram.md) — contém a navegação que gerou a análise; vale ler se quiser o raciocínio por trás de cada achado.

> ⚠️ As ações de código tocam `fielchat.com` (produção) — exigem aprovação do Diego antes de aplicar (regra do projeto).
