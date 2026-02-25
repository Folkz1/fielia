#!/usr/bin/env node
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
const API_KEY = process.env.ASAAS_API_KEY;

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

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

async function asaasRequest(endpoint, method = 'GET', body) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      access_token: API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${endpoint} -> ${JSON.stringify(parsed)}`);
  }

  return parsed;
}

async function main() {
  if (!API_KEY) {
    throw new Error('ASAAS_API_KEY ausente no .env');
  }

  if (!API_URL.includes('sandbox.asaas.com')) {
    console.warn(`ATENCAO: ASAAS_API_URL atual nao parece sandbox (${API_URL})`);
  }

  const runId = `${Date.now()}`;
  const cpf = generateValidCpf(runId);
  const email = `sandbox+${runId}@fiel-ia.local`;

  console.log(`[1/4] Validando acesso a API (${API_URL})...`);
  const list = await asaasRequest('/customers?limit=1');
  console.log(`Clientes acessiveis: ${list?.totalCount ?? 'n/d'}`);

  console.log('[2/4] Criando customer de teste...');
  const customer = await asaasRequest('/customers', 'POST', {
    name: `Sandbox FIEL IA ${runId}`,
    cpfCnpj: cpf,
    email,
  });
  console.log(`Customer criado: ${customer.id}`);

  console.log('[3/4] Criando assinatura mensal (CREDIT_CARD)...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const subscriptionValue = Number(process.env.ASAAS_SUBSCRIPTION_VALUE || '56.90');

  const subscription = await asaasRequest('/subscriptions', 'POST', {
    customer: customer.id,
    billingType: 'CREDIT_CARD',
    value: subscriptionValue,
    nextDueDate: formatDate(tomorrow),
    cycle: 'MONTHLY',
    description: 'FIEL.IA sandbox assinatura cartao',
    externalReference: `sandbox-test:${runId}`,
  });

  console.log(`Assinatura criada: ${subscription.id} (status: ${subscription.status})`);

  console.log('[4/4] Buscando primeira cobranca da assinatura...');
  const payments = await asaasRequest(`/subscriptions/${subscription.id}/payments`);
  const firstPayment = Array.isArray(payments?.data) ? payments.data[0] : null;

  if (!firstPayment) {
    throw new Error('Nenhuma cobranca retornada para a assinatura criada.');
  }

  console.log(
    `Primeira cobranca: ${firstPayment.id} (status: ${firstPayment.status}, tipo: ${firstPayment.billingType})`
  );
  console.log(`Checkout URL: ${firstPayment.invoiceUrl || 'nao informado'}`);

  console.log('\nResumo: sandbox operacional para assinatura recorrente no cartao.');
}

main().catch((error) => {
  console.error('\nFalha no teste sandbox Asaas:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
