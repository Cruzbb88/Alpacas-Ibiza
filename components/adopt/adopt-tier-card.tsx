'use client'

/**
 * AdoptTierCard — single pricing tier card for the /adopt page.
 *
 * Two visual variants:
 *   - "monthly" → quiet card on default background
 *   - "yearly"  → highlighted card with primary border + "popular" badge
 *
 * Includes the CTA button inline (donor clicks the price card itself or the
 * button — the entire card is clickable for fat-finger UX, but the button is
 * the visible affordance for screen readers).
 *
 * Caller supplies the checkout URL (already-built by getPaymentAdapter().
 * buildAdoptCheckoutUrl()). When the URL is `mailto:` (provider unconfigured),
 * the card still renders correctly — the donor lands in their mail client.
 *
 * Tracks two GA4 events on click:
 *   - adopt_tier_selected { tier, source: 'card' }
 *   - adopt_checkout_started { tier, alpaca_slug, processor, is_gift }
 * Tracking calls are wrapped — they never block the navigation or throw.
 */

import Link from 'next/link'
import type { Locale } from '@/i18n.config'
import { t } from '@/lib/translations'
import { trackEvent } from '@/lib/client-track'
import { ConsentNotice } from '@/components/legal/consent-notice'

export type AdoptTier = 'monthly' | 'yearly'

interface AdoptTierCardProps {
  locale: Locale
  tier: AdoptTier
  /** Pre-formatted price string, e.g. "€75/month" or "€900/year". */
  priceLabel: string
  /** URL the donor goes to when they click. */
  checkoutUrl: string
  /** Optional emphasised badge for the popular tier (translated by caller, or defaults to "Most popular"). */
  popularBadge?: string
  /** Override the per-tier helper text below the price. */
  subLabel?: string
  /** Override the CTA button text. */
  ctaLabel?: string
  /** Alpaca slug currently selected (for analytics — also already in the URL). */
  alpacaSlug?: string | null
  /** Active payment processor, surfaced from the server adapter (for analytics). */
  processor?: 'stripe' | 'mollie' | 'mailto' | 'fareharbor' | 'unknown'
  /** Whether the donor has gift fields filled (for analytics). */
  isGift?: boolean
}

export function AdoptTierCard({
  locale,
  tier,
  priceLabel,
  checkoutUrl,
  popularBadge,
  subLabel,
  ctaLabel,
  alpacaSlug = null,
  processor = 'unknown',
  isGift = false,
}: AdoptTierCardProps) {
  const translate = t(locale)
  const isYearly = tier === 'yearly'
  const tierName =
    tier === 'monthly'
      ? translate('adopt.tier.monthly', 'Monthly')
      : translate('adopt.tier.yearly', 'Yearly — prepaid')
  const sub =
    subLabel ??
    (tier === 'monthly'
      ? translate('adopt.tier.monthlySub', 'Cancel any time.')
      : translate('adopt.tier.yearlySub', 'Same total as monthly, paid upfront.'))
  const cta =
    ctaLabel ??
    (tier === 'monthly'
      ? translate('adopt.tier.ctaMonthly', 'Adopt monthly')
      : translate('adopt.tier.ctaYearly', 'Adopt yearly'))
  const badge =
    isYearly && (popularBadge ?? translate('adopt.tier.popularBadge', 'Most popular'))

  return (
    <article
      className={
        'relative rounded-2xl p-8 flex flex-col items-center text-center transition-colors ' +
        (isYearly
          ? 'bg-primary/5 border-2 border-primary/40 shadow-sm'
          : 'bg-card border border-border')
      }
    >
      {/* Popular badge — yearly only */}
      {badge && (
        <span
          className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground shadow-sm"
        >
          {badge}
        </span>
      )}

      <p
        className={
          'text-xs font-semibold uppercase tracking-wide mb-2 ' +
          (isYearly ? 'text-primary' : 'text-foreground/50')
        }
      >
        {tierName}
      </p>

      <p className="text-4xl font-bold text-foreground mb-1 tabular-nums">{priceLabel}</p>

      <p className="text-sm text-foreground/60 mb-6">{sub}</p>

      <Link
        href={checkoutUrl}
        onClick={() => {
          // Fire both tier-selected and checkout-started — donor has committed
          // to this tier and is about to leave the page for the processor.
          // Wrapped: trackEvent itself try/catches, but belt-and-braces against
          // an upstream throw still keeps the nav working.
          try {
            trackEvent('adopt_tier_selected', { tier, source: 'card' })
            trackEvent('adopt_checkout_started', {
              tier,
              alpaca_slug: alpacaSlug,
              processor,
              is_gift: isGift,
            })
          } catch {
            // Never block navigation on analytics failure.
          }
        }}
        className={
          'mt-auto inline-flex w-full justify-center rounded-lg px-6 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ' +
          (isYearly
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'border border-primary text-primary hover:bg-primary/5')
        }
        aria-label={`${cta} — ${priceLabel}`}
      >
        {cta}
      </Link>

      {/*
       * GDPR Art. 13 + CAN-SPAM § 5(a): adopt checkout is a transactional
       * flow — the click itself is the consent action — but we still owe the
       * donor an inline disclosure of the legal basis BEFORE submission.
       * No checkbox, no block on click; this is information only.
       */}
      <ConsentNotice
        locale={locale}
        actionLabel={translate('legal.adoptAction', 'adopting')}
      />
    </article>
  )
}
