'use client'

/**
 * AdoptCheckoutLink — client wrapper around <a href> for the page-level
 * gradient CTA and the RepeatCta closing buttons.
 *
 * Why a tiny client component?
 *   - The parent page (app/[locale]/adopt/page.tsx) is server-side, but we
 *     need onClick to fire GA4 events before navigation hands off to Stripe /
 *     Mollie.
 *   - Carrying a 'use client' boundary around a small leaf component keeps
 *     the rest of the page server-rendered.
 *
 * Fires:
 *   - adopt_tier_selected  { tier, source }
 *   - adopt_checkout_started { tier, alpaca_slug, processor, is_gift }
 * Wrapped in try/catch — never blocks navigation.
 *
 * `source` distinguishes "cta" (the in-page gradient CTA block) from "repeat"
 * (the closing CTA after the FAQ) so we can see which one converts better.
 *
 * EU Art 16(m): consumes WaiverContext from CheckoutGate. When the donor has
 * not yet accepted the waiver, navigation is blocked and the error is shown.
 * When accepted, ?waiver_accepted=1&waiver_ts=<epoch> is appended to the URL
 * so the server route can record the acceptance in Stripe/Mollie metadata.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'
import { trackEvent } from '@/lib/client-track'
import { useWaiverGate } from '@/components/adopt/checkout-gate'

interface AdoptCheckoutLinkProps {
  href: string
  tier: 'monthly' | 'yearly'
  source: 'cta' | 'repeat'
  alpacaSlug: string | null
  processor: 'stripe' | 'mollie' | 'mailto' | 'fareharbor' | 'unknown'
  isGift: boolean
  className?: string
  ariaLabel?: string
  children: ReactNode
}

export function AdoptCheckoutLink({
  href,
  tier,
  source,
  alpacaSlug,
  processor,
  isGift,
  className,
  ariaLabel,
  children,
}: AdoptCheckoutLinkProps) {
  const { accepted, showError } = useWaiverGate()

  function appendWaiver(url: string): string {
    const sep = url.includes('?') ? '&' : '?'
    return `${url}${sep}waiver_accepted=1&waiver_ts=${Date.now()}`
  }

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!accepted) {
      e.preventDefault()
      showError()
      return
    }

    // Append waiver audit params to the checkout URL, then fire analytics.
    // Use window.location so the full rewritten URL is sent rather than the
    // stale href captured at render time.
    const withWaiver = appendWaiver(href)
    e.preventDefault()
    try {
      trackEvent('adopt_tier_selected', { tier, source })
      trackEvent('adopt_checkout_started', {
        tier,
        alpaca_slug: alpacaSlug,
        processor,
        is_gift: isGift,
      })
    } catch {
      // Never block navigation on analytics failure.
    }
    window.location.href = withWaiver
  }

  return (
    <Link href={href} onClick={handleClick} className={className} aria-label={ariaLabel}>
      {children}
    </Link>
  )
}
