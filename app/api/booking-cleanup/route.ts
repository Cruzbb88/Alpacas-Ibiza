/**
 * GET/POST /api/booking-cleanup   (Authorization: Bearer <CRON_SECRET>)
 *
 * Vercel cron — releases in-house booking holds whose `holdExpiresAt` has passed
 * (cb-006 F1: a pending hold that never paid must free its seats so the slot can
 * be re-sold). Each expired hold is cancelled via cancelBooking() inside the
 * store, which restores capacity atomically + exactly once.
 *
 * Activation: only does work when BOOKING_ENGINE=inhouse AND DATABASE_URL is set
 * — releaseExpiredHolds() is fail-closed (returns 0 when getDb() is null), so on
 * a site that hasn't provisioned Postgres this route is a no-op 200. Safe to add
 * to vercel.json crons before the DB exists.
 *
 * Auth + duration + 500-on-throw retry come from the shared runCron wrapper, the
 * same as every other cron route (see lib/cron-runner.ts).
 */
import { runCron, type CronRunResult } from '@/lib/cron-runner'
import { releaseExpiredHolds } from '@/lib/booking/store'
import { makeRequestLogger } from '@/lib/request-id'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return runCron(request, { routeName: 'booking-cleanup' }, async () => {
    const log = makeRequestLogger('booking-cleanup', 'runner')

    // Only active when BOOKING_ENGINE=inhouse; releaseExpiredHolds is itself
    // fail-closed on DATABASE_URL, so this guard is belt-and-braces (keeps the
    // route a true no-op while the FareHarbor engine is still the default).
    if (process.env.BOOKING_ENGINE !== 'inhouse') {
      return {
        ok: true,
        routeName: 'booking-cleanup',
        durationMs: 0,
        successes: 0,
        failures: 0,
        skipped: 0,
        detail: { released: 0, inactive: true },
      } satisfies CronRunResult
    }

    const released = await releaseExpiredHolds()
    log.info('[booking-cleanup] expired holds released', { released })

    return {
      ok: true,
      routeName: 'booking-cleanup',
      durationMs: 0,
      successes: released,
      failures: 0,
      skipped: 0,
      detail: { released, inactive: false },
    } satisfies CronRunResult
  })
}

export const POST = GET
