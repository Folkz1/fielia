const Parser = require('rss-parser');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Missing DATABASE_URL in .env');
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function buildFeedUrl() {
  const base = (process.env.FRESHRSS_URL || '').replace(/\/$/, '');
  const explicit = process.env.FRESHRSS_FEED_URL || '';
  if (explicit) return explicit;

  const category = process.env.FRESHRSS_CATEGORY_ID || '';
  const format = process.env.FRESHRSS_FEED_FORMAT || 'rss';
  if (!base || !category) return '';

  return `${base}/i/?a=${encodeURIComponent(format)}&get=${encodeURIComponent(category)}`;
}

function buildAuthHeader() {
  const user = process.env.FRESHRSS_USER;
  const pass = process.env.FRESHRSS_PASS;
  if (!user || !pass) return undefined;
  const token = Buffer.from(`${user}:${pass}`).toString('base64');
  return `Basic ${token}`;
}

function toDate(value) {
  if (!value) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

async function itemExists(item) {
  if (item.link) {
    const existing = await prisma.news.findFirst({
      where: { sourceUrl: item.link },
      select: { id: true },
    });
    return Boolean(existing);
  }

  if (item.title && item.isoDate) {
    const existing = await prisma.news.findFirst({
      where: { title: item.title, publishedAt: toDate(item.isoDate) },
      select: { id: true },
    });
    return Boolean(existing);
  }

  return false;
}

async function main() {
  const url = buildFeedUrl();
  if (!url) {
    throw new Error('Missing FRESHRSS_URL / FRESHRSS_FEED_URL / FRESHRSS_CATEGORY_ID');
  }

  const limit = Math.max(parseInt(process.env.NEWS_FEED_ITEM_LIMIT || '10', 10) || 10, 1);
  const category = process.env.NEWS_DEFAULT_CATEGORY || 'Geral';

  const parser = new Parser();
  const authHeader = buildAuthHeader();
  const res = await fetch(url, {
    headers: authHeader ? { Authorization: authHeader } : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FreshRSS error ${res.status}: ${text}`);
  }

  const xml = await res.text();
  const feed = await parser.parseString(xml);
  const items = feed.items || [];

  let created = 0;
  let skipped = 0;

  for (const item of items.slice(0, limit)) {
    if (!item.title) {
      skipped += 1;
      continue;
    }

    if (await itemExists(item)) {
      skipped += 1;
      continue;
    }

    const summary = item.contentSnippet || item.content || item.title;
    const content = item.content || item.contentSnippet || item.title;

    await prisma.news.create({
      data: {
        title: item.title,
        summary,
        content,
        category,
        sourceUrl: item.link || null,
        publishedAt: toDate(item.isoDate),
      },
    });

    created += 1;
  }

  console.log(`FreshRSS sync complete. fetched=${items.length} created=${created} skipped=${skipped}`);
}

main()
  .catch((error) => {
    console.error('FreshRSS sync failed:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
