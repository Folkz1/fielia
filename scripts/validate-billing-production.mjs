#!/usr/bin/env node
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const rawBaseUrl =
  process.env.BILLING_BASE_URL ||
  process.env.PLAYWRIGHT_BASE_URL ||
  (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost')
    ? process.env.NEXT_PUBLIC_APP_URL
    : '') ||
  'https://fielchat.com';

const BASE_URL = rawBaseUrl.replace(/\/$/, '');
const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

function generateValidCpf(seed) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const digits = [];
  for (let i = 0; i < 9; i += 1) {
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    digits.push(Math.abs(hash) % 10);
  }

  const calc = (base) => {
    const weightStart = base.length + 1;
    const sum = base.reduce((acc, digit, idx) => acc + digit * (weightStart - idx), 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const d1 = calc(digits);
  const d2 = calc([...digits, d1]);
  return [...digits, d1, d2].join('');
}

async function readJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

async function request(url, init = {}) {
  const response = await fetch(url, init);
  const body = await readJson(response);
  return { response, body };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function validateSandboxConnectivity() {
  if (!ASAAS_API_KEY) {
    console.log('[sandbox] ASAAS_API_KEY ausente no ambiente; pulando conectividade direta com Asaas.');
    return;
  }

  if (!ASAAS_API_URL.includes('sandbox.asaas.com')) {
    console.log(`[sandbox] ASAAS_API_URL atual nao parece sandbox (${ASAAS_API_URL}); pulando check direto.`);
    return;
  }

  const response = await fetch(`${ASAAS_API_URL}/customers?limit=1`, {
    headers: {
      'Content-Type': 'application/json',
      access_token: ASAAS_API_KEY,
    },
  });

  const body = await readJson(response);
  if (!response.ok) {
    console.log(`[sandbox] Aviso: nao foi possivel validar a API Asaas diretamente (${JSON.stringify(body)}).`);
    return;
  }

  console.log('[sandbox] API Asaas sandbox respondeu com sucesso.');
}

async function validatePublicCheckout() {
  const runId = `${Date.now()}`;
  const phone = `1198${runId.slice(-6)}`;
  const cpf = generateValidCpf(runId);
  const email = `billing_prod_${runId}@test.com`;

  console.log(`[public] Validando /assinar em ${BASE_URL}...`);
  const pageRes = await fetch(`${BASE_URL}/assinar`);
  const pageText = await pageRes.text();
  assert(pageRes.ok, `[public] /assinar respondeu ${pageRes.status}`);
  assert(pageText.includes('Premium'), '[public] /assinar nao parece carregar a pagina de assinatura.');
  console.log('[public] /assinar carregou corretamente.');

  console.log('[public] Validando /api/subscription sem auth...');
  const subscriptionRes = await fetch(`${BASE_URL}/api/subscription`);
  assert([401, 403, 302].includes(subscriptionRes.status), `[public] /api/subscription sem auth retornou ${subscriptionRes.status}`);
  console.log(`[public] /api/subscription sem auth retornou ${subscriptionRes.status}.`);

  console.log('[public] Criando checkout publico unico...');
  const first = await request(`${BASE_URL}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Billing Validation',
      email,
      phone,
      cpf,
    }),
  });

  assert(first.response.status === 200, `[public] Checkout unico falhou: ${first.response.status} -> ${JSON.stringify(first.body)}`);
  assert(first.body?.invoiceUrl, '[public] Checkout unico nao retornou invoiceUrl.');
  console.log(`[public] Checkout criado com invoiceUrl. payment link: ${first.body.invoiceUrl}`);

  console.log('[public] Validando erro amigavel para CPF duplicado...');
  const cpfConflict = await request(`${BASE_URL}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'CPF Duplicado',
      email: `billing_prod_cpf_${runId}@test.com`,
      phone: `1197${runId.slice(-6)}`,
      cpf,
    }),
  });

  assert(cpfConflict.response.status === 409, `[public] CPF duplicado deveria retornar 409, retornou ${cpfConflict.response.status} -> ${JSON.stringify(cpfConflict.body)}`);
  assert(/cpf/i.test(String(cpfConflict.body?.error || '')), '[public] Mensagem de CPF duplicado nao ficou amigavel.');
  console.log('[public] CPF duplicado retornou 409 amigavel.');

  console.log('[public] Validando erro amigavel para WhatsApp duplicado...');
  const phoneConflict = await request(`${BASE_URL}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'WhatsApp Duplicado',
      email: `billing_prod_phone_${runId}@test.com`,
      phone,
      cpf: generateValidCpf(`${runId}-phone`),
    }),
  });

  assert(phoneConflict.response.status === 409, `[public] WhatsApp duplicado deveria retornar 409, retornou ${phoneConflict.response.status} -> ${JSON.stringify(phoneConflict.body)}`);
  assert(/whatsapp|telefone/i.test(String(phoneConflict.body?.error || '')), '[public] Mensagem de telefone duplicado nao ficou amigavel.');
  console.log('[public] WhatsApp duplicado retornou 409 amigavel.');

  console.log('[public] Validando webhook sem token...');
  const webhookRes = await request(`${BASE_URL}/api/webhooks/asaas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'PAYMENT_CONFIRMED', payment: { id: `fake_${runId}` } }),
  });

  assert([401, 500].includes(webhookRes.response.status), `[public] Webhook sem token deveria estar protegido. Status: ${webhookRes.response.status}`);
  console.log(`[public] Webhook sem token respondeu ${webhookRes.response.status}.`);

  return {
    email,
    phone,
    cpf,
    invoiceUrl: first.body.invoiceUrl,
  };
}

async function main() {
  console.log(`Iniciando validacao de billing em ${BASE_URL}`);

  await validateSandboxConnectivity();
  const result = await validatePublicCheckout();

  console.log('\nResumo');
  console.log(`- checkout publico validado para ${result.email}`);
  console.log(`- duplicidade CPF validada para ${result.cpf}`);
  console.log(`- duplicidade WhatsApp validada para ${result.phone}`);
  console.log(`- webhook protegido sem token`);
  console.log(`- invoiceUrl gerada: ${result.invoiceUrl}`);
}

main().catch((error) => {
  console.error('\nFalha na validacao de billing:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
