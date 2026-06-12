'use client'

/**
 * EmbeddedCheckout — Stripe Elements payment field for the Adopt-a-Paca flow.
 *
 * Stage 2 of the embedded checkout migration (docs/embedded-checkout-migration.md).
 *
 * Lifecycle:
 *   1. Mount → POST /api/checkout/intent → receive clientSecret + paymentIntentId.
 *   2. Render <Elements stripe={stripePromise} options={{clientSecret}}>.
 *   3. User fills <PaymentElement /> → fires adopt_payment_field_focused once.
 *   4. User clicks Confirm → stripe.confirmPayment({ return_url }).
 *   5. Stripe redirects to return_url on success → /adopt?checkout=success.
 *   6. Server webhook handles welcome email + subscription provisioning
 *      (source of truth). /api/checkout/confirm is a defence-in-depth check
 *      reserved for inline-confirmation flows that DON'T redirect (a future
 *      enhancement — Stage 4 of the migration plan).
 *
 * Bundle-bloat hygiene:
 *   - stripePromise is loaded via lazy `loadStripe()`. The chunk only ships
 *     when this component actually mounts (CHECKOUT_MODE === 'embedded'). The
 *     server-side gate in app/[locale]/adopt/page.tsx ensures the import never
 *     even reaches a hosted-mode donor's browser.
 *
 * Manual integration test (run from project root):
 *   1. `pnpm add @stripe/stripe-js @stripe/react-stripe-js`
 *   2. Set CHECKOUT_MODE=embedded, STRIPE_SECRET_KEY=sk_test_…,
 *      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_… in .env.local.
 *   3. `pnpm dev`, navigate to /en/adopt.
 *   4. Pick a tier — embedded form should appear below the tier cards.
 *   5. Use Stripe test card 4242 4242 4242 4242, any future date, any CVC.
 *   6. Confirm → redirect to /adopt?checkout=success.
 *   7. Verify GA4 DebugView fires: adopt_payment_field_focused (once on first
 *      input focus), adopt_payment_confirmed (on submit click).
 *   8. Verify webhook fires payment_intent.succeeded → welcome email sent.
 *   9. Flip CHECKOUT_MODE=hosted → component vanishes, hosted CTAs return.
 *
 * Failure modes to verify:
 *   - Bad card (4000 0000 0000 0002) → error state preserves the form,
 *     "Confirm payment" re-enables.
 *   - Network drop mid-confirm → error state, retry succeeds.
 *   - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY unset → component renders an inline
 *     warning, never crashes the page.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Stripe, StripeElementsOptions } from '@stripe/stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { trackEvent } from '@/lib/client-track'
import { fetchWithRetry } from '@/lib/client-retry'
import type { ParsedGiftFields } from '@/lib/gift-fields'
import { ADOPT_PRICE_MONTHLY_EUR, ADOPT_PRICE_YEARLY_EUR, SITE_BASE_URL } from '@/lib/config'
import { formatPriceForLocale } from '@/lib/format-price'

export interface EmbeddedCheckoutProps {
  tier: 'monthly' | 'yearly'
  alpacaSlug: string | null
  isGift: boolean
  /** Parsed gift fields when isGift is true. Threaded into PaymentIntent metadata. */
  giftFields?: ParsedGiftFields | null
  locale: string
  /** Optional fallback URL for the hosted checkout page. When provided, an
   *  escape-hatch link is shown inside the error banner so donors can still pay. */
  fallbackHostedUrl?: string
}

// Module-level cache so we only load the Stripe.js bundle once per session.
// `loadStripe` is itself memoised, but caching the Promise avoids re-running
// the publishable-key check on every component remount.
let _stripePromise: Promise<Stripe | null> | null = null
function getStripePromise(): Promise<Stripe | null> | null {
  if (_stripePromise) return _stripePromise
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!pk) return null
  _stripePromise = loadStripe(pk)
  return _stripePromise
}

/**
 * Outer wrapper — fetches the clientSecret + provides the Elements provider.
 * The actual <PaymentElement /> + submit button live in <PaymentForm /> because
 * useStripe() / useElements() must be called INSIDE <Elements>.
 */
export function EmbeddedCheckout(props: EmbeddedCheckoutProps) {
  const { fallbackHostedUrl } = props
  const stripePromise = useMemo(() => getStripePromise(), [])
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function createIntent() {
      try {
        const res = await fetchWithRetry('/api/checkout/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tier: props.tier,
            alpaca: props.alpacaSlug ?? undefined,
            ...(props.isGift && props.giftFields
              ? {
                  gift: {
                    recipientEmail: props.giftFields.recipientEmail,
                    recipientName: props.giftFields.recipientName,
                    senderName: props.giftFields.senderName,
                    message: props.giftFields.message,
                    sendDate: props.giftFields.sendDate,
                  },
                }
              : {}),
          }),
        })
        if (!res.ok) {
          const detail = await res.text().catch(() => '')
          throw new Error(`Intent creation failed (${res.status}): ${detail.slice(0, 200)}`)
        }
        const data = (await res.json()) as { clientSecret?: string; paymentIntentId?: string }
        if (cancelled) return
        if (!data.clientSecret || !data.paymentIntentId) {
          throw new Error('Intent response missing clientSecret')
        }
        setClientSecret(data.clientSecret)
        setPaymentIntentId(data.paymentIntentId)
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Unknown error'
        setInitError(message)
      }
    }
    void createIntent()
    return () => {
      cancelled = true
    }
  }, [props.tier, props.alpacaSlug, props.isGift, props.giftFields])

  if (!stripePromise) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
      >
        Embedded payment unavailable: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not configured.
        {fallbackHostedUrl && (
          <a
            href={fallbackHostedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block w-fit rounded-lg border border-amber-700 bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-200 transition-colors"
          >
            Try our hosted checkout instead
          </a>
        )}
      </div>
    )
  }

  if (initError) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive"
      >
        Could not start checkout. Please try again or email info@alpacasibiza.com.
        <span className="block mt-1 text-xs opacity-70">{initError}</span>
        {fallbackHostedUrl && (
          <a
            href={fallbackHostedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center rounded-lg border border-destructive/40 bg-background px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/5 transition-colors"
          >
            Try our hosted checkout instead
          </a>
        )}
      </div>
    )
  }

  if (!clientSecret) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-foreground/70">
        Preparing secure payment field…
      </div>
    )
  }

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: { theme: 'stripe' },
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm
        tier={props.tier}
        locale={props.locale}
        paymentIntentId={paymentIntentId}
      />
    </Elements>
  )
}

interface PaymentFormProps {
  tier: 'monthly' | 'yearly'
  locale: string
  paymentIntentId: string | null
}

function PaymentForm({ tier, locale, paymentIntentId }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const focusedRef = useRef(false)

  // Fire adopt_payment_field_focused once per mount when the donor first
  // interacts. Stripe's PaymentElement doesn't expose onFocus directly, so we
  // listen on the wrapping div in the capture phase.
  function handleFirstFocus() {
    if (focusedRef.current) return
    focusedRef.current = true
    try {
      trackEvent('adopt_payment_field_focused', {})
    } catch {
      // Never break the form.
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements || submitting) return
    setSubmitting(true)
    setSubmitError(null)

    try {
      trackEvent('adopt_payment_confirmed', { tier, processor: 'stripe' })
    } catch {
      // Analytics never blocks payment.
    }

    // Stripe redirects to return_url on success. Webhook handles the rest.
    // SITE_BASE_URL (not window.location.origin) per ADR 017 — keeps the Stripe
    // return_url on the canonical origin even on preview deploys.
    const returnUrl = `${SITE_BASE_URL}/${locale}/adopt?checkout=success&tier=${tier}`
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    })

    // confirmPayment only returns synchronously when there's an error. On
    // success the browser is already navigating to return_url.
    if (result.error) {
      setSubmitError(result.error.message ?? 'Payment failed. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      onFocusCapture={handleFirstFocus}
      className="space-y-4 rounded-lg border border-border bg-card p-6"
    >
      <PaymentElement
        options={{
          // Defer to Stripe's locale auto-detect; pass our route locale only as
          // a hint when it maps cleanly to a Stripe-supported value.
        }}
      />
      {submitError && (
        <p role="alert" className="text-sm text-destructive">
          {submitError}
        </p>
      )}
      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        data-payment-intent-id={paymentIntentId ?? undefined}
      >
        {submitting ? (
          <>
            <span
              aria-hidden="true"
              className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
            Processing…
          </>
        ) : (
          `Confirm payment — ${formatPriceForLocale(tier === 'monthly' ? ADOPT_PRICE_MONTHLY_EUR : ADOPT_PRICE_YEARLY_EUR, locale)}${tier === 'monthly' ? ' / month' : ' / year'}`
        )}
      </button>
      <p className="text-xs text-foreground/60">
        Secured by Stripe. You will not be charged until payment is confirmed.
      </p>
    </form>
  )
}
