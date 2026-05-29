/**
 * Regression tests for gift-fields.ts shipped in commit 1561178.
 *
 * Pins the validation rules that protect:
 *   - Empty gift message → empty quote marks in welcome email (UX bug)
 *   - Resend scheduledAt > 30 days → silent drop (recipient never gets email)
 *   - Buyer clock skew (sendDate slightly in the past) → still works same-day
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseGiftFields } from './gift-fields.ts'

const VALID_RAW = {
  gift_recipient_email: 'recipient@example.com',
  gift_recipient_name: 'Alex',
  gift_sender_name: 'Cruz',
  gift_message: 'Happy birthday!',
}

describe('parseGiftFields — required fields', () => {
  it('returns parsed shape when every required field is valid', () => {
    const out = parseGiftFields(VALID_RAW)
    assert.ok(out, 'expected non-null result')
    assert.equal(out!.recipientEmail, 'recipient@example.com')
    assert.equal(out!.recipientName, 'Alex')
    assert.equal(out!.senderName, 'Cruz')
    assert.equal(out!.message, 'Happy birthday!')
    assert.equal(out!.sendDate, undefined)
  })

  it('returns null when recipient email is missing', () => {
    assert.equal(parseGiftFields({ ...VALID_RAW, gift_recipient_email: '' }), null)
  })

  it('returns null when recipient email is malformed', () => {
    assert.equal(parseGiftFields({ ...VALID_RAW, gift_recipient_email: 'not-an-email' }), null)
  })

  it('returns null when recipient name is empty after trim', () => {
    assert.equal(parseGiftFields({ ...VALID_RAW, gift_recipient_name: '   ' }), null)
  })

  it('accepts the empty senderName (it is optional)', () => {
    const out = parseGiftFields({ ...VALID_RAW, gift_sender_name: '' })
    assert.ok(out)
    assert.equal(out!.senderName, '')
  })
})

describe('parseGiftFields — message length boundary', () => {
  it('accepts empty message (simplified gift_name/email/deliver form has no message field)', () => {
    const out = parseGiftFields({ ...VALID_RAW, gift_message: '' })
    assert.ok(out)
    assert.equal(out!.message, '')
  })

  it('rejects 1-char message (when provided must be substantive)', () => {
    assert.equal(parseGiftFields({ ...VALID_RAW, gift_message: 'x' }), null)
  })

  it('accepts whitespace-only message (trim collapses to 0 chars, treated as no-message)', () => {
    const out = parseGiftFields({ ...VALID_RAW, gift_message: '   ' })
    assert.ok(out)
    assert.equal(out!.message, '')
  })

  it('accepts EXACTLY 2-char message ("xx")', () => {
    const out = parseGiftFields({ ...VALID_RAW, gift_message: 'xx' })
    assert.ok(out)
    assert.equal(out!.message, 'xx')
  })

  it('accepts a single 🎁 emoji (length 2 as JS UTF-16 string)', () => {
    const out = parseGiftFields({ ...VALID_RAW, gift_message: '🎁' })
    assert.ok(out, '🎁 has .length === 2 — must pass the >= 2 check')
  })

  it('caps message at 500 chars (Stripe metadata limit)', () => {
    const longMsg = 'a'.repeat(800)
    const out = parseGiftFields({ ...VALID_RAW, gift_message: longMsg })
    assert.ok(out)
    assert.equal(out!.message.length, 500)
  })
})

describe('parseGiftFields — sendDate validation (Resend 30-day cap)', () => {
  // Pin "now" to 2026-05-29T12:00:00Z for deterministic boundary math.
  const NOW = Date.UTC(2026, 4, 29, 12, 0, 0)
  const opts = { now: () => NOW }

  it('absent sendDate → no sendDate in output', () => {
    const out = parseGiftFields(VALID_RAW, opts)
    assert.equal(out!.sendDate, undefined)
  })

  it('today (2026-05-29) → keeps sendDate', () => {
    const out = parseGiftFields({ ...VALID_RAW, gift_send_date: '2026-05-29' }, opts)
    assert.equal(out!.sendDate, '2026-05-29')
  })

  it('day before today (2026-05-28 00:00 UTC) → drops (36h past, beyond 24h skew window)', () => {
    // With NOW = 2026-05-29 12:00 UTC, the 24h skew window covers
    // [2026-05-28 12:00 UTC, future]. Parsed '2026-05-28' lands at 00:00 UTC,
    // which is 36 hours past the now anchor — outside the skew window.
    const out = parseGiftFields({ ...VALID_RAW, gift_send_date: '2026-05-28' }, opts)
    assert.ok(out)
    assert.equal(out!.sendDate, undefined)
  })

  it('29 days in the future → keeps (within 30-day cap)', () => {
    // 2026-05-29 + 29 days = 2026-06-27
    const out = parseGiftFields({ ...VALID_RAW, gift_send_date: '2026-06-27' }, opts)
    assert.equal(out!.sendDate, '2026-06-27')
  })

  it('31 days in the future → drops sendDate (past Resend cap)', () => {
    // 2026-05-29 + 31 days = 2026-06-29
    const out = parseGiftFields({ ...VALID_RAW, gift_send_date: '2026-06-29' }, opts)
    assert.equal(out!.sendDate, undefined)
  })

  it('malformed ISO date → drops sendDate without rejecting whole gift', () => {
    const out = parseGiftFields({ ...VALID_RAW, gift_send_date: '5/29/2026' }, opts)
    assert.ok(out)
    assert.equal(out!.sendDate, undefined)
  })

  it('completely garbage sendDate → drops sendDate, keeps gift', () => {
    const out = parseGiftFields({ ...VALID_RAW, gift_send_date: 'tomorrow-ish' }, opts)
    assert.ok(out)
    assert.equal(out!.sendDate, undefined)
  })
})
