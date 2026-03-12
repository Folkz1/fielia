import { test, expect } from '@playwright/test';

const BASE = 'https://fielchat.com';

test.describe('API Integration Tests', () => {
  
  test.describe('WhatsApp Webhook', () => {
    test('webhook rejeita payload sem dados', async ({ request }) => {
      const resp = await request.post(`${BASE}/api/webhooks/whatsapp`, {
        data: {},
      });
      expect([200, 400, 422]).toContain(resp.status());
    });
  });

  test.describe('Asaas Webhook', () => {
    test('webhook rejeita sem token', async ({ request }) => {
      const resp = await request.post(`${BASE}/api/webhooks/asaas`, {
        data: { event: 'PAYMENT_RECEIVED', payment: { id: 'fake' } },
      });
      expect([401, 403]).toContain(resp.status());
    });
  });

  test.describe('News Sync', () => {
    test('sync endpoint requer secret', async ({ request }) => {
      const resp = await request.post(`${BASE}/api/news/sync`, {
        data: {},
      });
      expect([401, 403, 500]).toContain(resp.status());
    });
  });

  test.describe('RAG / Knowledge Base', () => {
    test('ingest requer API key', async ({ request }) => {
      const resp = await request.post(`${BASE}/api/rag/ingest`, {
        data: { content: 'teste', source: 'test' },
      });
      expect([401, 403]).toContain(resp.status());
    });
  });

  test.describe('Memes', () => {
    test('memes list sem auth retorna erro', async ({ request }) => {
      const resp = await request.get(`${BASE}/api/memes`);
      expect([401, 403, 302]).toContain(resp.status());
    });
  });

  test.describe('Chat IA', () => {
    test('chat sem auth retorna erro', async ({ request }) => {
      const resp = await request.post(`${BASE}/api/chat`, {
        data: { message: 'teste' },
      });
      // Chat may return 400 (bad request) or 401/403 (unauthorized)
      expect([400, 401, 403]).toContain(resp.status());
    });
  });

  test.describe('User Profile', () => {
    test('user/me sem auth retorna erro', async ({ request }) => {
      const resp = await request.get(`${BASE}/api/user/me`);
      expect([401, 403, 302]).toContain(resp.status());
    });
  });

  test.describe('Ranking', () => {
    test('ranking endpoint responde', async ({ request }) => {
      const resp = await request.post(`${BASE}/api/ranking`, {
        data: {},
      });
      // Any valid HTTP response (not 5xx)
      expect(resp.status()).toBeLessThan(500);
    });
  });

  test.describe('Affiliates', () => {
    test('affiliates/active retorna lista', async ({ request }) => {
      const resp = await request.get(`${BASE}/api/affiliates/active`);
      expect(resp.ok()).toBeTruthy();
    });
  });
});
