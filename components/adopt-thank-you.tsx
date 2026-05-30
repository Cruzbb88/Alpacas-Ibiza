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
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ShareButtons } from '@/components/share-buttons'
import { trackEvent } from '@/lib/client-track'
import { getTranslation } from '@/lib/translations'
import type { Locale } from '@/i18n.config'
import { MOLLIE_PENDING_STATES } from '@/lib/checkout-states'

export interface AdoptThankYouProps {
  readonly locale: Locale
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

  // A donor returning from Mollie hosted/embedded lands with one of these
  // states. They are NOT 'success' yet — for SEPA the bank can take 1-5 days
  // to confirm — but the marketing page must NOT re-render under them or the
  // donor will think payment failed and pay again. Treat as a success surface
  // with a pending-state banner.
  const isPending = (MOLLIE_PENDING_STATES as ReadonlyArray<string>).includes(checkoutState ?? '')
  const isSuccessLike = checkoutState === 'success' || isPending

  // ── Funnel analytics ────────────────────────────────────────────────────
  // Fire adopt_checkout_succeeded / adopt_checkout_cancelled exactly once per
  // mount. The ref guards against StrictMode double-effect in dev. Tier is
  // already a public query param — no PII, no amount, no donor identifiers.
  const trackedRef = useRef(false)
  useEffect(() => {
    if (trackedRef.current) return
    if (!isSuccessLike && checkoutState !== 'cancelled') return
    const rawTier = params.get('tier')
    const tier: 'monthly' | 'yearly' = rawTier === 'yearly' ? 'yearly' : 'monthly'
    trackedRef.current = true
    try {
      trackEvent(
        isSuccessLike ? 'adopt_checkout_succeeded' : 'adopt_checkout_cancelled',
        { tier },
      )
    } catch {
      // Never let analytics break the thank-you render.
    }
  }, [checkoutState, params, isSuccessLike, isPending])

  const tr = (key: string, fallback: string) => getTranslation(locale, key, fallback)

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
          {tr('adopt.canceledBody', 'No worries — your adoption was not processed. You can try again any time.')}
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
  if (!isSuccessLike) return null

  // ── Success screen ──────────────────────────────────────────────────────────
  const tierRaw = params.get('tier')
  const tier: 'monthly' | 'yearly' = tierRaw === 'yearly' ? 'yearly' : 'monthly'
  const tierCopy = isPending
    ? tr(
        'adopt.thankYou.pendingCopy',
        'Your payment is being processed. SEPA bank transfers take 1-5 business days to clear — your welcome email will arrive once the funds settle.',
      )
    : tier === 'yearly'
      ? tr('adopt.thankYou.tierYearly', 'Your €900 yearly adoption (12 months coverage) is now active.')
      : tr('adopt.thankYou.tierMonthly', 'Your €75/month adoption is now active.')

  /**
   * Personalised welcome params.
   *
   * <!-- TODO: the checkout route must thread donor_name and alpaca_name into
   * success_url for these to fire in production. e.g.:
   *   success_url = `${SITE_BASE_URL}/${locale}/adopt?checkout=success&donor_name=…&alpaca_name=…`
   * That change lives in the checkout / webhook territory (parallel AI's scope). -->
   */
  const sanitiseParam = (raw: string | null): string | null => {
    if (!raw) return null
    // Strip HTML tags, trim, cap at 80 chars
    const stripped = raw.replace(/<[^>]*>/g, '').trim().slice(0, 80)
    return stripped.length > 0 ? stripped : null
  }

  const donorName = sanitiseParam(params.get('donor_name'))
  const alpacaName = sanitiseParam(params.get('alpaca_name'))

  const headingText = donorName
    ? tr('adopt.thankYou.welcomeNamed', 'Welcome to the herd, {name}!').replace('{name}', donorName)
    : tr('adopt.thankYou.welcome', 'Welcome to the herd')
  const alpacaLine = alpacaName
    ? tr('adopt.thankYou.alpacaLine', "You've adopted {name}").replace('{name}', alpacaName)
    : null

  const waNumber = whatsappE164 ? whatsappE164.replace(/[^\d]/g, '') : null

  return (
    <section className="w-full py-20 px-4 bg-gradient-to-br from-primary/10 to-accent/10">
      <div className="max-w-3xl mx-auto text-center">
        <div className="text-6xl mb-6" aria-hidden="true">🦙</div>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
          {headingText}
        </h1>
        {isPending && (
          <div
            role="status"
            aria-live="polite"
            className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            <strong>{tr('adopt.thankYou.pendingBadge', 'Payment processing')}</strong>
            {' — '}
            {tr(
              'adopt.thankYou.pendingDetail',
              "Your bank is confirming the transfer. We'll email you the moment it clears (usually 1-2 business days for SEPA).",
            )}
          </div>
        )}
        {alpacaLine && (
          <p className="text-xl font-semibold text-primary mb-2">{alpacaLine}</p>
        )}
        <p className="text-lg text-foreground/70 mb-8">{tierCopy}</p>

        {/* Receipt / next-steps timeline */}
        <div className="bg-background rounded-2xl p-8 text-left shadow-sm border border-border mb-8">
          <h2 className="text-xl font-bold text-foreground mb-4">
            {tr('adopt.thankYou.whatsNext', 'What happens next')}
          </h2>
          <ol className="space-y-3 text-foreground/80 list-none">
            <li>
              {tr('adopt.thankYou.stepNow', "Now: a welcome email landed in your inbox with your adoption details (check spam if you don't see it within 2 minutes).")}
            </li>
            <li>
              {tr('adopt.thankYou.step24h', 'Within 24 hours: a follow-up email with your supporter discount codes (10% Wishfulfilling Weaving, 15% Farm Shop).')}
            </li>
            <li>
              {tr('adopt.thankYou.stepThisWeek', "This week: we'll personally assign you a herd member and send their name + photo.")}
            </li>
            <li>
              {tr('adopt.thankYou.stepEachMonth', 'Each month: photo + update of your sponsored alpaca, plus an open invitation to visit Es Currals.')}
            </li>
          </ol>
        </div>

        {/* Support contacts */}
        <p className="text-sm text-foreground/60 mb-6">
          {tr('adopt.thankYou.needHelpPrefix', 'Need help? Reach the team at')}{' '}
          <a
            href={`mailto:${contactEmail}`}
            className="text-primary underline"
          >
            {contactEmail}
          </a>
          {waNumber && (
            <>
              {' '}{tr('adopt.thankYou.orWhatsApp', 'or')}{' '}
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

        {/* Download certificate */}
        {(() => {
          const certParams = new URLSearchParams()
          if (donorName) certParams.set('donor_name', donorName)
          if (alpacaName) certParams.set('alpaca_name', alpacaName)
          const certHref = `/api/adopt-certificate?${certParams.toString()}`
          return (
            <a
              href={certHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 mb-4"
            >
              {tr('adopt.thankYou.downloadCert', 'Download your certificate (PDF)')}
            </a>
          )
        })()}

        {/* Back to farm */}
        <Link
          href={`/${locale}`}
          className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          {tr('adopt.thankYou.backToFarm', 'Back to the farm →')}
        </Link>
      </div>
    </section>
  )
}
