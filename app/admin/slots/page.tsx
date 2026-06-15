import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { SlotManager } from '@/components/admin/slot-manager'

/**
 * Admin → tour slots (spec-011 §F). Session-gated; noindex via admin layout.
 * The owner creates/closes bookable slots here. The customer booking page reads
 * the open ones.
 */
export const dynamic = 'force-dynamic'

export default async function AdminSlotsPage() {
  const session = await getServerSession(auth)
  if (!session) redirect('/admin/login')

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold">Tour slots</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Add the dates, times, capacity and price for your in-house tour bookings. Open slots appear on
        the booking page; close a slot to stop taking new bookings without deleting it.
      </p>
      <SlotManager />
    </div>
  )
}
