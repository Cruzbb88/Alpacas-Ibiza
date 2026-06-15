'use client'

/**
 * Customer booking slot picker (spec-011 §F). Renders the OPEN slots the owner
 * created, lets a guest pick one + party size, then runs the money-path:
 *   POST /api/booking/reserve  → holds the seats, returns a bookingId
 *   POST /api/booking/checkout → creates the vendor checkout, returns a URL
 *   redirect to that URL (Mollie/Stripe hosted page, per PAYMENT_VENDOR)
 *
 * No prices/times are invented — every slot shown comes from the DB.
 */
import { useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface PickerSlot {
  id: string
  startsAt: string // ISO UTC
  durationMin: number
  seatsLeft: number
  priceEurMinor: number
}

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Europe/Madrid',
    weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  })

export function SlotPicker({ slots, locale }: { slots: PickerSlot[]; locale: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [partySize, setPartySize] = useState(2)
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Stable per-attempt key so a retry after a dropped response reuses the SAME
  // hold instead of making a second one (spec-011 §I). Reset on any change of
  // selection/party — that's a different booking.
  const idemKey = useRef<string | null>(null)
  const newAttempt = () => { idemKey.current = null }

  const selected = slots.find((s) => s.id === selectedId) ?? null
  const maxParty = selected ? Math.min(selected.seatsLeft, 50) : 1

  const book = async () => {
    if (!selected) return
    // Client-side guard: without a valid email the booking confirms but the
    // guest silently gets no confirmation email — stop them before a hold is used.
    if (!guestName.trim()) {
      setError('Please enter your name for the confirmation email.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) {
      setError('Please enter a valid email — your confirmation is sent there.')
      return
    }
    if (!agreed) {
      setError('Please confirm you’ve read and agree to the visit terms.')
      return
    }
    setBusy(true)
    setError(null)
    if (!idemKey.current) idemKey.current = crypto.randomUUID()
    try {
      const reserve = await fetch('/api/booking/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: selected.id, partySize, guestName, guestEmail, locale,
          idempotencyKey: idemKey.current,
        }),
        signal: AbortSignal.timeout(12_000), // don't spin forever on a hung server
      })
      const rData = await reserve.json().catch(() => ({}))
      if (!reserve.ok || !rData.ok) {
        throw new Error(
          rData.reason === 'sold_out'
            ? 'That time just filled up — please pick another.'
            : rData.reason === 'unavailable'
              ? 'Booking is not available right now.'
              : 'Could not hold those seats. Please try again.',
        )
      }
      const checkout = await fetch('/api/booking/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: rData.bookingId, locale }),
        signal: AbortSignal.timeout(12_000),
      })
      const cData = await checkout.json().catch(() => ({}))
      if (!checkout.ok || !cData.url) throw new Error('Could not start checkout. Please try again.')
      window.location.href = cData.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setBusy(false)
    }
  }

  if (slots.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          No dates are open for booking right now — please check back soon.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {slots.map((s) => {
          const active = s.id === selectedId
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => { setSelectedId(s.id); setPartySize((p) => Math.min(p, s.seatsLeft) || 1); newAttempt() }}
              className={`rounded-lg border p-4 text-left transition ${active ? 'border-primary ring-2 ring-primary' : 'hover:border-primary/50'}`}
            >
              <div className="font-medium">{fmtWhen(s.startsAt)}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {s.durationMin} min · €{(s.priceEurMinor / 100).toFixed(2)}/guest · {s.seatsLeft} seat{s.seatsLeft === 1 ? '' : 's'} left
              </div>
            </button>
          )
        })}
      </div>

      {selected && (
        <Card className="space-y-4 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="partySize">Guests</Label>
              <Input
                id="partySize" type="number" min={1} max={maxParty} value={partySize}
                onChange={(e) => { setPartySize(Math.max(1, Math.min(maxParty, Number(e.target.value) || 1))); newAttempt() }}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="guestName">Name</Label>
              <Input id="guestName" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="guestEmail">Email (for your confirmation)</Label>
              <Input id="guestEmail" type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I’ve read and agree to the{' '}
              <a href={`/${locale}/terms`} target="_blank" rel="noopener noreferrer" className="underline">
                visit terms
              </a>{' '}
              — a working farm with animals; visitors attend at their own risk and follow staff guidance.
            </span>
          </label>

          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">
              Total €{((selected.priceEurMinor * partySize) / 100).toFixed(2)}
            </div>
            <Button onClick={book} disabled={busy}>
              {busy ? 'Starting checkout…' : 'Book & pay'}
            </Button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </Card>
      )}
    </div>
  )
}
