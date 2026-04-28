# Fiel.IA Project Context

## Purpose

Fiel.IA is a consumer SaaS product for Corinthians fans. The v2 PRD focuses on a WhatsApp-first acquisition funnel: free WhatsApp group, free registration, monthly quiz, ranking, personalized CTA, and premium conversion.

## Current Workspace

- App root: `D:\projetos\fiel-ia`
- Source repo copied from: `D:\projetos\timao!\fiel-ia`
- Client memory: `.claude/client-memory/` as a Windows junction to `D:\projetos\jarbas-lab\memory\clients\timao-fielia`
- BMAD catalog: `_bmad/`
- BMAD current PRD: `_bmad-output/planning-artifacts/prd.md`
- Human planning docs: `docs/planning/`

## Sensitive Data

Credentials stay in `.env`, `.env.local`, or the Jarbas memory source. Do not print tokens, database URLs, CPF values, API keys, webhook tokens, or payment data in logs, docs, commits, or final reports.

## Product References

- Main PRD: `docs/planning/prd-fielia-v2.md`
- Workspace migration plan: `docs/planning/workspace-migration-plan.md`
- Client decisions: `.claude/client-memory/decisions.md`
- Client pending list: `.claude/client-memory/pending.md`

## Implementation Guardrails

- This project may point local dev at the shared production database. Do not run Prisma migrations against the configured database without Diego approval.
- Schema changes can be prepared in code and SQL, but applying them is a separate approval step.
- Keep v2 work traceable to FR/NFR IDs from the PRD.
- Prioritize CPF safety: store only SHA-256 hashes, never plaintext CPF.
- Centralize premium gating in one helper instead of scattering inline checks.

## Recommended Build Order

1. Free registration foundation: `/cadastro-free`, CPF validation/hash, `free_registrations`.
2. Premium gating helper and `premium_until` semantics.
3. Monthly quiz eligibility and ranking visibility.
4. WhatsApp funnel events and delivery logging.
5. CTA personalization after quiz completion.
6. Admin visibility for free, premium, and trial users.
