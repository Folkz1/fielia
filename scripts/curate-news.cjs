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

function startOfDayUTC(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function callOpenRouter(lines) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENROUTER_API_KEY');
  }

  const model = process.env.OPENROUTER_CURATION_MODEL || process.env.OPENROUTER_MODEL;
  if (!model) {
    throw new Error('Missing OPENROUTER_MODEL or OPENROUTER_CURATION_MODEL');
  }
  const system = [
    'Você é um editor esportivo do Corinthians.',
    'Escolha as notícias mais relevantes para a torcida hoje.',
    'Priorize contratações, jogos, lesões e decisões importantes.',
    'Retorne JSON estrito no formato {"top_ids":["id1","id2","id3"]}.',
    'Retorne exatamente 3 ids se possível.',
  ].join('\n');

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || '',
      'X-Title': 'FielIA News Curation',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: lines.join('\n') },
      ],
      temperature: 0.2,
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content || '';
}

async function main() {
  const limit = Math.max(parseInt(process.env.NEWS_CURATION_LIMIT || '3', 10) || 3, 1);
  const windowHours = Math.max(parseInt(process.env.NEWS_CURATION_WINDOW_HOURS || '48', 10) || 48, 1);
  const useAI = (process.env.NEWS_CURATION_USE_AI || 'true').toLowerCase() === 'true';

  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);
  const recent = await prisma.news.findMany({
    where: { publishedAt: { gte: since } },
    orderBy: { publishedAt: 'desc' },
    take: Math.max(30, limit * 12),
    select: { id: true, title: true, summary: true, publishedAt: true, sourceUrl: true },
  });

  if (!recent.length) {
    console.log('No recent news to curate.');
    return;
  }

  let topIds = recent.slice(0, limit).map((item) => item.id);

  if (useAI) {
    const lines = recent.map((item, index) => {
      const summary = (item.summary || '').slice(0, 160).replace(/\s+/g, ' ');
      return `${index + 1}. [${item.id}] ${item.title} — ${summary}`;
    });

    const content = await callOpenRouter(lines);
    const parsed = extractJson(content);
    if (parsed?.top_ids && Array.isArray(parsed.top_ids)) {
      const valid = parsed.top_ids
        .map((id) => String(id))
        .filter((id) => recent.some((item) => item.id === id));
      if (valid.length) {
        topIds = valid.slice(0, limit);
      }
    }
  }

  if (topIds.length < limit) {
    const seen = new Set(topIds);
    for (const item of recent) {
      if (!seen.has(item.id)) {
        topIds.push(item.id);
        seen.add(item.id);
      }
      if (topIds.length >= limit) break;
    }
  }

  const today = startOfDayUTC(new Date());
  await prisma.newsCuration.upsert({
    where: { date: today },
    update: { topIds },
    create: { date: today, topIds },
  });

  console.log(`News curation complete. topIds=${topIds.join(',')}`);
}

main()
  .catch((error) => {
    console.error('News curation failed:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
