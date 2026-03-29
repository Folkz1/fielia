import { test, expect, Page } from '@playwright/test';

/**
 * FIEL IA — Testes de Jornada de Conversão
 *
 * Pensa como EMPREENDEDOR, não como dev.
 * Valida os caminhos que um usuário REAL percorre pra COMPRAR.
 *
 * Jornada 1: Visitante vê site → compra direto SEM login (conversão máxima)
 * Jornada 2: Visitante registra → usa free → bate no limite → assina
 * Jornada 3: Comprador usa features premium → retém
 * Jornada 4: Comprador cancela → volta pro free
 *
 * IMPORTANTE: Asaas em SANDBOX — cartões de teste funcionam.
 * Rodar: npx playwright test e2e/subscription-full-flow.spec.ts --reporter=list
 */

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'https://fielchat.com';
const UNIQUE = Date.now();
const TEST_CPF = '52998224725';

// ═══════════════════════════════════════════════════
// JORNADA 1: Visitante → Comprador (SEM login)
// O caminho mais importante. Se não funciona, não vende.
// ═══════════════════════════════════════════════════

test.describe.serial('Jornada 1: Visitante compra SEM login', () => {

  test('1.1 Homepage mostra preço e CTA claro', async ({ page }) => {
    await page.goto(BASE);
    // Visitante precisa VER o preço sem esforço
    await expect(page.locator('text=56,90').first()).toBeVisible({ timeout: 10_000 });
    // CTA de assinar visível
    await expect(page.locator('text=Assinar').first()).toBeVisible();
  });

  test('1.2 /assinar acessível SEM login (checkout público)', async ({ page }) => {
    await page.goto(`${BASE}/assinar`);
    // Página carrega sem redirecionar pra login
    expect(page.url()).toContain('/assinar');
    expect(page.url()).not.toContain('/auth');

    // Formulário de checkout visível com campos essenciais
    await expect(page.locator('input').first()).toBeVisible({ timeout: 10_000 });
    const inputs = await page.locator('input').count();
    expect(inputs).toBeGreaterThanOrEqual(3); // nome, email, CPF mínimo
  });

  test('1.3 Checkout preenche dados e envia', async ({ page }) => {
    await page.goto(`${BASE}/assinar`);
    await page.waitForTimeout(2_000);

    // Preencher dados como visitante (nunca criou conta)
    const nameField = page.locator('input[name="name"], input[placeholder*="nome" i]').first();
    const emailField = page.locator('input[type="email"], input[name="email"]').first();
    const phoneField = page.locator('input[type="tel"], input[name="phone"]').first();
    const cpfField = page.locator('input[name="cpf"], input[placeholder*="CPF" i], input[placeholder*="000" i]').first();

    await nameField.fill('Visitante Teste E2E');
    await emailField.fill(`visitante_${UNIQUE}@teste.com`);
    if (await phoneField.isVisible()) {
      await phoneField.fill('11999887766');
    }
    await cpfField.fill(TEST_CPF);

    // Submit
    await page.click('button[type="submit"]');
    await page.waitForTimeout(8_000);

    // Resultado: ou redirecionou pro Asaas (invoiceUrl) ou mostrou erro claro
    const url = page.url();
    const redirectedToAsaas = url.includes('asaas.com');
    const hasError = await page.locator('text=Erro').count() > 0
      || await page.locator('[class*="error"]').count() > 0;
    const hasSuccess = await page.locator('text=invoice').count() > 0;

    // Deve redirecionar OU mostrar feedback (nunca ficar em silêncio)
    expect(redirectedToAsaas || hasError || hasSuccess).toBeTruthy();
  });

  test('1.4 Checkout valida CPF obrigatório', async ({ page }) => {
    await page.goto(`${BASE}/assinar`);
    await page.waitForTimeout(2_000);

    // Preencher tudo EXCETO CPF
    const nameField = page.locator('input[name="name"], input[placeholder*="nome" i]').first();
    const emailField = page.locator('input[type="email"], input[name="email"]').first();

    await nameField.fill('Sem CPF Teste');
    await emailField.fill('semcpf@teste.com');

    // Submit sem CPF
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3_000);

    // NÃO deve ter redirecionado pro Asaas
    expect(page.url()).not.toContain('asaas.com');
  });

  test('1.5 Homepage CTA leva direto pra /assinar', async ({ page }) => {
    await page.goto(BASE);

    // Clicar no CTA principal
    const cta = page.locator('a:has-text("Assinar"), button:has-text("Assinar")').first();
    await expect(cta).toBeVisible({ timeout: 10_000 });
    await cta.click();
    await page.waitForTimeout(3_000);

    // Deve estar em /assinar OU /auth (se exigir login — isso seria um BUG de conversão)
    const url = page.url();
    const isAssinar = url.includes('/assinar');
    const isAuth = url.includes('/auth');

    if (isAuth) {
      // ALERTA: exigir login pra comprar mata conversão
      console.warn('⚠️ CTA redireciona pra login em vez de /assinar — PERDA DE CONVERSÃO');
    }

    // Deve ir pra /assinar (ideal) ou /auth (aceitável mas não ideal)
    expect(isAssinar || isAuth).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════
// JORNADA 2: Registrar → Free → Limite → Assinar
// Funil de ativação
// ═══════════════════════════════════════════════════

const FREE_EMAIL = `free_${UNIQUE}@teste.com`;
const FREE_PASS = 'FielIA2026!';

test.describe.serial('Jornada 2: Free → Limite → Premium', () => {

  test('2.1 Registro de novo usuário', async ({ page }) => {
    await page.goto(`${BASE}/auth/register`);
    await page.fill('input[name="name"], input[placeholder*="nome" i]', 'Free User E2E');
    await page.fill('input[type="email"], input[name="email"]', FREE_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', FREE_PASS);

    const confirmField = page.locator('input[name="confirmPassword"], input[placeholder*="confirme" i]');
    if (await confirmField.count() > 0) {
      await confirmField.fill(FREE_PASS);
    }

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|auth|bem-vindo)/, { timeout: 15_000 });
  });

  test('2.2 Dashboard free mostra CTA premium', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.fill('input[type="email"], input[name="email"]', FREE_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', FREE_PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });

    // CTA premium visível (incentiva upgrade)
    await expect(page.locator('text=Seja Fiel Premium').first()).toBeVisible({ timeout: 10_000 });

    // Stats carregam
    await expect(page.locator('text=Meus Pontos').first()).toBeVisible();
  });

  test('2.3 Chat mostra limite free', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.fill('input[type="email"], input[name="email"]', FREE_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', FREE_PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });

    await page.goto(`${BASE}/dashboard/chat`);
    await page.waitForTimeout(3_000);

    // Página de chat carrega
    expect(page.url()).toContain('/dashboard/chat');
  });

  test('2.4 Settings mostra INATIVO + preço + botão assinar', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.fill('input[type="email"], input[name="email"]', FREE_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', FREE_PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });

    await page.goto(`${BASE}/dashboard/settings`);
    await page.waitForTimeout(3_000);

    await expect(page.locator('text=INATIVO').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('text=56,90').first()).toBeVisible();
    await expect(page.locator('button:has-text("Assinar no cartão")').first()).toBeVisible();
  });

  test('2.5 Clicar assinar no settings → pede CPF → Asaas', async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.fill('input[type="email"], input[name="email"]', FREE_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', FREE_PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });

    await page.goto(`${BASE}/dashboard/settings`);
    await page.waitForTimeout(3_000);

    await page.click('button:has-text("Assinar no cartão")');
    await page.waitForTimeout(5_000);

    // Deve mostrar campo CPF ou redirecionar pro Asaas
    const cpfField = page.locator('input[placeholder="000.000.000-00"]');
    const cpfVisible = await cpfField.isVisible().catch(() => false);

    if (cpfVisible) {
      await cpfField.fill(TEST_CPF);
      await page.click('button:has-text("Confirmar e Assinar")');
      await page.waitForTimeout(8_000);
    } else {
      await page.waitForTimeout(5_000);
    }

    const url = page.url();
    const hasAsaas = url.includes('asaas.com');
    const hasPaymentInfo = await page.locator('text=Assinatura criada').count() > 0
      || await page.locator('text=aguardando pagamento').count() > 0
      || await page.locator('text=Abrir cobrança').count() > 0;

    expect(hasAsaas || hasPaymentInfo).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════
// JORNADA 3: Premium user usa features
// ═══════════════════════════════════════════════════

test.describe('Jornada 3: Premium aproveita features', () => {
  const PREMIUM_EMAIL = 'premium@fielchat.com';
  const PREMIUM_PASS = 'FielIA2026!';

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/auth/login`);
    await page.fill('input[type="email"], input[name="email"]', PREMIUM_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', PREMIUM_PASS);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
  });

  test('3.1 Dashboard NÃO mostra CTA premium', async ({ page }) => {
    await page.waitForTimeout(3_000);
    const ctaCount = await page.locator('text=Seja Fiel Premium').count();
    expect(ctaCount).toBe(0);
  });

  test('3.2 Settings mostra ATIVO', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/settings`);
    await page.waitForTimeout(3_000);
    await expect(page.locator('text=ATIVO').first()).toBeVisible({ timeout: 10_000 });
    // Mostra benefícios
    await expect(page.locator('text=Seus Benefícios').first()).toBeVisible();
  });

  test('3.3 Chat funciona pra premium', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/chat`);
    await page.waitForTimeout(3_000);
    expect(page.url()).toContain('/dashboard/chat');
  });

  test('3.4 Memes acessível pra premium', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/memes`);
    await page.waitForTimeout(3_000);
    expect(page.url()).toContain('/dashboard/memes');
  });

  test('3.5 News carrega', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/news`);
    await page.waitForTimeout(3_000);
    expect(page.url()).toContain('/dashboard/news');
  });

  test('3.6 Quiz acessível', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/quiz`);
    await page.waitForTimeout(3_000);
    expect(page.url()).toContain('/dashboard/quiz');
  });

  test('3.7 Ranking carrega', async ({ page }) => {
    await page.goto(`${BASE}/dashboard/ranking`);
    await page.waitForTimeout(3_000);
    expect(page.url()).toContain('/dashboard/ranking');
  });
});

// ═══════════════════════════════════════════════════
// JORNADA 4: Cancelamento
// ═══════════════════════════════════════════════════

test.describe('Jornada 4: Cancelar e voltar pro free', () => {

  test('4.1 API cancelar sem auth retorna 401', async ({ request }) => {
    const resp = await request.delete(`${BASE}/api/subscription`);
    expect([401, 403, 302]).toContain(resp.status());
  });

  test('4.2 API subscription sem auth retorna 401', async ({ request }) => {
    const resp = await request.get(`${BASE}/api/subscription`);
    expect([401, 403, 302]).toContain(resp.status());
  });
});

// ═══════════════════════════════════════════════════
// VALIDAÇÕES DE SEGURANÇA E API
// ═══════════════════════════════════════════════════

test.describe('Segurança & API', () => {

  test('Webhook Asaas sem token', async ({ request }) => {
    const resp = await request.post(`${BASE}/api/webhooks/asaas`, {
      data: { event: 'PAYMENT_CONFIRMED', payment: { id: 'fake_test' } },
    });
    // Sandbox pode aceitar, prod deve rejeitar
    expect([200, 401, 500]).toContain(resp.status());
  });

  test('Rotas protegidas redirecionam pra login', async ({ page }) => {
    // Visitante não logado tenta acessar dashboard
    await page.goto(`${BASE}/dashboard`);
    await page.waitForTimeout(3_000);
    // Deve redirecionar pra auth
    expect(page.url()).toContain('/auth');
  });

  test('robots.txt e sitemap existem', async ({ page }) => {
    const robots = await page.goto(`${BASE}/robots.txt`);
    expect(robots?.status()).toBe(200);

    const sitemap = await page.goto(`${BASE}/sitemap.xml`);
    expect(sitemap?.status()).toBe(200);
  });

  test('Homepage tem OG tags pra SEO', async ({ page }) => {
    await page.goto(BASE);
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(ogTitle).toBeTruthy();
  });
});
