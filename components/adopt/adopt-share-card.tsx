'use client'

/**
 * AdoptShareCard — post-adopt social share card for the thank-you flow.
 *
 * After checkout completes the donor lands on /adopt?checkout=success&tier=&alpaca=.
 * This component renders next to the welcome copy and provides one-click
 * social share affordances:
 *   - "I just adopted {name}!" prefilled X/Twitter, WhatsApp, Facebook, email
 *   - Native Web Share API on supported devices (single share button)
 *   - "Copy link" fallback that copies the alpaca's detail page URL
 *
 * Privacy-conscious: no tracking pixels, no JS analytics on the share buttons.
 * All buttons open in a new tab where applicable.
 *
 * Pure client component — uses navigator.share / navigator.clipboard which
 * are window-only.
 */

import { useEffect, useState } from 'react'
import type { Locale } from '@/i18n.config'
import { useTranslations } from 'next-intl'

interface AdoptShareCardProps {
  locale: Locale
  /** Display name of the adopted alpaca, e.g. "Barbarella". */
  alpacaName: string
  /** Absolute URL of that alpaca's detail page (shared as the link). */
  alpacaUrl: string
  /** Optional override of the prefilled share text. */
  shareText?: string
  /** Optional hashtags array — appended as #-prefixed words on Twitter / shown in copy. */
  hashtags?: ReadonlyArray<string>
}

const DEFAULT_HASHTAGS = ['AlpacasIbiza', 'AdoptAnAlpaca'] as const

export function AdoptShareCard({
  locale,
  alpacaName,
  alpacaUrl,
  shareText,
  hashtags = DEFAULT_HASHTAGS,
}: AdoptShareCardProps) {
  const translate = useTranslations()
  const heading = translate('adopt.share.heading')
  const sub = translate('adopt.share.sub')
  const text =
    shareText ?? translate('adopt.share.message',{ name: alpacaName })
  const copyLabel = translate('adopt.share.copyLink')
  const copiedLabel = translate('adopt.share.copied')
  const nativeShareLabel = translate('adopt.share.nativeButton')

  const [hasNativeShare, setHasNativeShare] = useState(false)
  const [copied, setCopied] = useState(false)

  // Detect Web Share support client-side only. SSR pass renders the
  // multi-button fallback; client hydrates with the native button if available.
  useEffect(() => {
    setHasNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [])

  async function handleNativeShare() {
    if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return
    try {
      await navigator.share({ title: text, text, url: alpacaUrl })
    } catch {
      // User cancelled or share unavailable — no-op; copy-link fallback button is still rendered.
    }
  }

  async function handleCopy() {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(alpacaUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard denied — leave the button un-toggled.
    }
  }

  const tags = hashtags.join(',')
  const encodedText = encodeURIComponent(text)
  const encodedUrl = encodeURIComponent(alpacaUrl)

  // Pre-built share URLs (no JS required for these — work even if hydration fails)
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}&hashtags=${encodeURIComponent(tags)}`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${text} ${alpacaUrl}`)}`
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
  const emailUrl = `mailto:?subject=${encodeURIComponent(`I adopted ${alpacaName} 🦙`)}&body=${encodeURIComponent(`${text}\n\n${alpacaUrl}`)}`

  return (
    <section
      aria-labelledby="adopt-share-heading"
      className="bg-card rounded-2xl border border-border p-6 sm:p-8"
    >
      <h2 id="adopt-share-heading" className="text-lg font-semibold text-foreground mb-1">
        {heading}
      </h2>
      <p className="text-sm text-foreground/70 mb-5">{sub}</p>

      <div className="flex flex-wrap gap-2">
        {/* Native share — only rendered post-hydration on supported devices */}
        {hasNativeShare && (
          <button
            type="button"
            onClick={handleNativeShare}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label={nativeShareLabel}
          >
            <span aria-hidden="true">↗</span>
            {nativeShareLabel}
          </button>
        )}

        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Share on X"
        >
          <span aria-hidden="true">𝕏</span>
          Post
        </a>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Share on WhatsApp"
        >
          <span aria-hidden="true">💬</span>
          WhatsApp
        </a>

        <a
          href={facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Share on Facebook"
        >
          <span aria-hidden="true">f</span>
          Facebook
        </a>

        <a
          href={emailUrl}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="Share by email"
        >
          <span aria-hidden="true">✉</span>
          Email
        </a>

        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label={copyLabel}
        >
          <span aria-hidden="true">{copied ? '✓' : '🔗'}</span>
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
    </section>
  )
}
