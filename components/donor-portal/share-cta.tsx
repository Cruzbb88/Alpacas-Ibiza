'use client'

/**
 * components/donor-portal/share-cta.tsx
 *
 * "Share my adoption" CTA shown on /[locale]/my-adoption between the action
 * buttons and the quarterly farm-news section. Copies a shareable link to
 * the clipboard and fires an analytics event so we can see how many donors
 * advocate organically.
 *
 * The link points at `/[locale]/share-adoption?alpaca=<slug>` — a public
 * landing page that itself sets OG metadata to `/api/og/adoption-share`,
 * so when the donor pastes the link into Instagram / WhatsApp / Twitter
 * the social-media preview card renders correctly.
 *
 * Failsafes:
 *   - navigator.clipboard requires a secure context (HTTPS) AND user gesture.
 *     If it's unavailable (older browsers, in-app webviews) or throws, we
 *     fall back to opening a `mailto:?body=<link>` so the donor still has
 *     a way to share.
 *   - The analytics event is fail-quiet (trackEvent itself catches throws),
 *     so a broken GA pixel never blocks the copy.
 *
 * Accessibility:
 *   - aria-live="polite" on the feedback span so screen readers announce
 *     "Copied!" without stealing focus.
 *   - The transient feedback auto-clears after 2s and the button label
 *     resets so the user can re-share.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { trackEvent } from '@/lib/analytics-events'
import { SITE_BASE_URL } from '@/lib/config'
import type { Locale } from '@/i18n.config'

interface ShareCTAProps {
  /** Alpaca slug from the donor's subscription metadata. null = "let us pick". */
  alpacaSlug: string | null
  /** Active locale for the share-adoption landing-page URL. */
  locale: Locale
}

type FeedbackState = 'idle' | 'copied' | 'mailto'

function buildShareUrl(locale: Locale, alpacaSlug: string | null): string {
  const search = alpacaSlug ? `?alpaca=${encodeURIComponent(alpacaSlug)}` : ''
  return `${SITE_BASE_URL}/${locale}/share-adoption${search}`
}

export function ShareCTA({ alpacaSlug, locale }: ShareCTAProps) {
  const [feedback, setFeedback] = useState<FeedbackState>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear any pending timer when the component unmounts (avoid setState on
  // unmounted component if the user navigates away during the 2s window).
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const flashFeedback = useCallback((next: Exclude<FeedbackState, 'idle'>) => {
    setFeedback(next)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setFeedback('idle'), 2000)
  }, [])

  const handleShare = useCallback(async () => {
    const shareUrl = buildShareUrl(locale, alpacaSlug)

    // Fire analytics first — even if the clipboard write fails, the donor's
    // intent to share is a real signal we want to capture.
    trackEvent('adopt_referral_link_copied', { alpaca_slug: alpacaSlug })

    // Try the clipboard API. Requires HTTPS + user gesture. The button click
    // satisfies the gesture; `SITE_BASE_URL` is HTTPS in production.
    const clipboard =
      typeof navigator !== 'undefined' && navigator.clipboard
        ? navigator.clipboard
        : null

    if (clipboard && typeof clipboard.writeText === 'function') {
      try {
        await clipboard.writeText(shareUrl)
        flashFeedback('copied')
        return
      } catch {
        // Permission denied or write failed — fall through to mailto.
      }
    }

    // Fallback: open the user's default mail client with the link pre-filled
    // so they can forward it to a friend. Subject + body are URL-encoded.
    const subject = encodeURIComponent('I adopted an alpaca at Alpacas Ibiza')
    const body = encodeURIComponent(
      `I just adopted an alpaca at Alpacas Ibiza — take a look:\n\n${shareUrl}\n`,
    )
    if (typeof window !== 'undefined') {
      window.location.href = `mailto:?subject=${subject}&body=${body}`
    }
    flashFeedback('mailto')
  }, [alpacaSlug, locale, flashFeedback])

  const buttonLabel =
    feedback === 'copied'
      ? 'Copied!'
      : feedback === 'mailto'
        ? 'Opening email…'
        : 'Share my adoption'

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #e4e4e7',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div>
        <h2
          style={{
            fontSize: 13,
            fontWeight: 600,
            margin: '0 0 4px',
            color: '#3f3f46',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          Spread the word
        </h2>
        <p style={{ color: '#71717a', fontSize: 14, margin: 0 }}>
          Share a link to your adoption — Instagram, WhatsApp, Twitter, email.
          Each one helps the herd.
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleShare}
          style={{
            background: '#556B2F',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: 8,
            border: 'none',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          {buttonLabel}
        </button>
        <span
          aria-live="polite"
          style={{
            color: '#15803d',
            fontSize: 13,
            fontWeight: 500,
            minHeight: 18,
          }}
        >
          {feedback === 'copied' ? 'Link copied to clipboard.' : ''}
          {feedback === 'mailto' ? 'Your email app is opening with the link.' : ''}
        </span>
      </div>
    </section>
  )
}
