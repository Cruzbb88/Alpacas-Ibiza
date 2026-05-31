'use client'

/**
 * AdoptThankYou — post-checkout success/cancelled screen.
 *
 * Renders ONLY when ?checkout=success (full-bleed thank-you),
 * ?checkout=cancelled (full-page no-charge notice),
 * or ?checkout=mollie-return&status=canceled (same). Returns null otherwise
 * so the parent page renders its normal marketing content.
 *
 * Failsafe: if tier param is missing or unrecognised, defaults to 'monthly'
 * so a paid donor never sees the marketing pitch instead of a success screen.
 *
 * Must be wrapped in <Suspense> in the parent (App Router requirement for
 * useSearchParams in a page that may be statically rendered).
 */

import { useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { ShareButtons } from '@/components/share-buttons'
import { trackEvent } from '@/lib/client-track'
import { useTranslations } from 'next-intl'
import type { Locale } from '@/i18n.config'
import { MOLLIE_PENDING_STATES } from '@/lib/checkout-states'

export interface AdoptThankYouProps {
  readonly locale: Locale
  readonly contactEmail: string
  readonly whatsappE164: string | null
  readonly siteUrl: string
  /** Validated referral code (ALPACA-XXXXXX). Passed to ShareButtons so shares carry the donor's referral tag. */
  readonly referralCode?: string | null
}

export function AdoptThankYou({
  locale,
  contactEmail,
  whatsappE164,
  siteUrl,
  referralCode,
}: AdoptThankYouProps) {
  const params = useSearchParams()
  const checkoutState = params.get('checkout')

  // Detect Mollie cancelled: donor closed the hosted checkout before paying.
  // Mollie sends them back with ?checkout=mollie-return&status=canceled.
  // Must be computed BEFORE isPending so mollie-return+canceled is excluded
  // from the success path.
  const mollieCancelled =
    checkoutState === 'mollie-return' && params.get('status') === 'canceled'

  // A donor returning from Mollie hosted/embedded lands with one of these
  // states. They are NOT 'success' yet — for SEPA the bank can take 1-5 days
  // to confirm — but the marketing page must NOT re-render under them or the
  // donor will think payment failed and pay again. Treat as a success surface
  // with a pending-state banner.
  // Exception: mollie-return with status=canceled is a cancellation, not pending.
  const isPending =
    !mollieCancelled &&
    (MOLLIE_PENDING_STATES as ReadonlyArray<string>).includes(checkoutState ?? '')
  const isSuccessLike = checkoutState === 'success' || isPending

  // ── Funnel analytics ────────────────────────────────────────────────────
  // Fire adopt_checkout_succeeded / adopt_checkout_cancelled exactly once per
  // mount. The ref guards against StrictMode double-effect in dev. Tier is
  // already a public query param — no PII, no amount, no donor identifiers.
  const isCancelledState = checkoutState === 'cancelled' || mollieCancelled
  const trackedRef = useRef(false)
  useEffect(() => {
    if (trackedRef.current) return
    if (!isSuccessLike && !isCancelledState) return
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
  }, [checkoutState, params, isSuccessLike, isPending, isCancelledState])

  const tr = useTranslations()

  // ── Cancelled full-page state ───────────────────────────────────────────────
  // Handles ?checkout=cancelled (Stripe) and ?checkout=mollie-return&status=canceled
  // (Mollie hosted checkout — donor closed before paying). Both: no charge taken.
  if (isCancelledState) {
    return (
      <div
        role="alert"
        className="mx-auto max-w-2xl text-center py-10 px-4"
      >
        <h1 className="text-2xl font-bold text-foreground">
          {tr('adopt.cancelledHeading')}
        </h1>
        <p className="mt-4 text-foreground/70">
          {tr('adopt.cancelledFullBody')}
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={`/${locale}/adopt#cta`}
            className="inline-block rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {tr('adopt.cancelledTryAgain')}
          </a>
          <a
            href={`/${locale}/contact`}
            className="inline-block rounded-lg border border-border px-6 py-3 text-sm font-semibold text-foreground hover:bg-primary/5"
          >
            {tr('adopt.cancelledTellUs')}
          </a>
        </div>
      </div>
    )
  }

  // ── Not a success redirect — render nothing ─────────────────────────────────
  if (!isSuccessLike) return null

  // ── Success screen ──────────────────────────────────────────────────────────
  const tierRaw = params.get('tier')
  const tier: 'monthly' | 'yearly' = tierRaw === 'yearly' ? 'yearly' : 'monthly'
  const tierCopy = isPending
    ? tr('adopt.thankYou.pendingCopy')
    : tier === 'yearly'
      ? tr('adopt.thankYou.tierYearly')
      : tr('adopt.thankYou.tierMonthly')

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
    ? tr('adopt.thankYou.welcomeNamed').replace('{name}', donorName)
    : tr('adopt.thankYou.welcome')
  const alpacaLine = alpacaName
    ? tr('adopt.thankYou.alpacaLine').replace('{name}', alpacaName)
    : null

  const waNumber = whatsappE164 ? whatsappE164.replace(/[^\d]/g, '') : null
  // session_id is threaded from Stripe's {CHECKOUT_SESSION_ID} template in the
  // success_url. Mollie and gift flows won't have it — hide the calendar button.
  const sessionId = params.get('session_id')

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
            <strong>{tr('adopt.thankYou.pendingBadge')}</strong>
            {' — '}
            {tr('adopt.thankYou.pendingDetail')}
          </div>
        )}
        {alpacaLine && (
          <p className="text-xl font-semibold text-primary mb-2">{alpacaLine}</p>
        )}
        <p className="text-lg text-foreground/70 mb-8">{tierCopy}</p>

        {/* Receipt / next-steps timeline */}
        <div className="bg-background rounded-2xl p-8 text-left shadow-sm border border-border mb-8">
          <h2 className="text-xl font-bold text-foreground mb-4">
            {tr('adopt.thankYou.whatsNext')}
          </h2>
          <ol className="space-y-3 text-foreground/80 list-none">
            <li>
              {tr('adopt.thankYou.stepNow')}
            </li>
            <li>
              {tr('adopt.thankYou.step24h')}
            </li>
            <li>
              {tr('adopt.thankYou.stepThisWeek')}
            </li>
            <li>
              {tr('adopt.thankYou.stepEachMonth')}
            </li>
          </ol>
        </div>

        {/* Support contacts */}
        <p className="text-sm text-foreground/60 mb-6">
          {tr('adopt.thankYou.needHelpPrefix')}{' '}
          <a
            href={`mailto:${contactEmail}`}
            className="text-primary underline"
          >
            {contactEmail}
          </a>
          {waNumber && (
            <>
              {' '}{tr('adopt.thankYou.orWhatsApp')}{' '}
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
            referralCode={referralCode ?? undefined}
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
              {tr('adopt.thankYou.downloadCert')}
            </a>
          )
        })()}

        {/* Calendar download — only available when session_id is present (Stripe flow).
            Mollie and gift paths skip this block gracefully. */}
        {sessionId && (
          <div className="mb-4">
            <a
              href={`/api/calendar/renewal/${sessionId}`}
              className="inline-block rounded-lg border border-primary px-6 py-3 text-sm font-semibold text-primary hover:bg-primary/5"
            >
              {tr('adopt.thankYou.calendarDownload')}
            </a>
            <p className="mt-2 text-xs text-foreground/50">
              {tr('adopt.thankYou.calendarHint')}
            </p>
          </div>
        )}

        {/* Back to farm */}
        <Link
          href={`/${locale}`}
          className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          {tr('adopt.thankYou.backToFarm')}
        </Link>

        {/* Certificate recovery — shown below the main CTAs so donors who
            misplaced a prior certificate can self-serve without contacting support. */}
        <p className="mt-6 text-xs text-foreground/50">
          {tr('adopt.thankYou.lostCertPrefix')}{' '}
          <Link
            href={`/${locale}/recover-certificate`}
            className="text-primary underline hover:text-primary/80"
          >
            {tr('adopt.thankYou.lostCertLink')}
          </Link>
        </p>
      </div>
    </section>
  )
}
