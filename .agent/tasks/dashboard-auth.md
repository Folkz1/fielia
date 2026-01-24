---
description: Implementação do Dashboard Administrativo e Autenticação
---

# Objetivo

Criar um painel administrativo funcional para gerenciar o Fiel IA e visualizar métricas, com sistema de login seguro.

# Contexto Atual

- O projeto tem uma Landing Page (`app/page.tsx`).
- Existe uma estrutura de pastas `app/(dashboard)/dashboard` mas sem implementação funcional.
- Não existe sistema de login (Auth).
- O banco de dados já tem tabelas de `User`, `AIChat`, `AIMessage`.

# Passos

1. **Configurar Autenticação**
   - Instalar `next-auth` (v5 ou v4 estável).
   - Criar rota de API `app/api/auth/[...nextauth]/route.ts`.
   - Configurar `CredentialsProvider` (email/senha) validando contra a tabela `User` (ou criar tabela `Admin`).
   - Criar página de Login: `app/auth/login/page.tsx`.
   - Proteger as rotas `/dashboard` via Middleware.

2. **Implementar Dashboard Home (`/dashboard`)**
   - Criar cards de métricas (KPIs):
     - Total de Usuários (count na tabela User).
     - Mensagens Hoje (count na tabela AIMessage com filtro de data).
     - Assinantes Premium.
   - Mostrar gráfico simples de atividade (opcional, usar recharts ou similar).
   - Listar "Últimas Interações" (tabela simples puxando de `AIChat`).

3. **Gerenciamento de Conteúdo**
   - Implementar página `/dashboard/quiz`:
     - Listar Quizzes.
     - Botão para criar novo Quiz (CRUD).
   - Implementar página `/dashboard/news`:
     - Listar Notícias cadastradas.
     - Botão para Adicionar Notícia manualmente ou via Crawler (botão "Sync News").

4. **Visualização de Chat (Opcional/Avançado)**
   - Página `/dashboard/chats`:
     - Lista de conversas.
     - Ao clicar, ver histórico de mensagens do usuário.

# Entregáveis

- Sistema de Login funcionando (`/login`).
- Dashboard acessível apenas logado.
- Visualização de dados reais do banco PostgreSQL.
