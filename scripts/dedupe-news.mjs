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

function scoreNews(item) {
  return (
    ((item.blogPost ? 1 : 0) * 100000) +
    ((item.imageUrl ? 1 : 0) * 5000) +
    Math.min((item.content || '').trim().length, 20000) +
    Math.min((item.summary || '').trim().length, 2000)
  );
}

function orderByCanonical(a, b) {
  const aTime = new Date(a.createdAt).getTime();
  const bTime = new Date(b.createdAt).getTime();
  if (aTime !== bTime) return aTime - bTime;
  return a.id.localeCompare(b.id);
}

function dedupeIds(ids) {
  const seen = new Set();
  const result = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

async function main() {
  const duplicateGroups = await prisma.news.groupBy({
    by: ['sourceUrl'],
    where: { sourceUrl: { not: null } },
    _count: { sourceUrl: true },
    having: { sourceUrl: { _count: { gt: 1 } } },
    orderBy: { _count: { sourceUrl: 'desc' } },
  });

  const replacementMap = new Map();
  const summary = {
    groups: duplicateGroups.length,
    newsDeleted: 0,
    blogDeleted: 0,
    memesReassigned: 0,
    curationsUpdated: 0,
    canonicalUpdated: 0,
  };

  for (const group of duplicateGroups) {
    const sourceUrl = group.sourceUrl;
    if (!sourceUrl) continue;

    const rows = await prisma.news.findMany({
      where: { sourceUrl },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include: {
        blogPost: {
          select: {
            id: true,
            newsId: true,
            slug: true,
            status: true,
            publishedAt: true,
            createdAt: true,
          },
        },
        memes: {
          select: { id: true },
        },
      },
    });

    if (rows.length < 2) continue;

    const canonical = [...rows].sort(orderByCanonical)[0];
    const richest = [...rows].sort((a, b) => scoreNews(b) - scoreNews(a))[0];
    const duplicateIds = rows.filter((row) => row.id !== canonical.id).map((row) => row.id);

    const canonicalUpdate = {};
    if ((canonical.summary || '').trim().length < (richest.summary || '').trim().length) {
      canonicalUpdate.summary = richest.summary;
    }
    if ((canonical.content || '').trim().length < (richest.content || '').trim().length) {
      canonicalUpdate.content = richest.content;
    }
    if (!canonical.imageUrl && richest.imageUrl) {
      canonicalUpdate.imageUrl = richest.imageUrl;
    }
    if (Object.keys(canonicalUpdate).length > 0) {
      summary.canonicalUpdated += 1;
      if (applyChanges) {
        await prisma.news.update({
          where: { id: canonical.id },
          data: canonicalUpdate,
        });
      }
    }

    const allPosts = rows
      .map((row) => row.blogPost)
      .filter(Boolean);

    const keepPost =
      canonical.blogPost ||
      [...allPosts].sort((a, b) => {
        const aPublished = a.status === 'PUBLISHED' ? 1 : 0;
        const bPublished = b.status === 'PUBLISHED' ? 1 : 0;
        if (aPublished !== bPublished) return bPublished - aPublished;
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return aTime - bTime;
      })[0] ||
      null;

    if (keepPost && keepPost.newsId !== canonical.id && applyChanges) {
      await prisma.blogPost.update({
        where: { id: keepPost.id },
        data: { newsId: canonical.id },
      });
    }

    const extraPostIds = allPosts
      .filter((post) => !keepPost || post.id !== keepPost.id)
      .map((post) => post.id);

    if (extraPostIds.length > 0) {
      summary.blogDeleted += extraPostIds.length;
      if (applyChanges) {
        await prisma.blogPost.deleteMany({
          where: { id: { in: extraPostIds } },
        });
      }
    }

    const duplicateMemeCount = rows
      .filter((row) => row.id !== canonical.id)
      .reduce((acc, row) => acc + row.memes.length, 0);
    if (duplicateMemeCount > 0) {
      summary.memesReassigned += duplicateMemeCount;
      if (applyChanges) {
        await prisma.meme.updateMany({
          where: { newsId: { in: duplicateIds } },
          data: { newsId: canonical.id },
        });
      }
    }

    for (const duplicateId of duplicateIds) {
      replacementMap.set(duplicateId, canonical.id);
    }

    summary.newsDeleted += duplicateIds.length;
    if (applyChanges) {
      await prisma.news.deleteMany({
        where: { id: { in: duplicateIds } },
      });
    }
  }

  if (replacementMap.size > 0) {
    const curations = await prisma.newsCuration.findMany();
    for (const curation of curations) {
      const remapped = dedupeIds(
        curation.topIds.map((id) => replacementMap.get(id) || id)
      );
      const changed =
        remapped.length !== curation.topIds.length ||
        remapped.some((id, index) => id !== curation.topIds[index]);

      if (!changed) continue;
      summary.curationsUpdated += 1;
      if (applyChanges) {
        await prisma.newsCuration.update({
          where: { id: curation.id },
          data: { topIds: remapped },
        });
      }
    }
  }

  console.log(JSON.stringify({ applyChanges, ...summary }, null, 2));
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
