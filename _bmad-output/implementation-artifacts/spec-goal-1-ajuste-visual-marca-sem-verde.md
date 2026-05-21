---
title: 'Goal 1 - Ajuste visual de marca sem verde'
type: 'chore'
created: '2026-05-21'
status: 'done'
baseline_commit: 'c2b6baf8403cf4f7ffce8b44bee06f1ac06059fc'
context:
  - '{project-root}/docs/project-context.md'
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** A landing ainda exibe verde no CTA flutuante do grupo, o que conflita com a sensibilidade visual do publico corinthiano. A tela de login usa um icone generico em vez do logo oficial ja usado no dashboard, e o favicon nao esta alinhado com esse logo.

**Approach:** Remover o verde do CTA publico do grupo usando a paleta laranja/preto existente. Reutilizar `public/images/logo-fiel-ia.png` no login, no metadata e nos icones publicos para manter a marca consistente.

## Boundaries & Constraints

**Always:** Manter o fluxo atual para `/grupo`, `/auth/login` e dashboard sem alterar regras de auth, pagamentos, WhatsApp, banco ou deploy. Usar o asset oficial existente `public/images/logo-fiel-ia.png` como fonte de marca. Preservar a UI dark atual e a linguagem visual Corinthians/FIEL IA.

**Ask First:** Qualquer deploy em producao, troca de URL de grupo, mudanca de banco, mudanca de checkout ou troca do asset oficial por imagem nova nao versionada.

**Never:** Nao usar verde em CTAs visiveis desta tarefa. Nao alterar templates de WhatsApp, regras de funil, copy comercial, schema Prisma ou credenciais.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Landing CTA | Usuario ve a home desktop ou mobile | Botao flutuante "Entrar no grupo" continua apontando para `/grupo`, mas sem classes verdes | Se o link falhar, o problema e externo ao ajuste visual |
| Login brand | Usuario abre `/auth/login` | Cabecalho mostra o mesmo logo oficial usado no dashboard, sem escudo generico | Imagem ausente deve manter alt text acessivel |
| Browser icon | Browser carrega metadata/manifest | Favicon e app icon usam o logo oficial da marca | Cache do navegador pode exigir hard refresh |

</frozen-after-approval>

## Code Map

- `app/page.tsx` -- home publica; contem `WhatsAppGroupBubble` com classes verdes.
- `app/(dashboard)/dashboard/page.tsx` -- dashboard do usuario; contem banner do grupo gratuito com classes verdes.
- `app/auth/login/page.tsx` -- tela de login; hoje renderiza icone `Shield` no topo.
- `app/layout.tsx` -- metadata global; define ordem dos icones e favicon.
- `public/manifest.json` -- manifest PWA; aponta apenas para `/favicon.ico`.
- `public/images/logo-fiel-ia.png` -- logo oficial usado nas sidebars do dashboard/admin.
- `app/favicon.ico` -- favicon especial do Next.js.
- `app/icon.png` -- app icon gerado a partir do logo oficial.

## Tasks & Acceptance

**Execution:**
- [x] `app/page.tsx` -- trocar as classes verdes do `WhatsAppGroupBubble` por classes laranja/preto -- remove a cor proibida sem mexer no destino do grupo.
- [x] `app/(dashboard)/dashboard/page.tsx` -- trocar classes verdes do banner do grupo por laranja/preto -- mantem o mesmo ajuste onde o CTA aparece no produto logado.
- [x] `app/auth/login/page.tsx` -- substituir o `Shield` do topo por `Image` com `/images/logo-fiel-ia.png` -- alinha login ao logo do dashboard.
- [x] `app/layout.tsx`, `public/manifest.json`, `app/favicon.ico`, `app/icon.png` -- apontar favicon/app icon para o logo oficial -- deixa navegador e PWA consistentes.
- [x] Validar build/lint/typecheck aplicaveis e revisar visualmente a home/login -- confirma que a mudanca nao quebrou UI basica.

**Acceptance Criteria:**
- Given a home renderizada, when o CTA flutuante do grupo aparece, then ele nao usa verde e continua abrindo `/grupo`.
- Given a tela `/auth/login`, when o cabecalho e exibido, then o logo visual e o mesmo arquivo usado nas sidebars do dashboard.
- Given metadata/manifest carregados, when o browser solicita o icone, then o asset retornado representa o logo oficial da FIEL IA.

## Spec Change Log

## Verification

**Commands:**
- `npm exec -- eslint app/page.tsx app/auth/login/page.tsx app/layout.tsx` -- expected: sem erros novos.
- `npx tsc --noEmit --pretty false` -- expected: typecheck passa.
- `npm run build` -- expected: build Next.js passa.

**Manual checks:**
- Abrir home e login em desktop/mobile para confirmar ausencia de verde no CTA e logo oficial no login.

**Results:**
- `npm exec -- eslint app/page.tsx app/auth/login/page.tsx app/layout.tsx "app/(dashboard)/dashboard/page.tsx"` -- passed.
- `npx tsc --noEmit --pretty false` -- passed.
- `npm run build` -- passed.
- Browser local em `http://localhost:3000` confirmou CTA da home com `/grupo`, sem classes `green`/`emerald`.
- Browser local em `http://localhost:3000/auth/login` confirmou imagem `Fiel IA` no cabecalho.
- `GET /icon.png` retornou `image/png`; `GET /favicon.ico` retornou `image/x-icon`.

## Suggested Review Order

**Logo e icones**

- Login usa o asset oficial ja usado no dashboard.
  [`login/page.tsx:61`](../../app/auth/login/page.tsx#L61)

- Metadata prioriza o PNG oficial e mantem favicon.
  [`layout.tsx:44`](../../app/layout.tsx#L44)

- Manifest anuncia o icone oficial para PWA/browser.
  [`manifest.json:11`](../../public/manifest.json#L11)

**Sem verde nos CTAs**

- Bolha publica do grupo troca verde por laranja/preto.
  [`page.tsx:779`](../../app/page.tsx#L779)

- Banner do dashboard segue a mesma paleta sem verde.
  [`dashboard/page.tsx:104`](../../app/%28dashboard%29/dashboard/page.tsx#L104)

- Card de quiz do dashboard tambem remove o acento verde.
  [`dashboard/page.tsx:158`](../../app/%28dashboard%29/dashboard/page.tsx#L158)
