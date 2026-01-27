import { prisma } from '@/lib/prisma';
import { evolutionAPI } from '@/lib/evolution-api';
import { getCuratedNews } from '@/lib/bot/services/news.service';

function getNumberFromJid(jid: string) {
  return jid.includes('@') ? jid.split('@')[0] : jid;
}

function buildNewsletterMessage(items: { title: string; summary: string; sourceUrl?: string | null }[]) {
  const header = '📰 *Newsletter Fiel*';
  if (items.length === 0) {
    return `${header}\n\nSem novidades agora. Em breve mais notícias do Timão!`;
  }

  const lines = items.map((item, index) => {
    const summary = item.summary ? item.summary.trim() : '';
    const url = item.sourceUrl ? `\n${item.sourceUrl}` : '';
    return `*${index + 1}. ${item.title}*\n${summary}${url}`;
  });

  return `${header}\n\n${lines.join('\n\n')}`;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendNewsletterToPremiumUsers() {
  const limit = Math.max(
    1,
    Number.parseInt(process.env.NEWSLETTER_NEWS_LIMIT || '3', 10) || 3
  );
  const delayMs = Math.max(
    0,
    Number.parseInt(process.env.NEWSLETTER_DELAY_MS || '750', 10) || 0
  );

  const news = await getCuratedNews(limit, 48);
  const message = buildNewsletterMessage(news);

  const users = await prisma.user.findMany({
    where: {
      isPremium: true,
      whatsappId: { not: null },
    },
    select: { id: true, whatsappId: true },
  });

  let sent = 0;
  const errors: { userId: string; error: string }[] = [];

  for (const user of users) {
    try {
      const number = getNumberFromJid(user.whatsappId || '');
      if (!number) continue;

      await evolutionAPI.sendTextMessage({
        number,
        text: message,
      });

      sent += 1;
      if (delayMs > 0) {
        await sleep(delayMs);
      }
    } catch (error) {
      errors.push({
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return { sent, totalPremium: users.length, errors };
}
