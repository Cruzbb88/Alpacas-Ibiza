/**
 * POST /api/booking/reserve
 *
 * Holds seats on an in-house tour slot and creates a `pending` booking
 * (cb-006 F1/F6). The actual seat-capacity decrement is a single atomic
 * conditional UPDATE inside reserveSlot() — two concurrent reserves can never
 * oversell. This route is the thin HTTP shell: validate input, rate-limit,
 * delegate.
 *
 * Body: { slotId: string, partySize: number, guestName?, guestEmail? }
 * 200  { ok: true, bookingId, holdMinutes }   — seats held, proceed to checkout
 * 409  { ok: false, reason: 'sold_out' }       — not enough capacity left
 * 400  { ok: false, reason: 'bad_request' }    — malformed body
 * 503  { ok: false, reason: 'unavailable' }    — engine off / no DATABASE_URL
 * 429  { ok: false, reason: 'rate_limited' }
 *
 * Fail-closed: when BOOKING_ENGINE!=='inhouse' OR DATABASE_URL is unset, returns
 * 503 'unavailable' rather than fabricating a hold (mirrors getOpenSlots → []).
 * The seat is NOT charged here — payment happens in a later step against the
 * returned bookingId; an unpaid hold is reaped by /api/booking-cleanup.
 */
import { NextResponse } from 'next/server'
import { reserveSlot } from '@/lib/booking/store'
import { isValidEmail } from '@/lib/validate-email'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { makeRequestLogger } from '@/lib/request-id'

export const dynamic = 'force-dynamic'

/** Mirror of DEFAULT_HOLD_MS in lib/booking/store.ts, surfaced to the client. */
const HOLD_MINUTES = 20

/** Hard ceiling on a single party so a typo can't hold out a whole slot. */
const MAX_PARTY_SIZE = 50

export async function POST(request: Request) {
  const log = makeRequestLogger('booking-reserve', 'route')

  // Engine gate — fail-closed. reserveSlot() is also fail-closed on getDb(),
  // but returning 503 early avoids parsing/rate-limiting work when off.
  if (process.env.BOOKING_ENGINE !== 'inhouse') {
    return NextResponse.json({ ok: false, reason: 'unavailable' }, { status: 503 })
  }

  // Per-IP rate limit — booking is a write path; cap abusive hold-spamming.
  const ip = getClientIp(request)
  const rl = rateLimit({ key: `booking-reserve:${ip}`, limit: 10, windowMs: 5 * 60_000 })
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, reason: 'rate_limited' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } },
    )
  }

  // ── Parse + validate ────────────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, reason: 'bad_request' }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const slotId = typeof b.slotId === 'string' ? b.slotId.trim() : ''
  const partySize = typeof b.partySize === 'number' ? b.partySize : Number(b.partySize)

  if (
    !slotId ||
    !Number.isInteger(partySize) ||
    partySize < 1 ||
    partySize > MAX_PARTY_SIZE
  ) {
    return NextResponse.json({ ok: false, reason: 'bad_request' }, { status: 400 })
  }

  // Guest contact is optional at hold time (collected fully at checkout); when
  // present, an invalid email is dropped rather than 400-ing the whole hold.
  const guestName = typeof b.guestName === 'string' ? b.guestName.slice(0, 200) : null
  const rawEmail = typeof b.guestEmail === 'string' ? b.guestEmail.trim() : ''
  // Lowercased so it matches the GDPR-erasure lookup (case-insensitive identity).
  const guestEmail = rawEmail && isValidEmail(rawEmail) ? rawEmail.toLowerCase() : null

  // Optional client dedupe key — a retried POST with the same key returns the
  // same hold instead of a duplicate (spec-011 §I). Bounded length; ignored if
  // junk so a bad value never blocks a booking.
  const rawKey = typeof b.idempotencyKey === 'string' ? b.idempotencyKey.trim() : ''
  const idempotencyKey = rawKey && rawKey.length <= 100 ? rawKey : null

  // Guest locale for confirmation/reminder/review email language (allowlisted).
  const rawLoc = typeof b.locale === 'string' ? b.locale : ''
  const locale = ['en', 'nl', 'es', 'de', 'it', 'fr'].includes(rawLoc) ? rawLoc : null

  // ── Reserve ──────────────────────────────────────────────────────────────
  const result = await reserveSlot({ slotId, partySize, guestName, guestEmail, idempotencyKey, locale })

  if (!result.ok) {
    if (result.reason === 'sold_out') {
      log.info('[booking-reserve] refused — sold out', { slotId, partySize }) // gd-027
      return NextResponse.json({ ok: false, reason: 'sold_out' }, { status: 409 })
    }
    if (result.reason === 'bad_request') {
      return NextResponse.json({ ok: false, reason: 'bad_request' }, { status: 400 })
    }
    // 'unavailable' — DB went away between the gate check and the call.
    return NextResponse.json({ ok: false, reason: 'unavailable' }, { status: 503 })
  }

  log.info('[booking-reserve] hold created', { bookingId: result.bookingId, partySize })
  return NextResponse.json(
    { ok: true, bookingId: result.bookingId, holdMinutes: HOLD_MINUTES },
    { status: 200 },
  )
}
