/**
 * Pure helper logic for the FareHarbor webhook event router.
 *
 * These functions are extracted from app/api/fareharbor-webhook/route.ts so
 * they can be unit-tested without importing Next.js or any mailer side-effects.
 *
 * All exports marked @internal are exported only for testing — consumers should
 * use the route handler directly.
 */

import { isValidEmail } from './validate-email.ts'

export const REMINDER_LEAD_MS = 48 * 60 * 60 * 1000 // 48h before start
export const REVIEW_LAG_MS = 24 * 60 * 60 * 1000 // 24h after end

export interface FareHarborBooking {
    pk: number | string
    contact?: { name?: string; email?: string }
    customer_count?: number
    availability?: {
        start_at?: string
        end_at?: string
        item?: { name?: string }
    }
}

export interface WebhookBody {
    event?: string
    booking?: FareHarborBooking
    // Some FareHarbor flavours wrap differently — accept both
    pk?: number | string
    contact?: { name?: string; email?: string }
    availability?: FareHarborBooking['availability']
}

/**
 * Extract the booking object from either of FareHarbor's two payload shapes:
 *   Shape A: { event, booking: { pk, contact, availability } }
 *   Shape B: { event, pk, contact, availability }  (flat)
 *
 * Returns null if no usable pk is present.
 *
 * pk is accepted as `number | string` (FareHarbor uses both). Empty string
 * and undefined/null are treated as "missing". 0 is a valid pk (though
 * unlikely in practice) and is preserved.
 *
 * @internal exported for tests
 */
function hasPk(v: unknown): v is number | string {
    if (v == null) return false
    if (typeof v === 'string') return v.length > 0
    if (typeof v === 'number') return !Number.isNaN(v)
    return false
}

export function extractBooking(body: WebhookBody): FareHarborBooking | null {
    if (body.booking != null && hasPk(body.booking.pk)) return body.booking
    if (hasPk(body.pk)) {
        return {
            pk: body.pk as number | string,
            contact: body.contact,
            availability: body.availability,
        }
    }
    return null
}

export interface ScheduleWindows {
    reminderAt: Date
    reviewAt: Date
}

/**
 * Compute the absolute dates at which the reminder and review emails should
 * be sent, given a tour's start and end times.
 *
 * Pure function — no Date.now() inside, `now` is passed in for testability.
 *
 * @internal exported for tests
 */
export function computeScheduleWindows(
    startAt: string,
    endAt: string | undefined,
    now: number,
): {
    reminderAt: Date
    reviewAt: Date
    scheduleReminder: boolean
    scheduleReview: boolean
} {
    const startMs = new Date(startAt).getTime()
    const endMs = endAt ? new Date(endAt).getTime() : startMs + 60 * 60 * 1000
    const reminderAt = new Date(startMs - REMINDER_LEAD_MS)
    const reviewAt = new Date(endMs + REVIEW_LAG_MS)

    return {
        reminderAt,
        reviewAt,
        scheduleReminder: reminderAt.getTime() > now,
        scheduleReview: reviewAt.getTime() > now,
    }
}

/**
 * Validate that a booking has the fields required for the created/updated path
 * (the cancelled path skips these checks).
 *
 * Returns null if valid, or an error string if invalid.
 *
 * @internal exported for tests
 */
export function validateBookingForScheduling(
    booking: FareHarborBooking,
): string | null {
    const email = booking.contact?.email
    if (!isValidEmail(email)) {
        return 'Invalid or missing customer email'
    }
    if (!booking.availability?.start_at) {
        return 'Missing availability.start_at'
    }
    return null
}
