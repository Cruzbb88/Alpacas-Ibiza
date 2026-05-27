'use client'

/**
 * AdoptThankYou — post-checkout success/cancelled screen.
 *
 * Renders ONLY when ?checkout=success (full-bleed thank-you) or
 * ?checkout=cancelled (dismissible banner). Returns null otherwise so
 * the parent page renders its normal marketing content.
 *
 * Failsafe: if tier param is missing or unrecognised, defaults to 'monthly'
 * so a paid donor never sees the marketing pitch instead of a success screen.
 *
 * Must be wrapped in <Suspense> in the parent (App Router requirement for
 * useSearchParams in a page that may be statically rendered).
 */

import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShareButtons } from '@/components/share-buttons'

export interface AdoptThankYouProps {
  readonly locale: string
  readonly contactEmail: string
  readonly whatsappE164: string | null
  readonly siteUrl: string
}

export function AdoptThankYou({
  locale,
  contactEmail,
  whatsappE164,
  siteUrl,
}: AdoptThankYouProps) {
  const params = useSearchParams()
  const checkoutState = params.get('checkout')
  const [cancelledVisible, setCancelledVisible] = useState(true)

  // Auto-hide the cancelled banner after 5 seconds
  useEffect(() => {
    if (checkoutState !== 'cancelled') return
    const id = setTimeout(() => setCancelledVisible(false), 5000)
    return () => clearTimeout(id)
  }, [checkoutState])

  // ── Cancelled banner ────────────────────────────────────────────────────────
  if (checkoutState === 'cancelled') {
    if (!cancelledVisible) return null
    return (
      <div
        role="status"
        aria-live="polite"
        className="animate-fade-out-slow bg-muted border-l-4 border-border px-4 py-4 my-4 max-w-3xl mx-auto rounded flex items-center justify-between gap-4"
      >
        <p className="text-foreground text-sm">
          No charge — you can adopt anytime.
        </p>
        <button
          type="button"
          onClick={() => setCancelledVisible(false)}
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground text-xs shrink-0"
        >
          ✕
        </button>
      </div>
    )
  }

  // ── Not a success redirect — render nothing ─────────────────────────────────
  if (checkoutState !== 'success') return null

  // ── Success screen ──────────────────────────────────────────────────────────
  const tierRaw = params.get('tier')
  const tier: 'monthly' | 'yearly' = tierRaw === 'yearly' ? 'yearly' : 'monthly'
  const tierCopy =
    tier === 'yearly'
      ? 'Your €900 yearly adoption (12 months coverage) is now active.'
      : 'Your €75/month adoption is now active.'

  const waNumber = whatsappE164 ? whatsappE164.replace(/[^\d]/g, '') : null

  return (
    <section className="w-full py-20 px-4 bg-gradient-to-br from-primary/10 to-accent/10">
      <div className="max-w-3xl mx-auto text-center">
        <div className="text-6xl mb-6" aria-hidden="true">🦙</div>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
          Welcome to the herd
        </h1>
        <p className="text-lg text-foreground/70 mb-8">{tierCopy}</p>

        {/* Receipt / next-steps timeline */}
        <div className="bg-background rounded-2xl p-8 text-left shadow-sm border border-border mb-8">
          <h2 className="text-xl font-bold text-foreground mb-4">
            What happens next
          </h2>
          <ol className="space-y-3 text-foreground/80 list-none">
            <li>
              <strong>Now:</strong> a welcome email landed in your inbox with your
              adoption details (check spam if you don&apos;t see it within 2 minutes).
            </li>
            <li>
              <strong>Within 24 hours:</strong> a follow-up email with your supporter
              discount codes (10% Wishfulfilling Weaving, 15% Farm Shop).
            </li>
            <li>
              <strong>This week:</strong> we&apos;ll personally assign you a herd member
              and send their name + photo.
            </li>
            <li>
              <strong>Each month:</strong> photo + update of your sponsored alpaca,
              plus an open invitation to visit Es Currals.
            </li>
          </ol>
        </div>

        {/* Support contacts */}
        <p className="text-sm text-foreground/60 mb-6">
          Need help? Reach the team at{' '}
          <a
            href={`mailto:${contactEmail}`}
            className="text-primary underline"
          >
            {contactEmail}
          </a>
          {waNumber && (
            <>
              {' '}or{' '}
              <a
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                WhatsApp
              </a>
            </>
          )}
          .
        </p>

        {/* Share strip */}
        <div className="flex justify-center mb-8">
          <ShareButtons
            url={`${siteUrl}/${locale}/adopt`}
            title="I just adopted an alpaca at Es Currals Ibiza"
          />
        </div>

        {/* Back to farm */}
        <Link
          href={`/${locale}`}
          className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          Back to the farm →
        </Link>
      </div>
    </section>
  )
}
