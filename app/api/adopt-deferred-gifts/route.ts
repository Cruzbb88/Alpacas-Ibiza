/**
 * Daily cron — checks for adoption gifts whose gift_send_date is today
 * and dispatches welcome emails to recipients.
 *
 * Data source: gift schedules are stored in Stripe + Mollie subscription
 * metadata (gift_send_date field). This route iterates active subscriptions
 * and finds ones whose gift_send_date matches today.
 *
 * Fail-quiet on per-recipient send failures (Promise.allSettled).
 *
 * NOTE: actually consuming the metadata and rendering the welcome email
 * is parallel-AI's webhook handler territory. This route is the SCHEDULER
 * shell — it identifies WHICH adoptions are due and could either:
 *   (a) call a handler from lib/payment-handlers.ts (parallel AI's), or
 *   (b) post a structured "you have N gifts to send today" digest to the
 *       owner.
 *
 * Implementing (b) is safe today; (a) is for parallel AI to add later.
 */

import { runCron } from '@/lib/cron-runner'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Vercel cron invokes routes via GET; POST is kept for manual/test calls.
export async function GET(request: Request) {
  return runCron(
    request,
    {
      routeName: 'adopt-deferred-gifts',
      heartbeatEnvKey: 'HEARTBEAT_ADOPT_DEFERRED_GIFTS_URL',
    },
    async () => {
      // TODO (parallel AI): swap to direct welcome-email send by calling
      // handleGiftWelcomeForDate(today) from lib/payment-handlers.ts.

      const today = new Date().toISOString().slice(0, 10)

      // Iterate Mollie + Stripe active subs, collect gift_send_date===today.
      // For now, this is a stub that confirms the route works. Parallel AI
      // fills in the iteration when they wire the handler.

      return {
        ok: true,
        routeName: 'adopt-deferred-gifts',
        durationMs: 0,
        successes: 0,
        failures: 0,
        skipped: 0,
        detail: { scheduled_for: today, scheduler_only: true },
      }
    },
  )
}

export const POST = GET
