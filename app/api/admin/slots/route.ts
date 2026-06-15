import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { createSlot, listSlots, setSlotStatus } from '@/lib/booking/store'

/**
 * Admin slot management for the in-house booking engine (spec-011 §F).
 *   GET   → list every slot (all statuses)
 *   POST  → create a slot   { tourSlug, startsAt(ISO), durationMin, capacity, priceEur }
 *   PATCH → open/close a slot { slotId, status }
 *
 * Session-gated (401 without an admin session) like every other /api/admin route.
 * The owner's tour times/capacity/prices are typed in here — never invented.
 * 503 when the booking engine / DB isn't active (createSlot etc. fail-closed).
 */
async function requireAdmin() {
  const session = await getServerSession(auth)
  return Boolean(session)
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const slots = await listSlots()
  return NextResponse.json({ slots })
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const tourSlug = typeof body.tourSlug === 'string' ? body.tourSlug.trim() : ''
  const startsAtRaw = typeof body.startsAt === 'string' ? body.startsAt : ''
  const startsAt = startsAtRaw ? new Date(startsAtRaw) : null
  const durationMin = Number(body.durationMin)
  const capacity = Number(body.capacity)
  const priceEur = Number(body.priceEur)

  if (
    !tourSlug ||
    !startsAt || Number.isNaN(startsAt.getTime()) ||
    !Number.isInteger(durationMin) || durationMin < 1 ||
    !Number.isInteger(capacity) || capacity < 1 ||
    !Number.isFinite(priceEur) || priceEur < 0
  ) {
    return NextResponse.json({ error: 'Invalid slot fields' }, { status: 400 })
  }

  const id = await createSlot({
    tourSlug,
    startsAt,
    durationMin,
    capacity,
    priceEurMinor: Math.round(priceEur * 100),
  })
  if (!id) {
    return NextResponse.json({ error: 'Booking engine not active (no database)' }, { status: 503 })
  }
  return NextResponse.json({ ok: true, id })
}

export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const slotId = typeof body.slotId === 'string' ? body.slotId : ''
  const status = body.status === 'closed' ? 'closed' : body.status === 'open' ? 'open' : null
  if (!slotId || !status) {
    return NextResponse.json({ error: 'slotId and status (open|closed) required' }, { status: 400 })
  }
  const ok = await setSlotStatus(slotId, status)
  if (!ok) return NextResponse.json({ error: 'Slot not found or DB inactive' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
