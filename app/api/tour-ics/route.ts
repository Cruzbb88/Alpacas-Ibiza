/**
 * GET /api/tour-ics
 *
 * Serves an RFC 5545 .ics file for a FareHarbor tour booking confirmation.
 * Used by the /[locale]/tour-confirmation page "Download .ics" button.
 *
 * Query params (all optional; degrade gracefully when absent):
 *   - date      : ISO 8601 date/datetime for the tour start
 *   - summary   : human-readable event title (defaults to "Alpaca tour at Es Currals")
 *   - duration  : duration in minutes (defaults to 60, max 480)
 *   - bookingId : FareHarbor booking reference for stable UID (optional)
 *
 * Failsafe: invalid/missing date → 400. All other param errors → graceful defaults.
 *
 * Rate-limit: 20 req / 5 min per IP (same pattern as calendar/renewal route).
 * No auth required — the ICS contains no PII beyond what the caller supplies in the URL.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { buildIcs, TOUR_ICS_DEFAULTS } from '@/lib/ics'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const { summary: DEFAULT_SUMMARY, durationMin: DEFAULT_DURATION_MIN, location: LOCATION,
  organizerEmail: ORGANIZER_EMAIL, organizerName: ORGANIZER_NAME } = TOUR_ICS_DEFAULTS

export async function GET(request: Request) {
  // Rate limit: 20 reads per IP per 5 minutes.
  const ip = getClientIp(request)
  const rl = rateLimit({ key: `tour-ics:${ip}`, limit: 20, windowMs: 5 * 60 * 1000 })
  if (!rl.allowed) {
    return NextResponse.json(
      { code: 'RATE_LIMITED' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } },
    )
  }

  const { searchParams } = new URL(request.url)
  const rawDate = searchParams.get('date')
  const rawSummary = searchParams.get('summary')
  const rawDuration = searchParams.get('duration')
  const rawBookingId = searchParams.get('bookingId')

  // Validate date — required for a useful ICS file.
  if (!rawDate) {
    return NextResponse.json({ code: 'DATE_REQUIRED' }, { status: 400 })
  }

  let startIso: string
  let endIso: string
  try {
    const start = new Date(rawDate)
    if (isNaN(start.getTime())) {
      return NextResponse.json({ code: 'INVALID_DATE' }, { status: 400 })
    }
    // parseInt returns NaN for non-numeric input; isNaN guard keeps DEFAULT_DURATION_MIN
    // for NaN while still allowing parseInt('0', 10) = 0 to pass through (clamped to 1
    // by Math.max). The previous `|| DEFAULT_DURATION_MIN` falsy check incorrectly
    // treated 0 as "missing" and returned 60 instead of letting Math.max(1, 0) clamp it.
    const parsedDuration = rawDuration !== null ? parseInt(rawDuration, 10) : NaN
    const durationMin = rawDuration !== null
      ? Math.min(480, Math.max(1, isNaN(parsedDuration) ? DEFAULT_DURATION_MIN : parsedDuration))
      : DEFAULT_DURATION_MIN
    startIso = start.toISOString()
    endIso = new Date(start.getTime() + durationMin * 60 * 1000).toISOString()
  } catch {
    return NextResponse.json({ code: 'INVALID_DATE' }, { status: 400 })
  }

  // Sanitise optional params.
  const summary = rawSummary ? rawSummary.replace(/[\r\n]/g, ' ').slice(0, 200) : DEFAULT_SUMMARY
  const bookingId = rawBookingId ? rawBookingId.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60) : null
  const uid = bookingId
    ? `tour-${bookingId}@alpacasibiza.com`
    : `tour-${startIso.replace(/[^0-9T]/g, '').slice(0, 15)}@alpacasibiza.com`

  const ics = buildIcs({
    uid,
    summary,
    description: `Your tour booking at Es Currals Alpacas Ibiza. Questions? Email ${ORGANIZER_EMAIL}`,
    startIso,
    endIso,
    location: LOCATION,
    organizerEmail: ORGANIZER_EMAIL,
    organizerName: ORGANIZER_NAME,
  })

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="alpaca-tour.ics"',
      'Cache-Control': 'no-store',
    },
  })
}
