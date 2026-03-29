import { test, expect, Page } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'https://fielchat.com';
const FREE_EMAIL = 'free@fielchat.com';
const PREMIUM_EMAIL = 'premium@fielchat.com';
const TEST_PASS = 'FielIA2026!';

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/auth/login`);
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

// ─── LANDING PAGE (visitante) ─────────────────────────

test.describe('Landing Page (visitante)', () => {
  test('homepage carrega versão profissional', async ({ page }) => {
    await page.goto(BASE);
    await expect(page).toHaveTitle(/FIEL/i);
    // Deve ser a versão corinthiansraiz
    await expect(page.locator('text=APRESENTANDO').first()).toBeVisible({ timeout: 10000 });
  });

  test('navbar tem links corretos', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('text=Assinar Agora').first()).toBeVisible();
  });

  test('seção de preços mostra R$ 56,90', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('text=56,90').first()).toBeVisible();
  });

  test('FAQ existe e funciona', async ({ page }) => {
    await page.goto(BASE);
    const faqItem = page.locator('text=Preciso instalar algum aplicativo?');
    await faqItem.scrollIntoViewIfNeeded();
    await expect(faqItem).toBeVisible();
    await faqItem.click();
    await expect(page.locator('text=funciona direto no navegador').first()).toBeVisible();
  });
});

// ─── PÁGINAS LEGAIS ───────────────────────────────────

test.describe('Páginas Legais', () => {
  test('/termos carrega com conteúdo', async ({ page }) => {
    await page.goto(`${BASE}/termos`);
    await expect(page.locator('h1')).toContainText('Termos');
    await expect(page.locator('text=Aceitação dos Termos')).toBeVisible();
  });

  test('/privacidade carrega com LGPD', async ({ page }) => {
    await page.goto(`${BASE}/privacidade`);
    await expect(page.locator('h1')).toContainText('Privacidade');
    await expect(page.locator('text=LGPD')).toBeVisible();
  });

  test('/contato tem email e WhatsApp', async ({ page }) => {
    await page.goto(`${BASE}/contato`);
    await expect(page.locator('h1')).toContainText('Contato');
    await expect(page.locator('text=suporte@fielchat.com')).toBeVisible();
    await expect(page.locator('text=WhatsApp').first()).toBeVisible();
  });
});

// ─── SEO ──────────────────────────────────────────────

test.describe('SEO', () => {
  test('robots.txt existe', async ({ page }) => {
    const resp = await page.goto(`${BASE}/robots.txt`);
    expect(resp?.status()).toBe(200);
    const text = await resp?.text();
    expect(text).toContain('User-Agent');
    expect(text).toContain('sitemap');
  });

  test('sitemap.xml existe com URLs', async ({ page }) => {
    const resp = await page.goto(`${BASE}/sitemap.xml`);
    expect(resp?.status()).toBe(200);
    const text = await resp?.text();
    expect(text).toContain('fielchat.com');
    expect(text).toContain('<url>');
  });

  test('homepage tem OG tags', async ({ page }) => {
    await page.goto(BASE);
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    const ogDesc = await page.locator('meta[property="og:description"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
    expect(ogDesc).toBeTruthy();
  });
});

// ─── AUTH ─────────────────────────────────────────────

test.describe('Autenticação', () => {
  test('login FREE user funciona', async ({ page }) => {
    await login(page, FREE_EMAIL, TEST_PASS);
    expect(page.url()).toContain('/dashboard');
    await expect(page.locator('text=Fala,').first()).toBeVisible({ timeout: 10000 });
  });

  test('login PREMIUM user funciona', async ({ page }) => {
    await login(page, PREMIUM_EMAIL, TEST_PASS);
    expect(page.url()).toContain('/dashboard');
    await expect(page.locator('text=Fala,').first()).toBeVisible({ timeout: 10000 });
  });

  test('login com credenciais erradas fica no auth', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.fill('input[type="email"], input[name="email"]', 'naoexiste@x.com');
    await page.fill('input[type="password"], input[name="password"]', 'errada');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/auth');
  });
});

// ─── DASHBOARD FREE USER ──────────────────────────────

test.describe('Dashboard (FREE user)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, FREE_EMAIL, TEST_PASS);
  });

  test('dashboard mostra banner WhatsApp', async ({ page }) => {
    await expect(page.locator('text=WhatsApp').first()).toBeVisible({ timeout: 10000 });
  });

  test('dashboard mostra cards de stats', async ({ page }) => {
    await expect(page.locator('text=Meus Pontos').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Meu Ranking').first()).toBeVisible();
  });

  test('navegar para chat funciona', async ({ page }) => {
    await page.click('text=Abrir Chat');
    await page.waitForURL(/\/dashboard\/chat/, { timeout: 10000 });
    expect(page.url()).toContain('/dashboard/chat');
  });

  test('navegar para news funciona', async ({ page }) => {
    await page.click('text=Ver todas');
    await page.waitForURL(/\/dashboard\/news/, { timeout: 10000 });
  });

  test('navegar para quiz funciona', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/quiz`);
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/dashboard/quiz');
  });

  test('navegar para ranking funciona', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/ranking`);
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/dashboard/ranking');
  });

  test('settings mostra dados reais do user', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/settings`);
    await page.waitForTimeout(5000);
    // Deve mostrar nome e email reais, NÃO "Torcedor Fiel"
    await expect(page.locator('text=Teste Free').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=free@fielchat.com').first()).toBeVisible();
    // Não deve ter dados hardcoded
    const hasFake = await page.locator('text=torcedor@fiel.ia').count();
    expect(hasFake).toBe(0);
  });

  test('settings mostra plano INATIVO para free', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/settings`);
    await page.waitForTimeout(5000);
    await expect(page.locator('text=INATIVO').first()).toBeVisible({ timeout: 10000 });
  });

  test('account carrega resumo de billing para free', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/account`);
    await page.waitForTimeout(5000);
    await expect(page.locator('text=Plano atual').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Perfil do Torcedor').first()).toBeVisible();
  });

  test('CTA premium aparece no dashboard', async ({ page }) => {
    await expect(page.locator('text=Seja Fiel Premium').first()).toBeVisible({ timeout: 10000 });
  });
});

// ─── DASHBOARD PREMIUM USER ───────────────────────────

test.describe('Dashboard (PREMIUM user)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, PREMIUM_EMAIL, TEST_PASS);
  });

  test('dashboard NÃO mostra CTA premium', async ({ page }) => {
    await page.waitForTimeout(3000);
    const ctaCount = await page.locator('text=Seja Fiel Premium').count();
    expect(ctaCount).toBe(0);
  });

  test('settings mostra plano ATIVO', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/settings`);
    await page.waitForTimeout(5000);
    await expect(page.locator('text=ATIVO').first()).toBeVisible({ timeout: 10000 });
  });

  test('account carrega resumo de billing para premium', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/account`);
    await page.waitForTimeout(5000);
    await expect(page.locator('text=Plano atual').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Perfil do Torcedor').first()).toBeVisible();
  });

  test('settings mostra dados reais premium', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/settings`);
    await page.waitForTimeout(5000);
    await expect(page.locator('text=Teste Premium').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=premium@fielchat.com').first()).toBeVisible();
  });

  test('memes está acessível para premium', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/memes`);
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/dashboard/memes');
  });
});

// ─── 404 PAGE ─────────────────────────────────────────

test.describe('Error Pages', () => {
  test('404 mostra página customizada', async ({ page }) => {
    await page.goto(`${BASE}/pagina-que-nao-existe`);
    await page.waitForTimeout(2000);
    // Deve ter botão de voltar ao início
    const hasHome = await page.locator('text=Voltar ao início').count();
    const has404 = await page.locator('text=404').count();
    expect(hasHome + has404).toBeGreaterThan(0);
  });
});

// ─── CHECKOUT ─────────────────────────────────────────

test.describe('Checkout', () => {
  test('/assinar carrega formulário', async ({ page }) => {
    await page.goto(`${BASE}/assinar`);
    await page.waitForTimeout(3000);
    // Deve ter campos de CPF ou email
    const inputs = await page.locator('input').count();
    expect(inputs).toBeGreaterThanOrEqual(1);
  });
});
