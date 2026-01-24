---
description: Implementação das Funcionalidades do Bot (Quiz, Notícias, Ranking)
---

# Objetivo

Transformar os "stubs" atuais do arquivo `router.ts` em funcionalidades reais, conectadas ao banco de dados e à lógica de negócios.

# Contexto Atual

- O arquivo `lib/bot/router.ts` possui funções vazias para `handleNews`, `handleQuiz`, `handleGame`, `handleRanking`.
- O Webhook do WhatsApp já chama esse router.
- O banco de dados já possui modelos `Quiz`, `User`, `News`.

# Passos

1. **Funcionalidade: Notícias (`handleNews`)**
   - Buscar as 3 últimas notícias da tabela `News`.
   - Formatar a mensagem de resposta (Ex: "📰 _Título_ \n Resumo... \n [Ler mais](url)").
   - Caso não tenha notícias recentes, acionar um fallback (ex: avisar que está buscando ou chamar LLM para resumir últimas do dia).

2. **Funcionalidade: Quiz (`handleQuiz`)**
   - Lógica de Sessão de Quiz: O bot precisa saber se o usuário está "dentro" de um quiz.
     - _Sugestão_: Adicionar campo `currentAction` ou tabela `UserSession` no Redis/Banco.
   - Enviar pergunta com alternativas (A, B, C, D).
   - Validar resposta do usuário.
   - Atualizar pontuação (`totalPoints` no User) e `QuizAttempt`.

3. **Funcionalidade: Ranking (`handleRanking`)**
   - Query no banco para buscar TOP 10 usuários por `totalPoints`.
   - Formatar lista: "🏆 _Top Torcedores_ \n 1. João - 1000pts \n ...".

4. **Funcionalidade: Perfil (`/perfil` ou similar)**
   - Mostrar dados do usuário: Pontos, Streak, Status da Assinatura.

# Entregáveis

- `router.ts` atualizado chamando serviços reais.
- Serviços criados em `lib/bot/services/` (ex: `quiz.service.ts`, `news.service.ts`).
- Bot respondendo dinamicamente a comandos de menu.
