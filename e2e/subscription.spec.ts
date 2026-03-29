import { test, expect, type APIRequestContext } from '@playwright/test';

const BASE = process.env.PLAYWRIGHT_BASE_URL || 'https://fielchat.com';

function generateValidCpf(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const digits: number[] = [];
  for (let i = 0; i < 9; i += 1) {
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    digits.push(Math.abs(hash) % 10);
  }

  const calc = (base: number[]) => {
    const weightStart = base.length + 1;
    const sum = base.reduce((acc, digit, idx) => acc + digit * (weightStart - idx), 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const d1 = calc(digits);
  const d2 = calc([...digits, d1]);
  return [...digits, d1, d2].join('');
}

async function postCheckoutWithRetry(request: APIRequestContext, data: Record<string, string>) {
  let lastResponse;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await request.post(`${BASE}/api/checkout`, { data });
    lastResponse = response;

    if (response.status() !== 500) {
      return response;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return lastResponse!;
}

test.describe('Assinatura e Pagamento', () => {
  test('página de assinatura carrega', async ({ page }) => {
    await page.goto(`${BASE}/assinar`);
    await page.waitForTimeout(3000);
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
    expect(content!).toContain('Premium');
  });

  test('API checkout valida campos obrigatórios', async ({ request }) => {
    const resp = await request.post(`${BASE}/api/checkout`, {
      data: { name: '', email: '', phone: '', cpf: '' },
    });
    expect(resp.status()).toBe(400);
    const data = await resp.json();
    expect(String(data.error || '')).toMatch(/obrigat/i);
  });

  test('API subscription GET sem auth retorna 401', async ({ request }) => {
    const resp = await request.get(`${BASE}/api/subscription`);
    expect([401, 403, 302]).toContain(resp.status());
  });

  test('API checkout cria cobrança pública com invoiceUrl', async ({ request }) => {
    const unique = `${Date.now()}`;
    const resp = await postCheckoutWithRetry(request, {
      name: 'Teste Billing Playwright',
      email: `asaas_test_${unique}@test.com`,
      phone: `1199${unique.slice(-6)}`,
      cpf: generateValidCpf(unique),
    });

    expect(resp.status(), await resp.text()).toBe(200);
    const data = await resp.json();
    expect(data.invoiceUrl).toBeTruthy();
    expect(String(data.invoiceUrl)).toContain('asaas');
  });

  test('API checkout devolve erro amigável para CPF e WhatsApp duplicados', async ({ request }) => {
    const unique = `${Date.now()}`;
    const cpf = generateValidCpf(`${unique}-cpf`);
    const phone = `1198${unique.slice(-6)}`;

    const first = await postCheckoutWithRetry(request, {
      name: 'Duplicidade Base',
      email: `dup_base_${unique}@test.com`,
      phone,
      cpf,
    });

    expect(first.status(), await first.text()).toBe(200);

    const cpfConflict = await request.post(`${BASE}/api/checkout`, {
      data: {
        name: 'Duplicidade CPF',
        email: `dup_cpf_${unique}@test.com`,
        phone: `1197${unique.slice(-6)}`,
        cpf,
      },
    });

    expect(cpfConflict.status(), await cpfConflict.text()).toBe(409);
    const cpfBody = await cpfConflict.json();
    expect(String(cpfBody.error || '')).toMatch(/cpf/i);

    const phoneConflict = await request.post(`${BASE}/api/checkout`, {
      data: {
        name: 'Duplicidade Phone',
        email: `dup_phone_${unique}@test.com`,
        phone,
        cpf: generateValidCpf(`${unique}-phone`),
      },
    });

    expect(phoneConflict.status(), await phoneConflict.text()).toBe(409);
    const phoneBody = await phoneConflict.json();
    expect(String(phoneBody.error || '')).toMatch(/whatsapp|telefone/i);
  });
});
