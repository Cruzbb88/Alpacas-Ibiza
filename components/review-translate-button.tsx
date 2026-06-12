'use client'

import { useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'

export interface ReviewTranslateButtonProps {
  /** Raw review text to translate. */
  text: string
  /** Optional source language hint (BCP47, e.g. 'es'). */
  sourceLang?: string
  className?: string
  /** Review body rendered inside the wrapper. When translated, the children are
   *  replaced by the translated text rendered in the same slot. */
  children?: React.ReactNode
}

/**
 * ReviewTranslateButton — wrapping pattern.
 *
 * Usage:
 *   <ReviewTranslateButton text={review.body} sourceLang={review.lang}>
 *     <p>{review.body}</p>
 *   </ReviewTranslateButton>
 *
 * Renders children unchanged until user clicks Translate; then swaps to
 * translated text inline and shows a "Show original" toggle.
 * Attribution ("Translated by MyMemory") shown beneath translated text.
 *
 * Failsafe: renders null when text < 10 chars or sourceLang already matches
 * user locale (no point translating same-language text).
 */
export function ReviewTranslateButton({
  text,
  sourceLang,
  className,
  children,
}: ReviewTranslateButtonProps) {
  const locale = useLocale()
  const t = useTranslations('reviews')
  const [translated, setTranslated] = useState<string | null>(null)
  const [attribution, setAttribution] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const showingTranslation = translated !== null

  // Failsafe: don't render for very short texts or same-language reviews
  if (!text || text.trim().length < 10) return null
  if (sourceLang && sourceLang.slice(0, 2).toLowerCase() === locale.slice(0, 2).toLowerCase()) {
    return <>{children}</>
  }

  async function onTranslate() {
    if (showingTranslation) {
      setTranslated(null)
      setAttribution('')
      setError(null)
      return
    }
    startTransition(async () => {
      // Reset error inside the transition so React batches it with the pending
      // state — prevents a second rapid click from reading stale `showingTranslation`
      // and firing a second overlapping fetch.
      setError(null)
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            sourceLang,
            targetLang: locale.slice(0, 2),
          }),
        })
        if (!res.ok) throw new Error('translate-failed')
        const data = (await res.json()) as {
          translated: string
          attribution: string
          provider: string
        }
        if (data.provider === 'noop') {
          setError(t('translateError'))
          return
        }
        setTranslated(data.translated)
        setAttribution(data.attribution)
      } catch {
        setError(t('translateError'))
      }
    })
  }

  return (
    <div className={className}>
      {/* Review body: show translated text or original children */}
      {showingTranslation ? (
        <div className="text-foreground/70 italic leading-relaxed text-sm mb-2">
          &ldquo;{translated}&rdquo;
        </div>
      ) : (
        children
      )}

      {/* Attribution shown only when translated */}
      {showingTranslation && attribution && (
        <p className="text-xs text-foreground/40 mb-1">{attribution}</p>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-foreground/50 mb-1">{error}</p>
      )}

      {/* Translate / Show original button */}
      <button
        type="button"
        onClick={onTranslate}
        disabled={isPending}
        className="inline-flex items-center gap-1 text-xs text-foreground/60 underline hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-wait"
        aria-label={showingTranslation ? t('showOriginal') : t('translateAria')}
      >
        {isPending ? (
          <span>{t('translating')}</span>
        ) : showingTranslation ? (
          <span>{t('showOriginal')}</span>
        ) : (
          <>
            <TranslateIcon />
            <span>{t('translateButton')}</span>
          </>
        )}
      </button>
    </div>
  )
}

function TranslateIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 8 6 6" />
      <path d="m4 14 6-6 2-3" />
      <path d="M2 5h12" />
      <path d="M7 2h1" />
      <path d="m22 22-5-10-5 10" />
      <path d="M14 18h6" />
    </svg>
  )
}
