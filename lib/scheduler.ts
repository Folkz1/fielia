import cron from 'node-cron';
import { syncNewsFromFreshRSS } from '@/lib/news/sync';
import { runNewsCuration } from '@/lib/news/curation';
import { sendNewsletterToPremiumUsers } from '@/lib/news/newsletter';
import { generateWeeklyQuizIfMissing } from '@/lib/quiz/generator';
import { generateDailyPodcast } from '@/lib/podcast/daily';
import {
  isFunnelEnabled,
  isManualContentSendEnabled,
  processDueFunnelMessages,
  processDueManualContentMessages,
} from '@/lib/funnel/queue';

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
  const recurringCronEnabled = isEnabled();
  const manualContentEnabled = isManualContentSendEnabled();

  if (started || (!recurringCronEnabled && !manualContentEnabled) || process.env.NODE_ENV !== 'production') {
    return;
  }

  started = true;
  log('starting internal scheduler');

  const syncSchedule = process.env.CRON_NEWS_SYNC_SCHEDULE || '0 */6 * * *';
  const curateSchedule = process.env.CRON_NEWS_CURATION_SCHEDULE || '30 7 * * *';
  const podcastSchedule = process.env.CRON_PODCAST_SCHEDULE || '0 8 * * *';
  const newsletterSchedule = process.env.CRON_NEWSLETTER_SCHEDULE || '0 9 * * *';
  const quizSchedule = process.env.CRON_WEEKLY_QUIZ_SCHEDULE || '0 8 * * 1';
  const funnelSchedule = process.env.CRON_WHATSAPP_FUNNEL_SCHEDULE || '* * * * *';
  const manualContentSchedule = process.env.CRON_MANUAL_CONTENT_SEND_SCHEDULE || '* * * * *';

  if (recurringCronEnabled) {
    cron.schedule(syncSchedule, () => runTaskSafe('news sync', syncNewsFromFreshRSS));
    cron.schedule(curateSchedule, () => runTaskSafe('news curation', runNewsCuration));
    cron.schedule(podcastSchedule, () => runTaskSafe('daily podcast', generateDailyPodcast));
    cron.schedule(newsletterSchedule, () =>
      runTaskSafe('newsletter', sendNewsletterToPremiumUsers)
    );
    cron.schedule(quizSchedule, () =>
      runTaskSafe('weekly quiz generation', generateWeeklyQuizIfMissing)
    );
  }

  if (recurringCronEnabled && isFunnelEnabled()) {
    cron.schedule(funnelSchedule, () =>
      runTaskSafe('whatsapp funnel queue', processDueFunnelMessages)
    );
  }

  if (manualContentEnabled) {
    cron.schedule(manualContentSchedule, () =>
      runTaskSafe('manual content whatsapp queue', processDueManualContentMessages)
    );
  }

  log(`recurring cron enabled: ${recurringCronEnabled}`);
  if (recurringCronEnabled) {
    log(`sync schedule: ${syncSchedule}`);
    log(`curation schedule: ${curateSchedule}`);
    log(`podcast schedule: ${podcastSchedule}`);
    log(`newsletter schedule: ${newsletterSchedule}`);
    log(`weekly quiz schedule: ${quizSchedule}`);
  }
  log(`whatsapp funnel enabled: ${isFunnelEnabled()}`);
  if (recurringCronEnabled && isFunnelEnabled()) log(`whatsapp funnel schedule: ${funnelSchedule}`);
  log(`manual content whatsapp enabled: ${manualContentEnabled}`);
  if (manualContentEnabled) log(`manual content whatsapp schedule: ${manualContentSchedule}`);
}
