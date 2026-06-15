/**
 * /[locale]/membership/thank-you — Annual Farm Pass success page.
 *
 * Landing page for the membership-checkout success_url (Stripe redirect).
 * Server component. Generic confirmation only — no order data is fabricated;
 * the real receipt is emailed by Stripe. Mirrors the Skein thank-you pattern.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import type { Locale } from '@/i18n.config'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Welcome to the farm | Annual Farm Pass',
    description: 'Your Annual Farm Pass is confirmed.',
    robots: { index: false, follow: false },
  }
}

export default async function MembershipThankYouPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = await params

  return (
    <section className="w-full py-24 px-4 bg-gradient-to-br from-primary/10 to-accent/10 min-h-[60vh] flex items-center">
      <div className="max-w-xl mx-auto text-center">
        <div className="text-5xl mb-6" aria-hidden="true">🎫</div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Welcome to the farm
        </h1>
        <p className="text-lg text-muted-foreground mb-3">
          Your Annual Farm Pass is confirmed. A receipt and your pass details are
          on their way to your inbox.
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          Show your confirmation email at the gate on arrival — no booking needed.
          Your year of unlimited visits starts today.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/${locale}/visit`}
            className="inline-block px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold text-sm transition-colors"
          >
            Plan your visit
          </Link>
          <Link
            href={`/${locale}/alpacas`}
            className="inline-block px-6 py-3 border border-border text-foreground hover:bg-primary/5 rounded-lg font-bold text-sm transition-colors"
          >
            Meet the herd
          </Link>
        </div>
      </div>
    </section>
  )
}
