import { test, expect } from '@playwright/test';

const BASE = 'https://fielchat.com';
const TEST_EMAIL = 'teste@fiel.ia';
const TEST_PASS = 'fiel123';

test.describe('Autenticação', () => {
  test('página de login carrega corretamente', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await expect(page).toHaveTitle(/FIEL/i);
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
  });

  test('login com credenciais válidas', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', TEST_PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|$)/, { timeout: 15000 });
    expect(page.url()).not.toContain('/auth/login');
  });

  test('login com credenciais inválidas mostra erro', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.fill('input[type="email"], input[name="email"]', 'naoexiste@test.com');
    await page.fill('input[type="password"], input[name="password"]', 'senhaerrada');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/auth');
  });

  test('página de registro carrega', async ({ page }) => {
    await page.goto(`${BASE}/auth/register`);
    await page.waitForTimeout(2000);
    // Check for any input fields on the page
    const inputs = await page.locator('input').count();
    expect(inputs).toBeGreaterThanOrEqual(2);
  });

  test('registro de novo usuário', async ({ page }) => {
    const uniqueEmail = `playwright_${Date.now()}@test.com`;
    await page.goto(`${BASE}/auth/register`);
    await page.waitForTimeout(2000);
    
    // Fill all visible inputs
    const nameInput = page.locator('input[name="name"], input[placeholder*="nome" i], input[type="text"]').first();
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passInput = page.locator('input[type="password"], input[name="password"]').first();
    
    if (await nameInput.isVisible()) await nameInput.fill('Playwright Test');
    await emailInput.fill(uniqueEmail);
    await passInput.fill('PlayTest@123');
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    const hasError = await page.locator('text=/erro|falha/i').count();
    expect(hasError).toBe(0);
  });

  test('forgot password carrega', async ({ page }) => {
    await page.goto(`${BASE}/auth/forgot-password`);
    await page.waitForTimeout(2000);
    const inputs = await page.locator('input').count();
    expect(inputs).toBeGreaterThanOrEqual(1);
  });
});
