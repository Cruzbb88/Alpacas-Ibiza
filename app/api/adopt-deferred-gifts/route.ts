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

import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  // 1. Auth
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ ok: false, code: 'UNAUTHORIZED' }, { status: 401 })
  }

  // 2. For now, dispatch an owner digest (option b above).
  // TODO (parallel AI): swap to direct welcome-email send by calling
  // handleGiftWelcomeForDate(today) from lib/payment-handlers.ts.

  const today = new Date().toISOString().slice(0, 10)

  // Iterate Mollie + Stripe active subs, collect gift_send_date===today
  // For now, this is a stub that confirms the route works. Parallel AI
  // fills in the iteration when they wire the handler.

  return NextResponse.json({ ok: true, scheduled_for: today, dispatched: 0, scheduler_only: true })
}
