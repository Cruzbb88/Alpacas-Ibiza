/**
 * Shared gift-field parser for checkout routes.
 *
 * Both /api/checkout (Stripe) and /api/mollie-checkout (Mollie) accept the
 * same gift_* form fields and apply the same validation rules. Drift between
 * the two routes is a payment-correctness risk: a stricter validator on one
 * processor would silently accept gifts on the other that fail downstream.
 *
 * Returns ParsedGiftFields when ALL required fields validate; returns null to
 * signal "drop the entire gift block" (the buyer becomes the donor instead of
 * a gifter). Per-route adapters convert to processor-specific metadata shapes.
 *
 * Validation rules:
 *   - recipientEmail: must pass isValidEmail
 *   - recipientName: must be non-empty
 *   - message: ≥ 2 chars after trim (the shortest meaningful gift greeting,
 *     covers "xx", "💚", "❤️"). Empty would render as empty quote marks.
 *   - sendDate: optional. When present must be ISO yyyy-mm-dd AND within
 *     Resend's 30-day scheduledAt cap (a date >30 days would be silently
 *     rejected and the recipient would never get the email). Outside the
 *     window → dropped to undefined ("send today").
 *
 * Stripe metadata caps each value at 500 chars; we cap incoming strings to
 * the same limit so both processors stay within their respective limits.
 */
import { isValidEmail } from './validate-email.ts'

/** ISO yyyy-mm-dd date pattern. */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Stripe / Mollie metadata values are capped at 500 chars each. */
export function capAt500(s: string): string {
  return s.slice(0, 500)
}

export interface ParsedGiftFields {
  recipientEmail: string
  recipientName: string
  senderName: string
  message: string
  /** ISO yyyy-mm-dd string. Absent when unset, invalid, or out of Resend window. */
  sendDate?: string
}

export interface ParseGiftOptions {
  /** Override Date.now() for deterministic tests. */
  now?: () => number
}

/**
 * Parse + validate the raw gift_* fields. See file header for rules.
 *
 * @param raw       Flat map of gift_* string fields (from URLSearchParams or JSON body).
 * @param opts      Optional time override for tests.
 * @returns         ParsedGiftFields when valid, null when ANY required field fails.
 */
export function parseGiftFields(
  raw: Record<string, string | null | undefined>,
  opts: ParseGiftOptions = {},
): ParsedGiftFields | null {
  const recipientEmail = (raw.gift_recipient_email ?? '').trim()
  const recipientName = (raw.gift_recipient_name ?? '').trim()
  const senderName = (raw.gift_sender_name ?? '').trim()
  const message = capAt500((raw.gift_message ?? '').trim())
  const sendDate = (raw.gift_send_date ?? '').trim()

  if (!isValidEmail(recipientEmail)) return null
  if (recipientName.length === 0) return null
  if (message.length < 2) return null

  let validSendDate: string | undefined
  if (sendDate && ISO_DATE_RE.test(sendDate)) {
    const parsed = new Date(`${sendDate}T00:00:00Z`)
    const now = (opts.now ?? Date.now)()
    const maxSchedule = now + 30 * 24 * 60 * 60 * 1000
    const minSchedule = now - 24 * 60 * 60 * 1000 // allow same-day even if buyer's clock skewed
    if (
      !Number.isNaN(parsed.getTime()) &&
      parsed.getTime() <= maxSchedule &&
      parsed.getTime() >= minSchedule
    ) {
      validSendDate = sendDate
    }
  }

  return {
    recipientEmail: capAt500(recipientEmail),
    recipientName: capAt500(recipientName),
    senderName: capAt500(senderName),
    message,
    ...(validSendDate ? { sendDate: validSendDate } : {}),
  }
}
