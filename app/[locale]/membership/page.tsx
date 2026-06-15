/**
 * /[locale]/membership — Annual Farm Pass page.
 *
 * Server component. Env-gated: renders empty state (404-equivalent) unless
 * MEMBERSHIP_LIVE=true. Mirrors the Skein page pattern.
 *
 * Failsafe: renders null (empty state) if MEMBERSHIP_LIVE is not set.
 * Checkout 503 if STRIPE_SECRET_KEY or STRIPE_MEMBERSHIP_PRICE_ID unset.
 */

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Locale } from '@/i18n.config'
import { MEMBERSHIP_LIVE, MEMBERSHIP_PRICE_EUR } from '@/lib/config'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Annual Farm Pass | Alpacas Ibiza',
    description:
      'Unlimited visits to Alpacas Ibiza for a full year. One pass — every visit included.',
  }
}

export default async function MembershipPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  if (!MEMBERSHIP_LIVE) {
    notFound()
  }

  const { locale } = await params
  const checkoutHref = `/api/membership-checkout?locale=${locale}`

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="w-full py-20 px-4 bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Annual Farm Pass
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            One pass. Every visit. Unlimited access to the alpacas for an entire year.
          </p>
        </div>
      </section>

      {/* ── What's included ───────────────────────────────────────────────── */}
      <section className="w-full py-16 px-4 bg-background">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-10">
            What's included
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(
              [
                {
                  icon: '🎫',
                  title: 'Unlimited visits',
                  body: 'Come as often as you like for 12 months. Bring the family every weekend.',
                },
                {
                  icon: '🦙',
                  title: 'Full farm access',
                  body: 'Meet the herd, feed the alpacas, and explore the weaving studio on every visit.',
                },
                {
                  icon: '💌',
                  title: 'Member updates',
                  body: 'Receive seasonal newsletters with behind-the-scenes stories from the farm.',
                },
              ] as const
            ).map(({ icon, title, body }) => (
              <div key={title} className="bg-card rounded-lg border border-border p-6 text-center">
                <div className="text-4xl mb-3">{icon}</div>
                <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing card + CTA ───────────────────────────────────────────── */}
      <section id="cta" className="w-full py-16 px-4 bg-primary/5">
        <div className="max-w-md mx-auto">
          <div className="bg-card rounded-xl border-2 border-primary p-8 text-center shadow-md">
            <div className="text-5xl mb-4">🎫</div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Annual Farm Pass</h2>
            <p className="text-3xl font-bold text-primary mb-1">
              {`€${MEMBERSHIP_PRICE_EUR}`}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              for a year of unlimited visits
            </p>
            {/* POST form (not a GET <Link>): /api/membership-checkout is POST-only
                and 303-redirects to Stripe. A GET link returned 405. */}
            <form action={checkoutHref} method="POST">
              <button
                type="submit"
                className="block w-full px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold text-base transition-colors text-center"
              >
                Get your pass
              </button>
            </form>
          </div>
          <p className="mt-4 text-sm text-muted-foreground text-center">
            Secure checkout via Stripe. Pass activates immediately on purchase.
          </p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="w-full py-16 px-4 bg-background">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">
            Questions
          </h2>
          <div className="space-y-4">
            {(
              [
                {
                  q: 'How does the pass work?',
                  a: 'After purchase you receive a confirmation email. Show it at the farm gate on arrival — no booking required.',
                },
                {
                  q: 'Can I share the pass?',
                  a: 'The pass is for one named adult. Children under 12 accompanying the pass holder visit free.',
                },
                {
                  q: 'When does my year start?',
                  a: 'The 12-month period starts on your purchase date.',
                },
              ] as const
            ).map(({ q, a }) => (
              <div key={q} className="bg-card rounded-lg border border-border p-5">
                <p className="font-semibold text-foreground mb-1">{q}</p>
                <p className="text-sm text-muted-foreground">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
