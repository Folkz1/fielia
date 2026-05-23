#!/usr/bin/env node
import path from 'node:path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const applyChanges = process.argv.includes('--apply');
const skipAsaasCancel = process.argv.includes('--skip-asaas-cancel');
const connectionString = process.env.DATABASE_URL;
const exactTestEmails = [
  'teste@fiel.ia',
  'free@fielchat.com',
  'premium@fielchat.com',
  'diegovilson.1999+fielia@gmail.com',
  'fiel@corinthians.com',
  'diskcevagelada@gmail.com',
];
const testEmailPrefixes = [
  'asaas_test_',
  'billing_prod_',
  'checkout_',
  'dup_base_',
  'fielia_manual_',
  'manual_ok_',
  'registro_',
  'sandbox+',
  'visitante_',
];
const testNamePrefixes = [
  'Codex Smoke',
  'Duplicidade Base',
  'Teste Billing',
  'Validacao',
  'Validação',
  'Visitante Teste',
];

if (!connectionString) {
  throw new Error('Missing DATABASE_URL');
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

async function cancelAsaasSubscription(subscriptionId) {
  if (skipAsaasCancel) {
    return { subscriptionId, status: 'skipped' };
  }

  const baseUrl = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
  const apiKey = process.env.ASAAS_API_KEY;

  if (!apiKey) {
    return { subscriptionId, status: 'missing_api_key' };
  }

  const response = await fetch(`${baseUrl}/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      access_token: apiKey,
    },
  });

  if (response.ok) {
    return { subscriptionId, status: 'cancelled' };
  }

  if (response.status === 404) {
    return { subscriptionId, status: 'not_found' };
  }

  let reason = `HTTP ${response.status}`;
  try {
    const data = await response.json();
    reason = data?.errors?.[0]?.description || data?.errors?.[0]?.code || reason;
  } catch {
    // Keep the HTTP status when the provider returns a non-JSON body.
  }

  return { subscriptionId, status: 'failed', reason };
}

async function main() {
  const users = await prisma.user.findMany({
    where: {
      isAdmin: false,
      OR: [
        { email: { in: exactTestEmails } },
        { email: { endsWith: '@whatsapp.temp' } },
        { email: { endsWith: '@test.com' } },
        { email: { endsWith: '@teste.com' } },
        { email: { endsWith: '@fielia.local' } },
        ...testEmailPrefixes.map((prefix) => ({ email: { startsWith: prefix } })),
        ...testNamePrefixes.map((prefix) => ({ name: { startsWith: prefix } })),
      ],
    },
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
      isPremium: true,
      asaasSubscriptionId: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!users.length) {
    console.log(JSON.stringify({ applyChanges, deleted: 0, users: [] }, null, 2));
    return;
  }

  const asaasCancellations = [];

  if (applyChanges) {
    for (const user of users) {
      if (!user.asaasSubscriptionId) continue;
      asaasCancellations.push(await cancelAsaasSubscription(user.asaasSubscriptionId));
    }

    const failedCancellations = asaasCancellations.filter((result) => result.status === 'failed');
    if (failedCancellations.length) {
      throw new Error(`Asaas cancellation failed for ${failedCancellations.length} test subscription(s)`);
    }

    await prisma.user.deleteMany({
      where: {
        id: { in: users.map((user) => user.id) },
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        applyChanges,
        deleted: users.length,
        asaasCancellations,
        users,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
