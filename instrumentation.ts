// Next.js instrumentation hook - runs once when the server starts.
// This is the correct place to start the cron scheduler in production
// instead of relying on the first webhook request.

export async function register() {
  // Only run on the Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NODE_ENV === 'production') {
    const { startScheduler } = await import('@/lib/scheduler');
    startScheduler();
    console.info('[instrumentation] Scheduler initialized on server boot');
  }
}
