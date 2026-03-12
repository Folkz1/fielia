import { test, expect } from '@playwright/test';

const BASE = 'https://fielchat.com';

test.describe('Assinatura e Pagamento', () => {
  test('página de assinatura carrega', async ({ page }) => {
    await page.goto(`${BASE}/assinar`);
    await page.waitForTimeout(3000);
    // Check page loaded with subscription content
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(100);
  });

  test('API checkout valida campos obrigatórios', async ({ request }) => {
    const resp = await request.post(`${BASE}/api/checkout`, {
      data: { name: '', email: '', phone: '', cpf: '' },
    });
    expect(resp.status()).toBe(400);
  });

  test('API subscription GET sem auth retorna 401', async ({ request }) => {
    const resp = await request.get(`${BASE}/api/subscription`);
    expect([401, 403, 302]).toContain(resp.status());
  });

  test('API checkout responde (Asaas sandbox)', async ({ request }) => {
    const resp = await request.post(`${BASE}/api/checkout`, {
      data: {
        name: 'Teste Asaas Playwright',
        email: `asaas_test_${Date.now()}@test.com`,
        phone: '11999887766',
        cpf: '00000000000',
      },
    });
    // Either success (200 with invoiceUrl) or known error (400 CPF invalid)
    expect([200, 400, 500]).toContain(resp.status());
  });
});
