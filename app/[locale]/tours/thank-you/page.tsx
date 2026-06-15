import Link from 'next/link'
import type { Locale } from '@/i18n.config'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

/**
 * Booking checkout success landing (spec-011 §F). The vendor (Mollie/Stripe)
 * redirects here after payment via the success_url set in booking-payment.ts.
 * The seat is confirmed asynchronously by the webhook — this page is the guest's
 * "we got it" screen; the authoritative receipt is the confirmation email.
 */
export const dynamic = 'force-dynamic'

export default async function BookingThankYouPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<{ booking?: string }>
}) {
  const { locale } = await params
  const { booking } = await searchParams

  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
      <Card className="w-full p-8">
        <div className="mb-4 text-5xl">🦙</div>
        <h1 className="mb-2 text-2xl font-bold">Thank you — you&apos;re booked!</h1>
        <p className="text-muted-foreground">
          Your payment went through and your tour is reserved. A confirmation with the date, time and
          directions is on its way to your inbox.
        </p>
        {booking && (
          <p className="mt-4 text-xs text-muted-foreground">
            Booking reference: <span className="font-mono">{booking}</span>
          </p>
        )}
        <div className="mt-8">
          <Button asChild>
            <Link href={`/${locale}`}>Back to home</Link>
          </Button>
        </div>
      </Card>
    </main>
  )
}
