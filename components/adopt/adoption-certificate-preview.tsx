'use client'

/**
 * AdoptionCertificatePreview — visual mockup of the adoption certificate.
 *
 * Makes the abstract "adoption certificate" benefit concrete. Renders as a
 * stylised paper certificate card so donors can see what they'll receive
 * before they pay.
 *
 * Reactive behaviour:
 *   - Reads `?alpaca=<slug>` from the URL via useSearchParams so the preview
 *     updates instantly when the AlpacaPicker changes (no full reload).
 *   - Accepts an `initialAlpacaName` prop (resolved server-side) used on the
 *     first render to avoid a flash.
 *   - Shows a small inline input ("Enter your name to preview") so adopters
 *     can see their own name on the certificate before paying. Local state
 *     only — no URL persistence. Debounced 200ms. Validates: ≤ 80 chars,
 *     strips HTML tags and control characters.
 *
 * All copy localised through the next-intl useTranslations hook.
 */

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { findAlpacaName } from '@/lib/data/alpacas'

interface AdoptionCertificatePreviewProps {
  /** Heading above the preview, e.g. "Your adoption certificate". */
  title: string
  /** Subheading explaining what the certificate is. */
  subtitle: string
  /** Localised "Adoption certificate" header rendered ON the certificate itself. */
  certificateLabel: string
  /** Localised "presented to" copy. */
  presentedToLabel: string
  /** Localised "is the proud sponsor of" copy. */
  sponsorOfLabel: string
  /** Localised footer line on the certificate (e.g. "Es Currals, Ibiza"). */
  certificateFooter: string
  /**
   * SSR-resolved alpaca name (from the page's selectedAlpacaSlug).
   * The component overrides this with the live URL param on mount so the
   * preview stays in sync when the picker changes without a page reload.
   */
  initialAlpacaName: string | null
  /** Localised placeholder name shown when no alpaca is selected. */
  alpacaPlaceholder: string
  /** Localised placeholder for donor name (shown until the adopter types). */
  donorPlaceholder: string
}

/** Strip HTML tags and ASCII control chars from a candidate name (client-side). */
function sanitiseName(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/[\r\n\t\x00-\x1F]+/g, ' ')
    .trim()
    .slice(0, 80)
}

export function AdoptionCertificatePreview({
  title,
  subtitle,
  certificateLabel,
  presentedToLabel,
  sponsorOfLabel,
  certificateFooter,
  initialAlpacaName,
  alpacaPlaceholder,
  donorPlaceholder,
}: AdoptionCertificatePreviewProps) {
  const translate = useTranslations()
  const searchParams = useSearchParams()

  // Live alpaca name from URL param — overrides the SSR prop so the certificate
  // updates instantly when the AlpacaPicker changes the ?alpaca= query string.
  const alpacaSlug = searchParams?.get('alpaca') ?? null
  const liveAlpacaName = alpacaSlug ? findAlpacaName(alpacaSlug) : null
  const displayAlpaca = liveAlpacaName ?? initialAlpacaName ?? alpacaPlaceholder

  // Local donor-name state — preview only, never sent to the server.
  // Debounced 200ms to avoid re-renders on every keystroke.
  const [inputValue, setInputValue] = useState('')
  const [displayDonor, setDisplayDonor] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const clean = sanitiseName(inputValue)
      setDisplayDonor(clean)
    }, 200)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [inputValue])

  const donorLabel = displayDonor.length > 0 ? displayDonor : donorPlaceholder

  return (
    <section aria-labelledby="cert-preview-heading" className="w-full">
      <div className="text-center mb-8">
        <h2
          id="cert-preview-heading"
          className="text-3xl md:text-4xl font-bold text-foreground mb-3"
        >
          {title}
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* The certificate itself — styled to look like paper, with decorative border */}
        <div
          role="img"
          aria-label={`${certificateLabel}: ${displayAlpaca}`}
          className="relative aspect-[4/3] bg-gradient-to-br from-[#fdf8ef] to-[#f3ead3] border-4 border-double border-primary/40 rounded-lg shadow-xl p-8 md:p-12 flex flex-col items-center justify-center text-center overflow-hidden"
        >
          {/* Ornamental corner stamps */}
          <CornerStamp className="top-3 left-3" />
          <CornerStamp className="top-3 right-3 rotate-90" />
          <CornerStamp className="bottom-3 left-3 -rotate-90" />
          <CornerStamp className="bottom-3 right-3 rotate-180" />

          {/* Centre seal */}
          <span
            aria-hidden="true"
            className="text-3xl md:text-4xl mb-3"
            style={{ filter: 'sepia(40%)' }}
          >
            🦙
          </span>

          <p className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.3em] text-primary/70 mb-2">
            {certificateLabel}
          </p>

          <p className="text-xs md:text-sm text-muted-foreground italic mb-1">
            {presentedToLabel}
          </p>
          <p className="text-xl md:text-2xl font-serif font-semibold text-foreground/90 mb-4 border-b border-primary/20 pb-1 min-w-[60%]">
            {donorLabel}
          </p>

          <p className="text-xs md:text-sm text-muted-foreground italic mb-1">
            {sponsorOfLabel}
          </p>
          <p className="text-2xl md:text-4xl font-serif font-bold text-primary mb-6">
            {displayAlpaca}
          </p>

          <p className="text-[9px] md:text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {certificateFooter}
          </p>
        </div>

        {/* Caption under the preview — sets expectations that it's a preview */}
        <p className="text-xs text-center text-muted-foreground italic mt-3">
          {translate('adopt.certPreviewCaption')}
        </p>

        {/* Donor-name preview input — conversion lever. Local state only. */}
        <div className="mt-5 flex flex-col items-center gap-1.5">
          <label
            htmlFor="cert-preview-name"
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
          >
            {translate('adopt.certPreview.namePromptLabel')}
          </label>
          <input
            id="cert-preview-name"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            maxLength={80}
            aria-label={translate('adopt.certPreview.nameInputAria')}
            placeholder={translate('adopt.certPreview.namePlaceholder')}
            className="w-full max-w-xs rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 text-center"
          />
        </div>
      </div>
    </section>
  )
}

function CornerStamp({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute h-5 w-5 md:h-6 md:w-6 border-l-2 border-t-2 border-primary/40 ${className}`}
    />
  )
}
