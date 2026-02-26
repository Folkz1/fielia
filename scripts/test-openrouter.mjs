#!/usr/bin/env node
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const apiKey = process.env.OPENROUTER_API_KEY;
const model = process.env.OPENROUTER_MODEL || 'x-ai/grok-4.1-fast';

async function main() {
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY ausente no .env');
  }

  console.log(`[1/1] Testando OpenRouter: model=${model}`);

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || '',
      'X-Title': 'FielIA OpenRouter Test',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'Return exactly: OK' },
        { role: 'user', content: 'Ping' },
      ],
      temperature: 0,
      max_tokens: 10,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} -> ${text}`);
  }

  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  const content = data?.choices?.[0]?.message?.content;
  console.log(`OK: ${String(content || '').trim() || '(sem content)'}`);
}

main().catch((error) => {
  console.error('\nFalha no teste OpenRouter:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

