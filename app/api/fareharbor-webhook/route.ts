import { NextResponse } from 'next/server'
import { sendEmail, cancelScheduledEmail } from '@/lib/mailer'
import { safeEqual } from '@/lib/secrets'
import { escapeHtml } from '@/lib/html'
import { bookingScheduleStore } from '@/lib/booking-schedule-store'
import {
    reminderEmailHtml,
    reminderSubject,
    reviewRequestEmailHtml,
    reviewRequestSubject,
} from '@/lib/email-templates'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'
import { isAlreadyProcessed, markProcessed } from '@/lib/webhook-idempotency'

/**
 * POST /api/fareharbor-webhook
 *
 * Single entry point for FareHarbor booking events. Schedules future emails via
 * Resend `scheduledAt` (see docs/adr/001-resend-scheduled-sends.md).
 *
 * Events handled:
 *  - booking.created  → schedule reminder (start - 48h) + review (end + 24h)
 *  - booking.updated  → cancel existing schedules, re-schedule with new times
 *  - booking.cancelled → cancel existing schedules
 *
 * Auth: shared secret via header `x-webhook-secret` matches FAREHARBOR_WEBHOOK_SECRET.
 * If FareHarbor later provides HMAC signing, upgrade the check here — the route
 * already reads body once so raw body is available for signature verification.
 */

const REMINDER_LEAD_MS = 48 * 60 * 60 * 1000 // 48h before start
const REVIEW_LAG_MS = 24 * 60 * 60 * 1000 // 24h after end

interface FareHarborBooking {
    pk: number | string
    contact?: { name?: string; email?: string }
    customer_count?: number
    availability?: {
        start_at?: string
        end_at?: string
        item?: { name?: string }
    }
}

interface WebhookBody {
    event?: string
    booking?: FareHarborBooking
    // Some FareHarbor flavours wrap differently — accept both
    pk?: number | string
    contact?: { name?: string; email?: string }
    availability?: FareHarborBooking['availability']
}

function extractBooking(body: WebhookBody): FareHarborBooking | null {
    if (body.booking?.pk) return body.booking
    if (body.pk) {
        return {
            pk: body.pk,
            contact: body.contact,
            availability: body.availability,
        }
    }
    return null
}

export async function POST(request: Request) {
    const reqId = getRequestId(request)
    const log = makeRequestLogger('fareharbor-webhook', reqId)

    const expected = process.env.FAREHARBOR_WEBHOOK_SECRET
    if (!expected) {
        // Refuse traffic if operator hasn't set the secret — prevents accidental
        // open webhook in production.
        return attachRequestId(
            NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 }),
            reqId
        )
    }
    const got = request.headers.get('x-webhook-secret')
    if (!safeEqual(got, expected)) {
        return attachRequestId(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), reqId)
    }

    let body: WebhookBody
    try {
        body = (await request.json()) as WebhookBody
    } catch {
        return attachRequestId(NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }), reqId)
    }

    const event = (body.event ?? 'booking.created').toLowerCase()
    const booking = extractBooking(body)
    if (!booking) {
        return attachRequestId(NextResponse.json({ error: 'Missing booking data' }, { status: 400 }), reqId)
    }

    const pk = booking.pk
    const email = booking.contact?.email?.trim()
    const rawName = booking.contact?.name || 'there'
    const rawTourName = booking.availability?.item?.name || 'your visit'
    const startAt = booking.availability?.start_at
    const endAt = booking.availability?.end_at || startAt
    const locale = (request.headers.get('x-fareharbor-locale') || 'en').toLowerCase()

    // ─── booking.cancelled ────────────────────────────────────────────────
    // Idempotency: FareHarbor can re-deliver the same cancel event on retry.
    // Without the dedup gate, store.delete fires twice (harmless on missing-key
    // but pollutes the operational logs) and cancelScheduledEmail re-runs
    // (Resend no-ops on already-cancelled IDs but the API call still costs).
    if (event === 'booking.cancelled' || event === 'booking.deleted') {
        const cancelDedup = `fh:cancelled:${pk}`
        if (isAlreadyProcessed(cancelDedup)) {
            return attachRequestId(NextResponse.json({ ok: true, action: 'cancelled', idempotent: true }), reqId)
        }
        try {
            const existing = await bookingScheduleStore.get(pk)
            if (existing) {
                if (existing.reminderEmailId) await cancelScheduledEmail(existing.reminderEmailId)
                if (existing.reviewEmailId) await cancelScheduledEmail(existing.reviewEmailId)
                await bookingScheduleStore.delete(pk)
            }
            markProcessed(cancelDedup)
            return attachRequestId(NextResponse.json({ ok: true, action: 'cancelled' }), reqId)
        } catch (err) {
            // Fail-quiet: a store/mailer throw must NOT 500 (would trigger FareHarbor
            // retry → re-cancel-emails forever). Log loudly so ops see the breakage.
            log.error('cancel handler failed; returning 200 to stop FareHarbor retry', { err: String(err), pk })
            return attachRequestId(NextResponse.json({ ok: true, action: 'cancelled', degraded: true }), reqId)
        }
    }

    // For created / updated we need an email + start_at
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        return attachRequestId(NextResponse.json({ error: 'Invalid or missing customer email' }, { status: 400 }), reqId)
    }
    if (!startAt) {
        return attachRequestId(NextResponse.json({ error: 'Missing availability.start_at' }, { status: 400 }), reqId)
    }

    // Idempotency gate. Dedup key includes startAt so a legitimate "updated to a
    // NEW startAt" delivery is treated as a fresh event (different key) — re-
    // scheduling is desired. Re-delivery of the SAME event (same pk, same
    // startAt) hits the cache and short-circuits.
    const scheduleDedup = `fh:${event}:${pk}:${startAt}`
    if (isAlreadyProcessed(scheduleDedup)) {
        return attachRequestId(
            NextResponse.json({ ok: true, action: event, idempotent: true, bookingPk: pk }),
            reqId,
        )
    }

    // ─── booking.updated: cancel any prior schedules before rescheduling ──
    if (event === 'booking.updated' || event === 'booking.modified') {
        try {
            const existing = await bookingScheduleStore.get(pk)
            if (existing) {
                if (existing.reminderEmailId) await cancelScheduledEmail(existing.reminderEmailId)
                if (existing.reviewEmailId) await cancelScheduledEmail(existing.reviewEmailId)
            }
        } catch (err) {
            // Don't 500 on store-read or cancel-API failure — that would cause
            // FareHarbor to retry the update, queueing yet another reminder +
            // review email on top of the unhealthy state.
            log.warn('pre-update cancel of prior schedules failed; continuing with reschedule', { err: String(err), pk })
        }
    }

    const startMs = new Date(startAt).getTime()
    const endMs = endAt ? new Date(endAt).getTime() : startMs + 60 * 60 * 1000
    const reminderAt = new Date(startMs - REMINDER_LEAD_MS)
    const reviewAt = new Date(endMs + REVIEW_LAG_MS)

    const now = Date.now()
    const name = escapeHtml(rawName)
    const tourName = escapeHtml(rawTourName)
    const dateStr = new Date(startAt).toLocaleString(locale, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })

    let reminderEmailId: string | null = null
    let reviewEmailId: string | null = null

    // Only schedule the reminder if it's still in the future
    if (reminderAt.getTime() > now) {
        try {
            const { id } = await sendEmail({
                to: email,
                subject: reminderSubject(locale),
                html: reminderEmailHtml({
                    escapedName: name,
                    escapedTourName: tourName,
                    dateStr,
                    locale,
                }),
                scheduledAt: reminderAt.toISOString(),
                replyTo: process.env.CONTACT_EMAIL || 'info@alpacasibiza.com',
            })
            reminderEmailId = id
        } catch (err) {
            log.error('schedule reminder failed', { err: String(err) })
        }
    }

    if (reviewAt.getTime() > now) {
        try {
            const { id } = await sendEmail({
                to: email,
                subject: reviewRequestSubject(locale),
                html: reviewRequestEmailHtml({
                    escapedName: name,
                    escapedTourName: tourName,
                }),
                scheduledAt: reviewAt.toISOString(),
                replyTo: process.env.CONTACT_EMAIL || 'info@alpacasibiza.com',
            })
            reviewEmailId = id
        } catch (err) {
            log.error('schedule review-request failed', { err: String(err) })
        }
    }

    try {
        await bookingScheduleStore.set({
            bookingPk: pk,
            reminderEmailId,
            reviewEmailId,
            startAt,
            customerEmail: email,
        })
    } catch (err) {
        // Emails are already scheduled at Resend by this point. Persisting the
        // schedule IDs to our store is best-effort — if it fails, the booking
        // is unchanged from the donor's POV but we've lost the handle for a
        // future cancel/update. Log loudly; do NOT 500 (FareHarbor retry would
        // re-schedule duplicate emails on top of the existing ones).
        log.error('bookingScheduleStore.set failed; emails already scheduled at Resend, store handle lost', { err: String(err), pk, reminderEmailId, reviewEmailId })
    }

    // Mark processed AFTER emails are scheduled + store written (best-effort).
    // A re-delivery of the same (pk, startAt) tuple now short-circuits at the
    // top of the route. If FareHarbor genuinely changes the startAt for this
    // booking (real reschedule), the booking.updated path uses a different key
    // and runs the full reschedule flow.
    markProcessed(scheduleDedup)

    return attachRequestId(
        NextResponse.json({
            ok: true,
            action: event,
            bookingPk: pk,
            reminder: { scheduledFor: reminderAt.toISOString(), id: reminderEmailId },
            review: { scheduledFor: reviewAt.toISOString(), id: reviewEmailId },
        }),
        reqId
    )
}
