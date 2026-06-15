import type { Locale } from '@/i18n.config'
import { listOpenSlots } from '@/lib/booking/store'
import { seatsLeft } from '@/lib/booking/store-logic'
import { SlotPicker, type PickerSlot } from '@/components/booking/slot-picker'

/**
 * Customer booking page (spec-011 §F) for the in-house engine. Reads the OPEN
 * slots the owner created and renders the picker → reserve → checkout flow.
 *
 * Fail-closed: when BOOKING_ENGINE isn't 'inhouse' or DATABASE_URL is unset,
 * listOpenSlots returns [] and the picker shows "no dates open" — the existing
 * FareHarbor tour page (../) stays the live booking path until the owner flips
 * the flag and seeds slots.
 */
export const dynamic = 'force-dynamic'

export default async function BookTourPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params

  const now = new Date()
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
  const slots = await listOpenSlots({ start: now, end: in90Days })

  const pickerSlots: PickerSlot[] = slots
    .map((s) => ({
      id: s.id,
      startsAt: s.startsAt.toISOString(),
      durationMin: s.durationMin,
      seatsLeft: seatsLeft(s),
      priceEurMinor: s.priceEurMinor,
    }))
    .filter((s) => s.seatsLeft > 0)

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold">Book your alpaca tour</h1>
      <p className="mb-8 text-muted-foreground">
        Choose a date and time, tell us how many are coming, and pay securely. You&apos;ll get a
        confirmation by email.
      </p>
      <SlotPicker slots={pickerSlots} locale={locale} />
    </main>
  )
}
