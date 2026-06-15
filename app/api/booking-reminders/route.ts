/**
 * GET/POST /api/booking-reminders   (Authorization: Bearer <CRON_SECRET>)
 *
 * In-house-engine post-booking comms (competitor-standard — Rezdy/Xola/FareHarbor):
 *   - ~24h before the tour → pre-tour reminder email (cuts no-shows)
 *   - ~few hours after the tour → review-request email (drives reviews)
 *
 * Reuses the SAME email builders the FareHarbor reminder/review routes use
 * (lib/email-templates.ts) — this just repoints them at in-house bookings. Each
 * send is stamped (reminder_sent_at / review_requested_at) so a cron re-run never
 * double-sends. Per-recipient Promise.allSettled → one bad send never drops the
 * batch; always returns 200 so Vercel cron doesn't retry-spam.
 *
 * No-op (and fail-closed) unless BOOKING_ENGINE=inhouse + DATABASE_URL.
 */
import { runCron, type CronRunResult } from '@/lib/cron-runner'
import {
  listBookingsNeedingReminder,
  listBookingsNeedingReview,
  markReminderSent,
  markReviewRequested,
} from '@/lib/booking/store'
import {
  reminderEmailHtml, reminderSubject,
  reviewRequestEmailHtml, reviewRequestSubject,
} from '@/lib/email-templates'
import { formatSlotLocal } from '@/lib/booking/format-slot'
import { sendEmail } from '@/lib/mailer'
import { escapeHtml } from '@/lib/html'
import { getContactEmail } from '@/lib/validate-env'
import { makeRequestLogger } from '@/lib/request-id'
import { SITE_BASE_URL } from '@/lib/config'
import { signBookingManageToken } from '@/lib/booking-manage-token'
import { raceWithTimeout } from '@/lib/fetch'

export const dynamic = 'force-dynamic'

const titleCase = (slug: string) =>
  slug.split('-').filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

/** sendEmail bounded by a timeout so one hung Resend send can't stall the whole
 * allSettled batch (the mailer's retry has no per-attempt timeout). (gd-032) */
async function sendEmailWithTimeout(opts: Parameters<typeof sendEmail>[0], ms = 15_000) {
  const r = await raceWithTimeout(sendEmail(opts), ms)
  if (!r) throw new Error('sendEmail timeout')
  return r
}

export async function GET(request: Request) {
  return runCron(request, { routeName: 'booking-reminders' }, async () => {
    const log = makeRequestLogger('booking-reminders', 'runner')

    if (process.env.BOOKING_ENGINE !== 'inhouse') {
      return { ok: true, routeName: 'booking-reminders', durationMs: 0, successes: 0, failures: 0, skipped: 0 } satisfies CronRunResult
    }

    const now = new Date()
    const contactEmail = getContactEmail()
    const [reminders, reviews] = await Promise.all([
      listBookingsNeedingReminder(now),
      listBookingsNeedingReview(now),
    ])

    let reminded = 0
    let reviewed = 0
    let failures = 0

    // ── Pre-tour reminders ────────────────────────────────────────────────
    const reminderTasks = reminders.map(async (b) => {
      if (!b.guestEmail) return
      const locale = b.locale ?? 'en'
      const { date, time } = formatSlotLocal(b.startsAt, { locale })
      const manageUrl = `${SITE_BASE_URL}/${locale}/tours/manage?id=${encodeURIComponent(b.bookingId)}&token=${encodeURIComponent(signBookingManageToken(b.bookingId))}`
      try {
        await sendEmailWithTimeout({
          to: b.guestEmail,
          subject: reminderSubject(locale),
          html: reminderEmailHtml({
            escapedName: b.guestName ? escapeHtml(b.guestName) : 'there',
            escapedTourName: escapeHtml(titleCase(b.tourSlug)),
            dateStr: `${date} at ${time}`,
            locale,
            manageUrl,
          }),
          replyTo: contactEmail,
        })
        if (await markReminderSent(b.bookingId, now)) reminded++
      } catch (e) {
        failures++
        log.warn('[booking-reminders] reminder send failed', { bookingId: b.bookingId, error: e instanceof Error ? e.message : String(e) })
      }
    })

    // ── Post-tour review requests ─────────────────────────────────────────
    const reviewTasks = reviews.map(async (b) => {
      if (!b.guestEmail) return
      const locale = b.locale ?? 'en'
      try {
        await sendEmailWithTimeout({
          to: b.guestEmail,
          subject: reviewRequestSubject(locale),
          html: reviewRequestEmailHtml({
            escapedName: b.guestName ? escapeHtml(b.guestName) : 'there',
            escapedTourName: escapeHtml(titleCase(b.tourSlug)),
          }),
          replyTo: contactEmail,
        })
        if (await markReviewRequested(b.bookingId, now)) reviewed++
      } catch (e) {
        failures++
        log.warn('[booking-reminders] review send failed', { bookingId: b.bookingId, error: e instanceof Error ? e.message : String(e) })
      }
    })

    await Promise.allSettled([...reminderTasks, ...reviewTasks])
    log.info('[booking-reminders] done', { reminded, reviewed, failures })

    return {
      ok: true,
      routeName: 'booking-reminders',
      durationMs: 0,
      successes: reminded + reviewed,
      failures,
      skipped: 0,
      detail: { reminded, reviewed },
    } satisfies CronRunResult
  })
}

export const POST = GET
