/**
 * /[locale]/herd-family — Monthly-tier dedicated landing page.
 *
 * Guardian Angel-style: the monthly adoption tier gets its own marketing
 * surface, distinct URL, and focused hero. Pattern source: Best Friends
 * Animal Society Guardian Angel (wave-1 /deep-research finding #11).
 *
 * Env-gated: renders notFound() (404) unless HERD_FAMILY_LIVE=true.
 * Price reads ADOPT_PRICE_MONTHLY_EUR from lib/config — NOT a new SKU.
 * Checkout reuses the existing monthly adopt flow (same URL the /adopt
 * page uses for its monthly CTA).
 *
 * Failsafe: notFound() when env var is absent/false (fail-quiet).
 */

import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Locale } from '@/i18n.config'
import { ADOPT_PRICE_MONTHLY_EUR, HERD_FAMILY_LIVE } from '@/lib/config'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import { toJsonLd, adoptAPacaServiceSchema } from '@/lib/structured-data'
import { getPaymentAdapter } from '@/lib/payment-vendor'
import { CampaignBannerGeneric } from '@/components/campaign-banner-generic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const { canonical, languages } = buildLocaleAlternates(locale, 'herd-family')
  return {
    title: 'Become a Herd Family Member | Alpacas Ibiza',
    description: `Support Ibiza's first alpaca farm with a monthly adoption. €${ADOPT_PRICE_MONTHLY_EUR}/month — cancel any time.`,
    alternates: { canonical, languages },
    openGraph: {
      title: 'Become a Herd Family Member | Alpacas Ibiza',
      description: `Join the herd every month. €${ADOPT_PRICE_MONTHLY_EUR}/month — includes farm tours, certificate, discount codes, and monthly alpaca updates.`,
      url: canonical,
    },
  }
}

export default async function HerdFamilyPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  // ── Env gate ────────────────────────────────────────────────────────────────
  if (!HERD_FAMILY_LIVE) {
    notFound()
  }

  const { locale } = await params
  const paymentAdapter = getPaymentAdapter()
  const monthlyUrl =
    paymentAdapter.buildAdoptCheckoutUrl('monthly') ??
    `mailto:info@alpacasibiza.com?subject=Herd%20Family%20adoption%20enquiry`

  return (
    <>
      {/* JSON-LD: Service + Offer (same schema as /adopt — monthly offer) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(adoptAPacaServiceSchema()) }}
      />

      {/* ── Optional campaign banner (adopt-page slot) ────────────────────── */}
      <section className="w-full px-4 py-4 bg-background">
        <div className="max-w-4xl mx-auto">
          <CampaignBannerGeneric slot="adopt-page" />
        </div>
      </section>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="w-full py-20 px-4 bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Become a Herd Family Member
          </h1>
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto mb-4">
            A simple monthly contribution that keeps Ibiza&apos;s first alpaca farm
            thriving — and brings you closer to the herd every month.
          </p>
          <p className="text-3xl font-bold text-primary mb-8">
            {`€${ADOPT_PRICE_MONTHLY_EUR}`}
            <span className="text-lg font-normal text-foreground/60"> / month</span>
          </p>
          <a
            href={monthlyUrl}
            className="inline-flex items-center justify-center px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold text-base transition-colors"
          >
            Join the herd monthly
          </a>
          <p className="mt-3 text-sm text-foreground/50">Cancel any time — no minimum commitment.</p>
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────────────────────────── */}
      <section className="w-full py-16 px-4 bg-background">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-10">
            What&apos;s included every month
          </h2>
          <ul className="space-y-4">
            {[
              'Personalised adoption certificate with your chosen alpaca\'s name',
              'Monthly photo update and personal story from the farm',
              'Open invitation to visit Es Currals and meet your alpaca',
            ].map((benefit) => (
              <li key={benefit} className="flex items-start gap-3">
                <span className="mt-0.5 text-primary font-bold" aria-hidden="true">
                  ✓
                </span>
                <span className="text-foreground/80 text-base">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Pricing card + CTA (repeat) ──────────────────────────────────── */}
      <section id="cta" className="w-full py-16 px-4 bg-primary/5">
        <div className="max-w-md mx-auto">
          <div className="bg-card rounded-xl border-2 border-primary p-8 text-center shadow-md">
            <h2 className="text-2xl font-bold text-foreground mb-1">
              Herd Family Membership
            </h2>
            <p className="text-3xl font-bold text-primary mb-1">
              {`€${ADOPT_PRICE_MONTHLY_EUR}`}
              <span className="text-lg font-normal text-foreground/60"> / month</span>
            </p>
            <p className="text-sm text-foreground/60 mb-6">
              Flexible monthly support — cancel any time.
            </p>
            <a
              href={monthlyUrl}
              className="block w-full px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold text-base transition-colors text-center"
            >
              Adopt monthly
            </a>
          </div>
          <p className="mt-4 text-sm text-foreground/60 text-center">
            Secure checkout. Your adoption begins immediately after payment.
          </p>
          <div className="mt-4 text-center">
            <a
              href={`/${locale}/adopt`}
              className="text-sm text-primary hover:text-primary/80 underline-offset-2 hover:underline"
            >
              Compare all plans (including yearly) →
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
