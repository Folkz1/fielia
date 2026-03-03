import { prisma } from '@/lib/prisma';
import { evolutionAPI } from '@/lib/evolution-api';
import { getCuratedNews } from '@/lib/bot/services/news.service';

function getNumberFromJid(jid: string) {
  return jid.includes('@') ? jid.split('@')[0] : jid;
}

function buildPublicNewsUrl(id: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  if (!base) return `/news/${id}`;
  return `${base}/news/${id}`;
}

function buildGoUrl(slug: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  if (!base) return `/go/${slug}?src=newsletter`;
  return `${base}/go/${slug}?src=newsletter`;
}

async function getNewsletterAffiliate() {
  try {
    return await prisma.affiliate.findFirst({
      where: { isActive: true, showInNewsletter: true },
      select: { slug: true, name: true, ctaText: true, ctaDescription: true, disclaimer: true },
      orderBy: { createdAt: 'asc' },
    });
  } catch {
    return null;
  }
}

async function buildNewsletterMessage(items: { id: string; title: string; summary: string }[]) {
  const header = '📰 *Newsletter Fiel*';
  if (items.length === 0) {
    return `${header}\n\nSem novidades agora. Em breve mais notícias do Timão!`;
  }

  const lines = items.map((item, index) => {
    const summary = item.summary ? item.summary.trim() : '';
    const url = buildPublicNewsUrl(item.id);
    return `*${index + 1}. ${item.title}*\n${summary}\n${url}`;
  });

  let text = `${header}\n\n${lines.join('\n\n')}`;

  // Append affiliate CTA if active
  const affiliate = await getNewsletterAffiliate();
  if (affiliate) {
    const goUrl = buildGoUrl(affiliate.slug);
    text += `\n\n---\n${affiliate.ctaDescription || affiliate.name}\n${affiliate.ctaText}: ${goUrl}`;
    if (affiliate.disclaimer) {
      text += `\n_${affiliate.disclaimer}_`;
    }
  }

  return text;
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
  const message = await buildNewsletterMessage(news);

  const now = new Date();
  const users = await prisma.user.findMany({
    where: {
      isPremium: true,
      whatsappId: { not: null },
      OR: [{ subscriptionEnd: null }, { subscriptionEnd: { gt: now } }],
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
