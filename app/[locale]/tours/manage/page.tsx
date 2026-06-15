import Link from 'next/link'
import type { Locale } from '@/i18n.config'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { verifyBookingManageToken } from '@/lib/booking-manage-token'
import { getBooking, getSlot, getOpenSlots } from '@/lib/booking/store'
import { seatsLeft } from '@/lib/booking/store-logic'
import { formatSlotLocal } from '@/lib/booking/format-slot'
import { BookingCancelButton } from '@/components/booking/booking-cancel-button'
import { BookingRescheduleControl } from '@/components/booking/booking-reschedule-control'

/**
 * Guest booking manage-link (spec-011 §J). Token-gated, no account: the link in
 * the confirmation/reminder email carries an HMAC token scoped to this bookingId.
 * Without a valid token the page reveals NOTHING (IDOR-safe). View-only for now;
 * cancel/reschedule actions land next (spec-011 §J).
 */
export const dynamic = 'force-dynamic'

// Page-scoped no-referrer: the manage token rides in the query string, and the
// global Referrer-Policy (strict-origin-when-cross-origin) would send the FULL
// URL — token included — in the Referer header on same-origin navigation (e.g.
// "Back to home"). Scope it here so the token never leaks into logs/analytics,
// without weakening referrer behavior site-wide. (security-review 2026-06-15)
export const metadata = { referrer: 'no-referrer' as const }

function NotValid({ locale }: { locale: string }) {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
      <Card className="w-full p-8">
        <h1 className="mb-2 text-xl font-bold">This link isn&apos;t valid</h1>
        <p className="text-muted-foreground">
          The link may have expired or be incomplete. Check the most recent email for your booking, or
          reply to it and we&apos;ll help.
        </p>
        <div className="mt-6">
          <Button asChild><Link href={`/${locale}`}>Back to home</Link></Button>
        </div>
      </Card>
    </main>
  )
}

export default async function ManageBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ id?: string; token?: string }>
}) {
  const { locale } = await params
  const { id, token } = await searchParams

  if (!id || !token || !verifyBookingManageToken(token, id)) return <NotValid locale={locale} />

  const booking = await getBooking(id)
  if (!booking) return <NotValid locale={locale} />
  const slot = booking.slotId ? await getSlot(booking.slotId) : null

  const when = slot ? formatSlotLocal(slot.startsAt, { locale }) : null
  const statusLabel =
    booking.status === 'confirmed' ? 'Confirmed'
    : booking.status === 'pending' ? 'Awaiting payment'
    : 'Cancelled'

  const hoursUntil = slot ? (slot.startsAt.getTime() - Date.now()) / 3_600_000 : -1
  const canCancel = booking.status !== 'cancelled'
  const refundable = booking.status === 'confirmed' && hoursUntil >= 24

  // Alternative open slots for the same tour: must fit the party AND not cost more
  // than was paid (matches the reschedule route's no-upcharge policy).
  const rescheduleOptions =
    slot && booking.status !== 'cancelled'
      ? (await getOpenSlots(slot.tourSlug, { start: new Date(), end: new Date(Date.now() + 90 * 86_400_000) }))
          .filter((s) => s.id !== slot.id && seatsLeft(s) >= booking.partySize && s.priceEurMinor * booking.partySize <= booking.amountEurMinor)
          .map((s) => {
            const w = formatSlotLocal(s.startsAt, { locale })
            return { id: s.id, label: `${w.date} · ${w.time} · €${(s.priceEurMinor / 100).toFixed(2)}/guest` }
          })
      : []

  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <h1 className="mb-1 text-2xl font-bold">Your booking</h1>
      <p className="mb-6 text-sm text-muted-foreground">Reference <span className="font-mono">{booking.id}</span></p>
      <Card className="space-y-3 p-6">
        <Row label="Status" value={statusLabel} />
        {when && <Row label="Date" value={when.date} />}
        {when && <Row label="Time" value={`${when.time} (Ibiza time)`} />}
        <Row label="Guests" value={String(booking.partySize)} />
        <Row label="Total" value={`€${(booking.amountEurMinor / 100).toFixed(2)}`} />
      </Card>
      {canCancel && (
        <div className="mt-6 space-y-2">
          <p className="text-sm text-muted-foreground">
            {refundable
              ? 'Free cancellation — you’re more than 24h out.'
              : 'Within 24h of the tour, cancellations are non-refundable.'}
          </p>
          <BookingCancelButton id={booking.id} token={token} refundable={refundable} />
        </div>
      )}
      {rescheduleOptions.length > 0 && (
        <div className="mt-6 space-y-2">
          <p className="text-sm font-medium">Move to another date</p>
          <BookingRescheduleControl id={booking.id} token={token} options={rescheduleOptions} />
        </div>
      )}
      <p className="mt-6 text-sm text-muted-foreground">
        Questions? Reply to your booking email and we&apos;ll help.
      </p>
    </main>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
