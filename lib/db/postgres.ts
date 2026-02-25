import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type ExistsRow = { exists: boolean };

let cache: Record<string, { checkedAt: number; value: boolean }> = {};

export async function postgresTableExists(qualifiedName: string, ttlMs = 60_000) {
  const now = Date.now();
  const cached = cache[qualifiedName];
  if (cached && now - cached.checkedAt < ttlMs) {
    return cached.value;
  }

  try {
    const rows = await prisma.$queryRaw<ExistsRow[]>(
      Prisma.sql`select to_regclass(${qualifiedName}) is not null as "exists"`
    );
    const value = Boolean(rows?.[0]?.exists);
    cache[qualifiedName] = { checkedAt: now, value };
    return value;
  } catch {
    cache[qualifiedName] = { checkedAt: now, value: false };
    return false;
  }
}

export async function hasBlogPostsTable(ttlMs = 60_000) {
  return postgresTableExists('public.blog_posts', ttlMs);
}

