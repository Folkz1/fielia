import cron from 'node-cron';
import { syncNewsFromFreshRSS } from '@/lib/news/sync';
import { runNewsCuration } from '@/lib/news/curation';
import { sendNewsletterToPremiumUsers } from '@/lib/news/newsletter';

let started = false;

function isEnabled() {
  return (process.env.CRON_ENABLED || 'true').toLowerCase() === 'true';
}

function log(message: string) {
  console.info(`[scheduler] ${message}`);
}

async function runTaskSafe(name: string, task: () => Promise<unknown>) {
  try {
    await task();
    log(`${name} completed`);
  } catch (error) {
    console.error(`[scheduler] ${name} failed:`, error);
  }
}

export function startScheduler() {
  if (started || !isEnabled() || process.env.NODE_ENV !== 'production') {
    return;
  }

  started = true;
  log('starting internal scheduler');

  const syncSchedule = process.env.CRON_NEWS_SYNC_SCHEDULE || '0 */6 * * *';
  const curateSchedule = process.env.CRON_NEWS_CURATION_SCHEDULE || '30 7 * * *';
  const newsletterSchedule = process.env.CRON_NEWSLETTER_SCHEDULE || '0 9 * * *';

  cron.schedule(syncSchedule, () => runTaskSafe('news sync', syncNewsFromFreshRSS));
  cron.schedule(curateSchedule, () => runTaskSafe('news curation', runNewsCuration));
  cron.schedule(newsletterSchedule, () =>
    runTaskSafe('newsletter', sendNewsletterToPremiumUsers)
  );

  log(`sync schedule: ${syncSchedule}`);
  log(`curation schedule: ${curateSchedule}`);
  log(`newsletter schedule: ${newsletterSchedule}`);
}
