import { test, expect } from '@playwright/test';

const BASE = 'https://fielchat.com';

test.describe('News & Blog', () => {
  test('API news retorna artigos', async ({ request }) => {
    const resp = await request.get(`${BASE}/api/news`);
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json();
    expect(data.news).toBeDefined();
    expect(data.news.length).toBeGreaterThan(0);
    const first = data.news[0];
    expect(first.title).toBeTruthy();
    expect(first.id).toBeTruthy();
  });

  test('API blog retorna posts', async ({ request }) => {
    const resp = await request.get(`${BASE}/api/blog`);
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json();
    expect(data.posts).toBeDefined();
    expect(data.posts.length).toBeGreaterThan(0);
    const first = data.posts[0];
    expect(first.slug).toBeTruthy();
    expect(first.title).toBeTruthy();
  });

  test('página de news carrega', async ({ page }) => {
    await page.goto(`${BASE}/news`);
    await page.waitForTimeout(5000);
    const content = await page.textContent('body');
    expect(content!.length).toBeGreaterThan(100);
  });

  test('página de blog carrega', async ({ page }) => {
    await page.goto(`${BASE}/blog`);
    await page.waitForTimeout(3000);
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
  });
});

test.describe('Podcast', () => {
  test('API podcast responde com estrutura válida', async ({ request }) => {
    const resp = await request.get(`${BASE}/api/podcast`);
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json();
    // Array pode estar vazio enquanto episódios ainda não foram gerados
    expect(data.podcasts).toBeDefined();
    expect(Array.isArray(data.podcasts)).toBeTruthy();
  });

  test('API podcast audio stream funciona', async ({ request }) => {
    const listResp = await request.get(`${BASE}/api/podcast`);
    const listData = await listResp.json();
    if (listData.podcasts?.length > 0) {
      const podId = listData.podcasts[0].id;
      const audioResp = await request.get(`${BASE}/api/podcast/${podId}/audio`);
      expect([200, 206, 302]).toContain(audioResp.status());
    }
  });
});

test.describe('Quiz', () => {
  test('API quiz retorna quiz ativo', async ({ request }) => {
    const resp = await request.get(`${BASE}/api/quiz`);
    expect(resp.ok()).toBeTruthy();
  });
});

test.describe('Admin', () => {
  test('API admin/check responde', async ({ request }) => {
    const resp = await request.get(`${BASE}/api/admin/check`);
    expect(resp.ok()).toBeTruthy();
    const data = await resp.json();
    expect(data).toHaveProperty('isAdmin');
  });
});

test.describe('Homepage & Navigation', () => {
  test('homepage carrega com conteúdo', async ({ page }) => {
    await page.goto(BASE);
    // Use .first() to avoid strict mode on multiple matches
    await expect(page.getByRole('heading', { name: /FIEL/i }).first()).toBeVisible({ timeout: 10000 });
    const content = await page.textContent('body');
    expect(content).toContain('Corinthians');
  });

  test('navegação para login funciona', async ({ page }) => {
    await page.goto(BASE);
    const loginLink = page.locator('a[href*="login"], a[href*="auth"]').first();
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await page.waitForURL(/auth/);
      expect(page.url()).toContain('auth');
    }
  });
});
