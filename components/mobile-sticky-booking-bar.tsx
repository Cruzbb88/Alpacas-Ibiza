'use client'

/**
 * MobileStickyBookingBar — competitor-grade mobile-only bottom-anchored CTA.
 *
 * Slides up after the user scrolls past 600px. Hides itself when scrolled
 * back near the top OR on a clear upward-scroll gesture below 800px. Dismiss
 * persists for the session via `sessionStorage`.
 *
 * Rendering rules:
 *   - md:hidden — mobile only
 *   - z-50 — under NavProgressBar (z-60), over normal content
 *   - hidden on /admin, /api, /billing, /preferences, /redeem-voucher,
 *     /my-adoption, /thank-you, /newsletter/unsubscribed routes and the
 *     tours route itself (Baymard mobile weakness #7 — don't duplicate CTAs
 *     when page already has a primary action)
 *   - safe-area inset for iOS home indicator
 *
 * Contextual CTA (Baymard mobile weakness #7):
 *   - /adopt* → "Adopt an alpaca"
 *   - /tours, /experiences* → "Book a tour"  (default)
 *   - everything else → generic "Book a tour" fallback
 *
 * Wiring:
 *   - URL via getProductBookingUrl(product) or getFareHarborEmbedUrl()
 *   - Fail-open by design — never inert
 *   - data-analytics-event="sticky_booking_click" for GA4
 */

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import type { Locale } from '@/i18n.config'
import { useTranslations } from 'next-intl'
import { getFareHarborEmbedUrl } from '@/lib/config'
import {
  getProductBookingUrl,
  type FareHarborProduct,
} from '@/lib/fareharbor-products'

const SESSION_KEY = 'mobile_booking_bar_dismissed_v1'

/**
 * Route segments where the bar should NOT render.
 * Checked via pathname.includes() or exact regex — avoids duplicating a
 * primary CTA that is already present on those pages.
 */
const HIDDEN_ROUTE_SEGMENTS = [
  '/admin',
  '/api',
  '/billing',
  '/preferences',
  '/redeem-voucher',
  '/my-adoption',
  '/thank-you',
  '/newsletter/unsubscribed',
  '/newsletter/archive',
  '/tour-confirmation',   // post-booking confirmation — CTA already fulfilled
  '/cancel-feedback',     // cancellation flow — wrong conversion moment
  '/share-adoption',      // post-adopt share page — conversion already complete
]

export interface MobileStickyBookingBarProps {
  locale: Locale
  /** Optional override — defaults to contextual label derived from pathname */
  label?: string
  /** Defaults to the main calendar URL via getFareHarborEmbedUrl(). Pass a product slug to deep-link. */
  product?: FareHarborProduct
  /** Optional price hint shown left of CTA, e.g. "from €25". Hidden when unset. */
  priceHint?: string
}

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === 'true'
  } catch {
    return false
  }
}

function writeDismissed() {
  try {
    sessionStorage.setItem(SESSION_KEY, 'true')
  } catch {
    // Safari private mode + storage-full both throw — silently swallow
  }
}

export function MobileStickyBookingBar({
  locale,
  label,
  product,
  priceHint,
}: MobileStickyBookingBarProps) {
  const pathname = usePathname() ?? ''
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(true) // start hidden to avoid SSR flash
  const lastScrollY = useRef(0)
  // Rules of Hooks: call this UNCONDITIONALLY before any early `return null`
  // below. The next-intl migration placed `useTranslations()` after the route/
  // dismissed guards — on the render where `dismissed` flipped false the hook
  // count changed (6 → 7), which threw and took every page that mounts this bar
  // down to the error boundary ("Something went wrong"). Keep it up here.
  const tr = useTranslations()

  // Hydrate dismissal from sessionStorage after mount
  useEffect(() => {
    if (!readDismissed()) {
      setDismissed(false)
    }
  }, [])

  // Throttled scroll listener via requestAnimationFrame
  useEffect(() => {
    if (dismissed) return

    let raf = 0
    let ticking = false

    const onScroll = () => {
      if (ticking) return
      ticking = true
      raf = requestAnimationFrame(() => {
        const y = window.scrollY
        const last = lastScrollY.current
        const scrolledUp = y < last
        const delta = last - y

        if (y < 400) {
          setVisible(false)
        } else if (scrolledUp && delta > 40 && y < 800) {
          setVisible(false)
        } else if (y > 600) {
          setVisible(true)
        }

        lastScrollY.current = y
        ticking = false
      })
    }

    // Prime ref to current position so the first event reads a sane delta
    lastScrollY.current = window.scrollY
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [dismissed])

  // Route guards — pages that already have a primary CTA or are non-conversion contexts.
  // Checked before the dismissed guard so we never even render for these routes.
  // Test at path-segment boundaries so '/billing-faq' does not accidentally match '/billing'.
  for (const segment of HIDDEN_ROUTE_SEGMENTS) {
    if (pathname.includes(segment + '/') || pathname.includes(segment + '?') || pathname.endsWith(segment)) return null
  }
  // Hide on the tours page itself: matches /en/tours, /de/tours, etc. exactly.
  // Experiences sub-pages still show the bar (they benefit from a booking nudge).
  if (/^\/[a-z]{2}\/tours\/?$/.test(pathname)) {
    return null
  }

  if (dismissed) return null

  // Contextual CTA: derive label from current pathname when no explicit override.
  // /adopt* → "Adopt an alpaca"  (Level-4 trust ask; label sets the right intent)
  // everything else → generic "Book a tour"
  // Baymard mobile weakness #7: CTA text must match page intent.
  const isAdoptContext = /\/adopt(\/|$)/.test(pathname)

  // Safe i18n: tr() returns the key itself when a key is missing — use English
  // fallback in that case to prevent raw key strings leaking into the UI.
  const rawAdoptCta = tr('nav.adoptCta')
  const rawBookTour = tr('nav.bookTour')
  const adoptCtaLabel = rawAdoptCta && rawAdoptCta !== 'nav.adoptCta' ? rawAdoptCta : 'Adopt an alpaca'
  const bookTourLabel = rawBookTour && rawBookTour !== 'nav.bookTour' ? rawBookTour : 'Book a tour'

  const contextualLabel = isAdoptContext ? adoptCtaLabel : bookTourLabel
  const ctaLabel = label ?? contextualLabel

  // Aria label includes the action so screen-reader users understand both buttons.
  const ctaAriaLabel = label ?? (isAdoptContext ? adoptCtaLabel : bookTourLabel)

  const href = product ? getProductBookingUrl(product) : getFareHarborEmbedUrl()
  const isHidden = !visible

  const handleDismiss = () => {
    writeDismissed()
    setDismissed(true)
  }

  return (
    <div
      role="region"
      aria-label="Booking quick actions"
      aria-hidden={isHidden ? 'true' : 'false'}
      className={[
        'md:hidden fixed bottom-0 left-0 right-0 z-50',
        'bg-background/95 backdrop-blur-md border-t border-border shadow-2xl',
        'pb-[env(safe-area-inset-bottom)]',
        'transition-transform duration-300 ease-out',
        isHidden ? 'translate-y-full pointer-events-none' : 'translate-y-0',
      ].join(' ')}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        {priceHint ? (
          <span
            className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-accent px-2 py-1 rounded-md bg-accent/10"
            aria-label={`Price hint: ${priceHint}`}
          >
            {priceHint}
          </span>
        ) : null}

        <a
          href={href}
          aria-label={ctaAriaLabel}
          data-analytics-event="sticky_booking_click"
          className={[
            'flex-1 inline-flex items-center justify-center',
            'min-h-[44px] px-4 rounded-full',
            'bg-accent text-accent-foreground font-semibold',
            'hover:bg-accent/90 active:bg-accent/90',
            'shadow-md transition-colors',
            'text-sm',
          ].join(' ')}
        >
          {ctaLabel}
          <span aria-hidden="true" className="ml-2">→</span>
        </a>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss booking bar"
          className={[
            'shrink-0 inline-flex items-center justify-center',
            'h-8 w-8 rounded-full',
            'text-muted-foreground hover:text-foreground hover:bg-foreground/5',
            'focus:outline-none focus:ring-2 focus:ring-accent/40',
            'transition-colors',
          ].join(' ')}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
