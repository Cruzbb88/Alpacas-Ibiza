/**
 * Unit tests for the FareHarbor webhook event-router pure helpers.
 *
 * Pure functions — no mocking, no mailer side-effects, no Next.js.
 * Framework: node --test --experimental-strip-types (matches pnpm test script).
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
    extractBooking,
    computeScheduleWindows,
    validateBookingForScheduling,
    REMINDER_LEAD_MS,
    REVIEW_LAG_MS,
} from './webhook-router.ts'

// ─── 1. extractBooking ────────────────────────────────────────────────────────

describe('extractBooking', () => {
    it('returns booking object when body.booking.pk is present (Shape A)', () => {
        const body = {
            event: 'booking.created',
            booking: {
                pk: 123,
                contact: { name: 'Ana', email: 'ana@example.com' },
                availability: { start_at: '2026-07-01T10:00:00Z' },
            },
        }
        const result = extractBooking(body)
        assert.ok(result !== null)
        assert.equal(result!.pk, 123)
        assert.equal(result!.contact?.email, 'ana@example.com')
    })

    it('reconstructs booking from flat fields when body.pk is present (Shape B)', () => {
        const body = {
            event: 'booking.created',
            pk: 456,
            contact: { name: 'Ben', email: 'ben@example.com' },
            availability: { start_at: '2026-08-15T09:00:00Z' },
        }
        const result = extractBooking(body)
        assert.ok(result !== null)
        assert.equal(result!.pk, 456)
        assert.equal(result!.contact?.name, 'Ben')
        assert.equal(result!.availability?.start_at, '2026-08-15T09:00:00Z')
    })

    it('returns null when neither body.booking.pk nor body.pk is present', () => {
        const body = {
            event: 'booking.created',
            booking: { contact: { email: 'x@x.com' } },
        }
        const result = extractBooking(body as any)
        assert.equal(result, null)
    })

    it('returns null when body is empty object', () => {
        const result = extractBooking({})
        assert.equal(result, null)
    })

    it('string pk is accepted (pk can be number or string per the interface)', () => {
        const body = {
            booking: {
                pk: 'abc123',
                contact: { email: 'c@example.com' },
                availability: { start_at: '2026-09-01T12:00:00Z' },
            },
        }
        const result = extractBooking(body)
        assert.ok(result !== null)
        assert.equal(result!.pk, 'abc123')
    })

    /**
     * Regression — pk === 0 is preserved (previously this test documented a bug
     * where the truthy check `body.booking?.pk` dropped pk=0 silently). Fixed
     * 2026-05-26 by switching to an `hasPk()` helper that uses `!= null` +
     * type-narrowing. Empty-string pk still rejected.
     */
    it('preserves pk=0 in nested booking instead of falling through to flat pk', () => {
        const body = {
            event: 'booking.created',
            pk: 999,
            booking: {
                pk: 0,
                contact: { email: 'zero@example.com' },
                availability: { start_at: '2026-10-01T10:00:00Z' },
            },
        }
        const result = extractBooking(body)
        assert.ok(result !== null)
        assert.equal(result!.pk, 0, 'pk=0 must be preserved (it is a valid pk)')
    })

    it('preserves pk=0 in nested booking even with no flat fallback', () => {
        const body = {
            event: 'booking.created',
            booking: {
                pk: 0,
                contact: { email: 'zero@example.com' },
                availability: { start_at: '2026-10-01T10:00:00Z' },
            },
        }
        const result = extractBooking(body)
        assert.ok(result !== null)
        assert.equal(result!.pk, 0)
    })

    it('rejects empty string pk (treated as missing)', () => {
        const body = {
            booking: {
                pk: '',
                contact: { email: 'x@example.com' },
                availability: { start_at: '2026-10-01T10:00:00Z' },
            },
        }
        const result = extractBooking(body)
        assert.equal(result, null, 'empty-string pk is not a valid identifier')
    })
})

// ─── 2. validateBookingForScheduling ─────────────────────────────────────────

describe('validateBookingForScheduling', () => {
    const validBooking = {
        pk: 1,
        contact: { email: 'test@example.com' },
        availability: { start_at: '2026-07-01T10:00:00Z' },
    }

    it('returns null for a fully valid booking', () => {
        assert.equal(validateBookingForScheduling(validBooking), null)
    })

    it('returns error when contact.email is missing', () => {
        const booking = { pk: 1, availability: { start_at: '2026-07-01T10:00:00Z' } }
        const err = validateBookingForScheduling(booking)
        assert.ok(err !== null)
        assert.match(err!, /email/i)
    })

    it('returns error when contact.email is empty string', () => {
        const booking = { pk: 1, contact: { email: '' }, availability: { start_at: '2026-07-01T10:00:00Z' } }
        const err = validateBookingForScheduling(booking)
        assert.ok(err !== null)
        assert.match(err!, /email/i)
    })

    it('returns error when contact.email is not a valid address (no @)', () => {
        const booking = { pk: 1, contact: { email: 'notanemail' }, availability: { start_at: '2026-07-01T10:00:00Z' } }
        const err = validateBookingForScheduling(booking)
        assert.ok(err !== null)
        assert.match(err!, /email/i)
    })

    it('returns error when contact.email has no TLD (too short after dot)', () => {
        const booking = { pk: 1, contact: { email: 'a@b.c' }, availability: { start_at: '2026-07-01T10:00:00Z' } }
        // regex requires {2,} chars after last dot
        const err = validateBookingForScheduling(booking)
        assert.ok(err !== null, 'single-char TLD should fail')
    })

    it('returns error when availability.start_at is missing', () => {
        const booking = { pk: 1, contact: { email: 'a@example.com' }, availability: {} }
        const err = validateBookingForScheduling(booking)
        assert.ok(err !== null)
        assert.match(err!, /start_at/i)
    })

    it('returns error when availability is absent entirely', () => {
        const booking = { pk: 1, contact: { email: 'a@example.com' } }
        const err = validateBookingForScheduling(booking)
        assert.ok(err !== null)
        assert.match(err!, /start_at/i)
    })

    it('trims whitespace from email before validating', () => {
        const booking = {
            pk: 1,
            contact: { email: '  a@example.com  ' },
            availability: { start_at: '2026-07-01T10:00:00Z' },
        }
        // After trim → 'a@example.com' → valid
        assert.equal(validateBookingForScheduling(booking), null)
    })
})

// ─── 3. computeScheduleWindows — timing decisions ────────────────────────────

describe('computeScheduleWindows', () => {
    // Fix a reference "now" so tests are deterministic
    const NOW_ISO = '2026-06-01T12:00:00.000Z'
    const now = new Date(NOW_ISO).getTime()

    const HOUR_MS = 60 * 60 * 1000
    const DAY_MS = 24 * HOUR_MS

    it('scheduleReminder=true when start is 72h from now (reminderAt=24h from now — future)', () => {
        // start = now + 72h, reminderAt = start - 48h = now + 24h → future → schedule
        const startAt = new Date(now + 72 * HOUR_MS).toISOString()
        const { scheduleReminder, reminderAt } = computeScheduleWindows(startAt, undefined, now)
        assert.equal(scheduleReminder, true)
        assert.ok(reminderAt.getTime() > now, 'reminderAt should be in the future')
    })

    it('scheduleReminder=false when start is in the past (reminderAt already passed)', () => {
        // start = now - 1h, reminderAt = start - 48h = now - 49h → past → skip
        const startAt = new Date(now - HOUR_MS).toISOString()
        const { scheduleReminder } = computeScheduleWindows(startAt, undefined, now)
        assert.equal(scheduleReminder, false)
    })

    it('scheduleReminder=false when start is exactly 47h from now (reminderAt 1h ago)', () => {
        // reminderAt = start - 48h = (now + 47h) - 48h = now - 1h → past → skip
        const startAt = new Date(now + 47 * HOUR_MS).toISOString()
        const { scheduleReminder } = computeScheduleWindows(startAt, undefined, now)
        assert.equal(scheduleReminder, false,
            'reminder window already passed when start is < 48h away')
    })

    it('scheduleReview=true when end is now + 1h (reviewAt = now + 25h — future)', () => {
        // end = now + 1h, reviewAt = end + 24h = now + 25h → future → schedule
        const startAt = new Date(now - HOUR_MS).toISOString()
        const endAt = new Date(now + HOUR_MS).toISOString()
        const { scheduleReview } = computeScheduleWindows(startAt, endAt, now)
        assert.equal(scheduleReview, true)
    })

    it('scheduleReview=false when end was > 24h ago (reviewAt already passed)', () => {
        // end = now - 25h, reviewAt = end + 24h = now - 1h → past → skip
        const startAt = new Date(now - 26 * HOUR_MS).toISOString()
        const endAt = new Date(now - 25 * HOUR_MS).toISOString()
        const { scheduleReview } = computeScheduleWindows(startAt, endAt, now)
        assert.equal(scheduleReview, false)
    })

    it('uses startMs + 1h as default endMs when endAt is undefined', () => {
        // If endAt is undefined, route passes undefined to computeScheduleWindows.
        // Default: endMs = startMs + 1h, so reviewAt = startMs + 1h + 24h.
        const startAt = new Date(now + HOUR_MS).toISOString()
        const { reviewAt } = computeScheduleWindows(startAt, undefined, now)
        const expectedReviewAt = new Date(now + HOUR_MS + HOUR_MS + REVIEW_LAG_MS)
        assert.equal(reviewAt.getTime(), expectedReviewAt.getTime())
    })

    it('reminderAt is exactly startMs - REMINDER_LEAD_MS', () => {
        const startAt = new Date(now + 10 * DAY_MS).toISOString()
        const startMs = new Date(startAt).getTime()
        const { reminderAt } = computeScheduleWindows(startAt, undefined, now)
        assert.equal(reminderAt.getTime(), startMs - REMINDER_LEAD_MS)
    })

    it('reviewAt is exactly endMs + REVIEW_LAG_MS', () => {
        const startAt = new Date(now + 5 * DAY_MS).toISOString()
        const endAt = new Date(now + 5 * DAY_MS + 2 * HOUR_MS).toISOString()
        const endMs = new Date(endAt).getTime()
        const { reviewAt } = computeScheduleWindows(startAt, endAt, now)
        assert.equal(reviewAt.getTime(), endMs + REVIEW_LAG_MS)
    })

    it('both scheduleReminder and scheduleReview are false for a booking far in the past', () => {
        const startAt = new Date(now - 10 * DAY_MS).toISOString()
        const endAt = new Date(now - 10 * DAY_MS + 2 * HOUR_MS).toISOString()
        const { scheduleReminder, scheduleReview } = computeScheduleWindows(startAt, endAt, now)
        assert.equal(scheduleReminder, false)
        assert.equal(scheduleReview, false)
    })

    it('both schedule flags are true for a booking far in the future', () => {
        const startAt = new Date(now + 30 * DAY_MS).toISOString()
        const endAt = new Date(now + 30 * DAY_MS + 2 * HOUR_MS).toISOString()
        const { scheduleReminder, scheduleReview } = computeScheduleWindows(startAt, endAt, now)
        assert.equal(scheduleReminder, true)
        assert.equal(scheduleReview, true)
    })
})
