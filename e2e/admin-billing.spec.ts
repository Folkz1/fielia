import { test, expect, Page } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'https://fielchat.com';
const ADMIN_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD;

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/auth/login`);
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|admin)/, { timeout: 15000 });
}

test.describe('Admin billing', () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'PLAYWRIGHT_ADMIN_EMAIL e PLAYWRIGHT_ADMIN_PASSWORD não configurados');

  test('admin/assinaturas carrega com filtros e tabela', async ({ page }) => {
    await login(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);
    await page.goto(`${BASE}/admin/assinaturas`);

    await expect(page.locator('text=Assinaturas & Pagamentos').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('button:has-text("Todos")')).toBeVisible();
    await expect(page.locator('button:has-text("Pendentes")')).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
  });

  test('admin consegue alternar filtros de billing', async ({ page }) => {
    await login(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);
    await page.goto(`${BASE}/admin/assinaturas`);

    await page.click('button:has-text("Pendentes")');
    await expect(page.locator('button:has-text("Pendentes")')).toHaveClass(/bg-black/);

    await page.click('button:has-text("Vencidos")');
    await expect(page.locator('button:has-text("Vencidos")')).toHaveClass(/bg-black/);
  });
});
