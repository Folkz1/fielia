#!/usr/bin/env node
import path from 'node:path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const applyChanges = process.argv.includes('--apply');
const connectionString = process.env.DATABASE_URL;

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

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: 'teste@fiel.ia' },
        { email: 'free@fielchat.com' },
        { email: 'premium@fielchat.com' },
        { email: 'diegovilson.1999+fielia@gmail.com' },
        { email: { startsWith: 'billing_prod_' } },
        { email: { startsWith: 'sandbox+' } },
      ],
    },
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
      isPremium: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!users.length) {
    console.log(JSON.stringify({ applyChanges, deleted: 0, users: [] }, null, 2));
    return;
  }

  if (applyChanges) {
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
