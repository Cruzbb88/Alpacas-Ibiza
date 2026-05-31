'use client'

/**
 * AdoptStickyMobileBar — mobile-only sticky bottom CTA bar for /adopt.
 *
 * Always-visible "Adopt €75/mo" + "€900/yr" buttons that stay in viewport
 * while the donor scrolls long marketing copy. Hides on scroll DOWN (so it
 * doesn't compete with the fold) and reappears on scroll UP (when donor is
 * looking for the CTA). Desktop hidden entirely — desktop already has the
 * sticky-positioned CTAs in the marketing layout.
 *
 * Two link variants:
 *  - Primary filled (yearly) — chosen tier shown first as the recommended
 *  - Outline (monthly) — secondary affordance
 *
 * URLs are pre-built by the server (carry the alpaca slug if picked).
 *
 * Accessibility:
 *  - role="region" + aria-label so screen reader can skip it
 *  - When hidden via scroll-down, aria-hidden="true" so AT doesn't read it
 *  - prefers-reduced-motion → no slide transition
 */

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { Locale } from '@/i18n.config'
import { useTranslations } from 'next-intl'
import { trackEvent } from '@/lib/client-track'

interface AdoptStickyMobileBarProps {
  locale: Locale
  monthlyUrl: string
  yearlyUrl: string
  /** Translated short price labels, e.g. "€75/mo" / "€900/yr". */
  monthlyPriceShort?: string
  yearlyPriceShort?: string
  /** Hide threshold in px — below this scroll Y the bar is always hidden
   *  (donor is at top of page, primary CTA is in view). Default 600. */
  showAfterY?: number
  /** Analytics-only metadata (mirror of the server-side adopt page state). */
  alpacaSlug?: string | null
  processor?: 'stripe' | 'mollie' | 'mailto' | 'fareharbor' | 'unknown'
  isGift?: boolean
}

const SCROLL_DELTA_PX = 12 // minimum movement to count as a direction change

export function AdoptStickyMobileBar({
  locale,
  monthlyUrl,
  yearlyUrl,
  monthlyPriceShort,
  yearlyPriceShort,
  showAfterY = 600,
  alpacaSlug = null,
  processor = 'unknown',
  isGift = false,
}: AdoptStickyMobileBarProps) {
  // Tracking shared between both buttons — onClick fires tier-selected +
  // checkout-started so we can compare conversion path between sticky / card / cta.
  function trackStickyClick(tier: 'monthly' | 'yearly') {
    try {
      trackEvent('adopt_tier_selected', { tier, source: 'sticky' })
      trackEvent('adopt_checkout_started', {
        tier,
        alpaca_slug: alpacaSlug,
        processor,
        is_gift: isGift,
      })
    } catch {
      // Never block navigation on analytics failure.
    }
  }
  const translate = useTranslations()
  const monthlyLabel = monthlyPriceShort ?? translate('adopt.sticky.monthlyShort')
  const yearlyLabel = yearlyPriceShort ?? translate('adopt.sticky.yearlyShort')
  const adoptVerb = translate('adopt.sticky.cta')
  const regionLabel = translate('adopt.sticky.region')

  const [visible, setVisible] = useState(false)
  const lastY = useRef(0)

  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const y = window.scrollY
        const delta = y - lastY.current
        if (Math.abs(delta) < SCROLL_DELTA_PX) return // ignore jitter
        if (y < showAfterY) {
          setVisible(false)
        } else if (delta < 0) {
          // Scrolling UP — show
          setVisible(true)
        } else {
          // Scrolling DOWN past threshold — hide
          setVisible(false)
        }
        lastY.current = y
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [showAfterY])

  return (
    <div
      role="region"
      aria-label={regionLabel}
      aria-hidden={!visible}
      inert={!visible}
      className={
        'md:hidden fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 ' +
        'bg-background/95 backdrop-blur border-t border-border ' +
        'transition-transform duration-200 ease-out motion-reduce:transition-none ' +
        (visible ? 'translate-y-0' : 'translate-y-full pointer-events-none')
      }
    >
      <div className="flex gap-2 max-w-screen-sm mx-auto">
        <Link
          href={yearlyUrl}
          onClick={() => trackStickyClick('yearly')}
          className="flex-1 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label={`${adoptVerb} — ${yearlyLabel}`}
        >
          <span aria-hidden="true" className="mr-1.5">🦙</span>
          {adoptVerb} {yearlyLabel}
        </Link>
        <Link
          href={monthlyUrl}
          onClick={() => trackStickyClick('monthly')}
          className="flex-1 inline-flex items-center justify-center rounded-lg border border-primary px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label={`${adoptVerb} — ${monthlyLabel}`}
        >
          {monthlyLabel}
        </Link>
      </div>
    </div>
  )
}
