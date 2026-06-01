/**
 * /[locale]/skein — Name Your Skein spring-shearing sponsorship page.
 *
 * Server component. Mirror of the /shop/alcaca pattern.
 * The AlpacaPicker is reused from the adopt flow; selecting an alpaca
 * pushes ?alpaca=<slug> into the URL (same server-re-render pattern).
 *
 * i18n: skein.* namespace — EN + NL real translations; es/de/fr/it
 * carry __UNTRANSLATED__ sentinels that next-intl merges back to EN.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import type { Locale } from '@/i18n.config'
import { getTranslations } from 'next-intl/server'
import { buildLocaleAlternates } from '@/lib/i18n-metadata'
import { findAlpacaName } from '@/lib/data/alpacas'
import { SKEIN_SPONSORSHIP_PRICE_EUR, SITE_BASE_URL } from '@/lib/config'
import { AlpacaPicker } from '@/components/adopt/alpaca-picker'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>
}): Promise<Metadata> {
  const { locale } = await params
  const tr = await getTranslations()
  const { canonical, languages } = buildLocaleAlternates(locale, 'skein')
  return {
    title: tr('skein.metaTitle'),
    description: tr('skein.metaDescription'),
    alternates: { canonical, languages },
    openGraph: {
      title: tr('skein.metaTitle'),
      description: tr('skein.metaDescription'),
    },
  }
}

export default async function SkeinPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  const sp = searchParams ? await searchParams : {}
  const translate = await getTranslations()

  // Validate alpaca slug from URL — same pattern as adopt page.
  const rawSlug = typeof sp.alpaca === 'string' ? sp.alpaca : null
  const selectedSlug = rawSlug && findAlpacaName(rawSlug) ? rawSlug : null
  const alpacaDisplayName = selectedSlug ? findAlpacaName(selectedSlug) : null

  // Checkout URLs: both use SITE_BASE_URL (ADR 017 — never Origin header).
  const sponsorHref = selectedSlug
    ? `/api/skein-checkout?alpaca=${encodeURIComponent(selectedSlug)}&locale=${locale}`
    : `/api/skein-checkout?alpaca=any&locale=${locale}`

  const pickForMeHref = `/api/skein-checkout?alpaca=any&locale=${locale}`

  // Show cancelled banner if returning from abandoned checkout.
  const cancelled = sp.cancelled === '1'

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="w-full py-20 px-4 bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            {translate('skein.heroTitle')}
          </h1>
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
            {translate('skein.heroSubtitle')}
          </p>
        </div>
      </section>

      {/* ── Cancelled banner ─────────────────────────────────────────────── */}
      {cancelled && (
        <div className="w-full bg-yellow-50 border-b border-yellow-200 px-4 py-3 text-center text-sm text-yellow-800">
          Your checkout was cancelled — your slot is still available.
        </div>
      )}

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="w-full py-16 px-4 bg-background">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-10">
            {translate('skein.howItWorksTitle')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(
              [
                { step: '1', title: translate('skein.step1Title'), body: translate('skein.step1Body'), icon: '🦙' },
                { step: '2', title: translate('skein.step2Title'), body: translate('skein.step2Body'), icon: '✂️' },
                { step: '3', title: translate('skein.step3Title'), body: translate('skein.step3Body'), icon: '📦' },
              ] as const
            ).map(({ step, title, body, icon }) => (
              <div key={step} className="bg-card rounded-lg border border-border p-6 text-center">
                <div className="text-4xl mb-3">{icon}</div>
                <div className="text-xs font-bold tracking-widest uppercase text-foreground/40 mb-1">
                  Step {step}
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-foreground/70">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Alpaca picker ─────────────────────────────────────────────────── */}
      <section className="w-full py-16 px-4 bg-primary/5">
        <div className="max-w-4xl mx-auto">
          <Suspense>
            <AlpacaPicker
              locale={locale}
              selectedSlug={selectedSlug}
              heading={translate('skein.step1Title')}
              subheading={translate('skein.step1Body')}
              randomLabel={translate('skein.ctaPickForMe')}
            />
          </Suspense>
        </div>
      </section>

      {/* ── Tier card + CTAs ─────────────────────────────────────────────── */}
      <section id="cta" className="w-full py-16 px-4 bg-background">
        <div className="max-w-md mx-auto">
          <div className="bg-card rounded-xl border-2 border-primary p-8 text-center shadow-md">
            <div className="text-5xl mb-4">🧶</div>
            <h2 className="text-2xl font-bold text-foreground mb-1">
              {translate('skein.tierTitle')}
            </h2>
            <p className="text-3xl font-bold text-primary mb-1">
              {`€${SKEIN_SPONSORSHIP_PRICE_EUR}`}
            </p>
            <p className="text-sm text-foreground/60 mb-6">
              {translate('skein.tierSub')}
            </p>

            {/* Primary CTA */}
            <Link
              href={sponsorHref}
              className="block w-full px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold text-base transition-colors text-center mb-3"
            >
              {alpacaDisplayName
                ? translate('skein.ctaSponsor', { name: alpacaDisplayName })
                : translate('skein.ctaSponsor', { name: '…' })}
            </Link>

            {/* "Pick for me" secondary CTA — only show when no alpaca is selected */}
            {!selectedSlug && (
              <Link
                href={pickForMeHref}
                className="block w-full px-6 py-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg font-medium text-base transition-colors text-center"
              >
                {translate('skein.ctaPickForMe')}
              </Link>
            )}
          </div>

          {/* Trust line */}
          <p className="mt-4 text-sm text-foreground/60 text-center">
            {translate('skein.trustLine')}
          </p>
        </div>
      </section>

      {/* ── Scarcity note ─────────────────────────────────────────────────── */}
      <section className="w-full py-10 px-4 bg-primary/5">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-xl font-bold text-foreground mb-2">
            {translate('skein.onlyTitle')}
          </h3>
          <p className="text-foreground/70">
            {translate('skein.onlyBody')}
          </p>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="w-full py-16 px-4 bg-background">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-8">
            {translate('skein.faqTitle')}
          </h2>
          <div className="space-y-6">
            {(
              [
                { q: translate('skein.faq1Question'), a: translate('skein.faq1Answer') },
                { q: translate('skein.faq2Question'), a: translate('skein.faq2Answer') },
                { q: translate('skein.faq3Question'), a: translate('skein.faq3Answer') },
                { q: translate('skein.faq4Question'), a: translate('skein.faq4Answer') },
              ] as const
            ).map(({ q, a }, i) => (
              <div key={i} className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-bold text-foreground mb-2">{q}</h3>
                <p className="text-foreground/70 text-sm">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
