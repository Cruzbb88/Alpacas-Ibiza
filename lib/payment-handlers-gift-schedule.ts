/**
 * Gift-adoption scheduling helper.
 *
 * Decides whether a welcome email should fire immediately (no gift, or
 * gift_send_date is in the past / today) or be deferred (gift_send_date
 * is in the future).
 *
 * Returns a discriminated union the caller can switch on.
 *
 * NOTE: actual deferred delivery lives in /api/adopt-deferred-gifts (a
 * daily cron). The Resend SDK also supports scheduledAt natively — if the
 * caller uses Resend, they can pass scheduledAt directly and skip the cron
 * path. Use whichever fits.
 */

const GIFT_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export interface GiftMetadata {
  gift_send_date?: string | null  // YYYY-MM-DD
  gift_recipient_email?: string | null
  gift_recipient_name?: string | null
  gift_sender_name?: string | null
  gift_message?: string | null
}

export type GiftScheduleDecision =
  | { kind: 'send-now'; reason: 'no-gift' | 'today' | 'past' | 'invalid-date' }
  | { kind: 'defer'; sendAt: string /* ISO datetime */; recipient: string }
  | { kind: 'send-now-no-recipient'; reason: 'missing-recipient-email' }

export function decideGiftSchedule(
  metadata: GiftMetadata | undefined | null,
  now: Date = new Date(),
): GiftScheduleDecision {
  const sendDate = metadata?.gift_send_date?.trim() ?? ''
  const recipient = metadata?.gift_recipient_email?.trim() ?? ''

  if (!sendDate) return { kind: 'send-now', reason: 'no-gift' }
  if (!GIFT_DATE_RE.test(sendDate)) return { kind: 'send-now', reason: 'invalid-date' }
  if (!recipient) return { kind: 'send-now-no-recipient', reason: 'missing-recipient-email' }

  // Parse as 09:00 UTC of the target date
  const targetMs = Date.parse(`${sendDate}T09:00:00Z`)
  if (!Number.isFinite(targetMs)) return { kind: 'send-now', reason: 'invalid-date' }

  if (targetMs <= now.getTime()) {
    return { kind: 'send-now', reason: 'past' }
  }

  return {
    kind: 'defer',
    sendAt: new Date(targetMs).toISOString(),
    recipient,
  }
}
