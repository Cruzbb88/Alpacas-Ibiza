'use client'

/**
 * EmbeddedMollieCheckout — Mollie Components payment form for the Adopt-a-Paca flow.
 *
 * Mollie counterpart of components/adopt/embedded-checkout.tsx (Stripe Elements).
 * Stage 1-2 of the embedded checkout migration (docs/embedded-checkout-migration.md).
 *
 * Lifecycle:
 *   1. Mount → next/script lazy-loads https://js.mollie.com/v1/mollie.js.
 *   2. POST /api/mollie-checkout/intent → receive { paymentId, profileId, testmode, locale }.
 *   3. window.Mollie(profileId, { locale, testmode }) → Mollie instance.
 *   4. Mount cardNumber / cardHolder / expiryDate / verificationCode components
 *      into the named slots below.
 *   5. User fills first field → fires adopt_payment_field_focused once.
 *   6. User clicks Confirm → mollie.createToken() → POST { paymentId, token } to
 *      /api/mollie-checkout/confirm.
 *   7. On { ok: true } → redirect to /<locale>/adopt?checkout=success&tier=<tier>
 *      (matches Stripe variant's success URL — AdoptThankYou picks it up).
 *
 * Bundle-bloat hygiene:
 *   - Mollie.js is loaded via <Script strategy="lazyOnload">. The SDK only
 *     downloads when this component actually mounts (CHECKOUT_MODE='embedded'
 *     AND PAYMENT_VENDOR='mollie'). The server-side gate in
 *     app/[locale]/adopt/page.tsx ensures the Script tag never even reaches a
 *     hosted-mode donor's browser.
 *   - The Mollie SDK has no npm package — `next/script` is the only sane way
 *     to load it (npm install would just wrap the same CDN URL).
 *
 * Manual integration test (run from project root):
 *   1. Owner installs deps via deploy step: `pnpm add @mollie/api-client`
 *      (already optional dep) — no Mollie.js install needed (CDN loaded).
 *   2. Set CHECKOUT_MODE=embedded, PAYMENT_VENDOR=mollie,
 *      MOLLIE_API_KEY=test_xxx, MOLLIE_WEBHOOK_SECRET=…,
 *      MOLLIE_PROFILE_ID=pfl_xxx in .env.local.
 *   3. `pnpm dev`, navigate to /en/adopt.
 *   4. Pick a tier — embedded Mollie form should appear below the tier cards.
 *   5. Use Mollie test card 4543 4740 0224 9996, any future date, any CVC.
 *   6. Confirm → success redirect to /en/adopt?checkout=success.
 *   7. Verify GA4 DebugView fires: adopt_payment_field_focused (once on first
 *      input focus), adopt_payment_confirmed (on submit click).
 *   8. Verify webhook fires payment.paid → welcome email sent.
 *   9. Flip CHECKOUT_MODE=hosted → component vanishes, hosted CTAs return.
 *
 * Failure modes to verify:
 *   - Mollie SDK CDN blocked → component shows "Mollie payment field
 *     unavailable" notice, never crashes.
 *   - createToken() error → error state preserved, "Confirm payment" re-enables.
 *   - paymentId fetch failure → error state with mailto fallback hint.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { trackEvent } from '@/lib/client-track'
import { fetchWithRetry } from '@/lib/client-retry'
import type { ParsedGiftFields } from '@/lib/gift-fields'
import { ADOPT_PRICE_MONTHLY_EUR, ADOPT_PRICE_YEARLY_EUR } from '@/lib/config'
import { formatPriceForLocale } from '@/lib/format-price'

export interface EmbeddedMollieCheckoutProps {
  tier: 'monthly' | 'yearly'
  alpacaSlug: string | null
  isGift: boolean
  /** Parsed gift fields when isGift is true. Threaded into Payment metadata. */
  giftFields?: ParsedGiftFields | null
  locale: string
  /** Optional fallback URL for the hosted checkout page. When provided, an
   *  escape-hatch link is shown inside the error banner so donors can still pay. */
  fallbackHostedUrl?: string
}

// ── Mollie SDK shapes ───────────────────────────────────────────────────────
// Mollie.js does not ship its own TS types. The shapes below are the documented
// public API per https://docs.mollie.com/reference/components. Kept narrow on
// purpose — anything we don't call stays unknown.

type MollieComponentType =
  | 'card'
  | 'cardNumber'
  | 'cardHolder'
  | 'expiryDate'
  | 'verificationCode'

interface MollieComponent {
  mount(selector: string): void
  unmount(): void
  addEventListener(event: 'focus' | 'blur' | 'change', cb: () => void): void
}

interface MollieInstance {
  createComponent(type: MollieComponentType): MollieComponent
  createToken(): Promise<{ token?: string; error?: { message?: string } }>
}

interface MollieFactory {
  (
    profileId: string,
    options: { locale?: string; testmode?: boolean },
  ): MollieInstance
}

interface MollieWindow {
  Mollie?: MollieFactory
}

interface IntentResponse {
  paymentId?: string
  profileId?: string
  testmode?: boolean
  locale?: string
}

// ── Component ───────────────────────────────────────────────────────────────

export function EmbeddedMollieCheckout(props: EmbeddedMollieCheckoutProps) {
  const [sdkReady, setSdkReady] = useState<boolean>(() => {
    // If the SDK is already loaded from a previous mount, skip the Script wait.
    if (typeof window === 'undefined') return false
    return typeof (window as unknown as MollieWindow).Mollie === 'function'
  })
  const [intent, setIntent] = useState<{
    paymentId: string
    profileId: string
    testmode: boolean
    locale: string
  } | null>(null)
  const [initError, setInitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const mollieRef = useRef<MollieInstance | null>(null)
  const componentsRef = useRef<MollieComponent[]>([])
  const focusedRef = useRef<boolean>(false)

  // 1) Create the PaymentIntent on mount.
  useEffect(() => {
    let cancelled = false
    async function createIntent() {
      try {
        const res = await fetchWithRetry('/api/mollie-checkout/intent', {
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
        const data = (await res.json()) as IntentResponse
        if (cancelled) return
        if (!data.paymentId || !data.profileId) {
          throw new Error('Intent response missing paymentId or profileId')
        }
        setIntent({
          paymentId: data.paymentId,
          profileId: data.profileId,
          testmode: Boolean(data.testmode),
          locale: data.locale ?? props.locale,
        })
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
  }, [props.tier, props.alpacaSlug, props.isGift, props.giftFields, props.locale])

  // 2) Once both SDK + intent are available, instantiate Mollie() + mount slots.
  useEffect(() => {
    if (!sdkReady || !intent || mounted) return
    const w = window as unknown as MollieWindow
    if (typeof w.Mollie !== 'function') {
      setInitError('Mollie SDK loaded but window.Mollie is not callable.')
      return
    }
    try {
      const mollie = w.Mollie(intent.profileId, {
        locale: mapLocaleForMollie(intent.locale),
        testmode: intent.testmode,
      })
      mollieRef.current = mollie

      // Per Mollie Components docs the four card fields mount into named slots.
      // For iDEAL / SEPA-direct-debit the donor picks them inside the Mollie
      // hosted-method confirmation when createToken resolves; we expose the
      // card primitives here so the donor can fill them inline.
      const cardNumber = mollie.createComponent('cardNumber')
      const cardHolder = mollie.createComponent('cardHolder')
      const expiryDate = mollie.createComponent('expiryDate')
      const verificationCode = mollie.createComponent('verificationCode')

      cardNumber.mount('#mollie-card-number')
      cardHolder.mount('#mollie-card-holder')
      expiryDate.mount('#mollie-expiry-date')
      verificationCode.mount('#mollie-verification-code')

      const onFocus = () => {
        if (focusedRef.current) return
        focusedRef.current = true
        try {
          trackEvent('adopt_payment_field_focused', {})
        } catch {
          // Never break the form.
        }
      }
      cardNumber.addEventListener('focus', onFocus)
      cardHolder.addEventListener('focus', onFocus)
      expiryDate.addEventListener('focus', onFocus)
      verificationCode.addEventListener('focus', onFocus)

      componentsRef.current = [cardNumber, cardHolder, expiryDate, verificationCode]
      setMounted(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Mollie mount failed'
      setInitError(message)
    }
  }, [sdkReady, intent, mounted])

  // 3) Tear down components on unmount so a re-mount doesn't double-attach.
  useEffect(() => {
    return () => {
      for (const c of componentsRef.current) {
        try {
          c.unmount()
        } catch {
          // Best-effort cleanup.
        }
      }
      componentsRef.current = []
    }
  }, [])

  // 4) SDK load timeout — if Mollie.js hasn't fired onLoad within 12 s (flaky
  //    WiFi, CDN outage), surface the error banner + fallbackHostedUrl link so
  //    the donor isn't left watching an infinite spinner.
  useEffect(() => {
    const t = setTimeout(() => {
      if (!sdkReady) setInitError(prev => prev ?? 'Secure payment field is taking too long to load.')
    }, 12000)
    return () => clearTimeout(t)
  }, [sdkReady])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!mollieRef.current || !intent || submitting) return
      setSubmitting(true)
      setSubmitError(null)

      try {
        trackEvent('adopt_payment_confirmed', { tier: props.tier, processor: 'mollie' })
      } catch {
        // Analytics never blocks payment.
      }

      try {
        const tokenResult = await mollieRef.current.createToken()
        if (tokenResult.error || !tokenResult.token) {
          setSubmitError(tokenResult.error?.message ?? 'Could not tokenise payment details.')
          setSubmitting(false)
          return
        }

        const res = await fetch('/api/mollie-checkout/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId: intent.paymentId, token: tokenResult.token }),
        })
        if (!res.ok) {
          const detail = await res.text().catch(() => '')
          throw new Error(`Confirm failed (${res.status}): ${detail.slice(0, 200)}`)
        }
        const data = (await res.json()) as { ok?: boolean; status?: string }
        if (!data.ok) {
          setSubmitError(
            data.status === 'open' || data.status === 'pending'
              ? 'Payment is still processing. Please check your email for confirmation.'
              : `Payment did not complete (status: ${data.status ?? 'unknown'}).`,
          )
          setSubmitting(false)
          return
        }

        // Match the Stripe variant's redirect target so AdoptThankYou shows.
        const successUrl = `${window.location.origin}/${props.locale}/adopt?checkout=success&tier=${props.tier}`
        window.location.assign(successUrl)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Payment failed. Please try again.'
        setSubmitError(message)
        setSubmitting(false)
      }
    },
    [intent, submitting, props.tier, props.locale],
  )

  // ── Render branches ───────────────────────────────────────────────────────

  if (initError) {
    return (
      <>
        {/* Script tag still mounted in case a retry succeeds — harmless. */}
        <Script
          src="https://js.mollie.com/v1/mollie.js"
          strategy="lazyOnload"
          onLoad={() => setSdkReady(true)}
          onError={() => setInitError('Mollie payment field could not load.')}
        />
        <div
          role="alert"
          className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive"
        >
          Could not start checkout. Please try again or email info@alpacasibiza.com.
          <span className="block mt-1 text-xs opacity-70">{initError}</span>
          {props.fallbackHostedUrl && (
            <a
              href={props.fallbackHostedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center rounded-lg border border-destructive/40 bg-background px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/5 transition-colors"
            >
              Try our hosted checkout instead
            </a>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      <Script
        src="https://js.mollie.com/v1/mollie.js"
        strategy="lazyOnload"
        onLoad={() => setSdkReady(true)}
        onError={() => setInitError('Mollie payment field could not load.')}
      />

      {!intent || !sdkReady || !mounted ? (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-foreground/70">
          Preparing secure payment field…
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className={
          'space-y-4 rounded-lg border border-border bg-card p-6' +
          (intent && sdkReady && mounted ? '' : ' hidden')
        }
        data-payment-id={intent?.paymentId ?? undefined}
      >
        {intent?.testmode && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
            Test mode — use Mollie test card 4543 4740 0224 9996.
          </p>
        )}
        <div>
          <label htmlFor="mollie-card-number" className="block text-sm font-medium text-foreground mb-1">
            Card number
          </label>
          <div id="mollie-card-number" className="rounded-md border border-input bg-background px-3 py-2" />
        </div>
        <div>
          <label htmlFor="mollie-card-holder" className="block text-sm font-medium text-foreground mb-1">
            Cardholder name
          </label>
          <div id="mollie-card-holder" className="rounded-md border border-input bg-background px-3 py-2" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="mollie-expiry-date" className="block text-sm font-medium text-foreground mb-1">
              Expiry
            </label>
            <div id="mollie-expiry-date" className="rounded-md border border-input bg-background px-3 py-2" />
          </div>
          <div>
            <label htmlFor="mollie-verification-code" className="block text-sm font-medium text-foreground mb-1">
              CVC
            </label>
            <div id="mollie-verification-code" className="rounded-md border border-input bg-background px-3 py-2" />
          </div>
        </div>

        {/* iDEAL / SEPA Direct Debit slots — Mollie Components surfaces these
            as additional radio options inside its mounted UI when the card slots
            are present. The slots below are reserved for an upcoming Components
            release; today they render as method-selector containers Mollie can
            attach UI into without us re-rendering. */}
        <div id="mollie-ideal" className="hidden" />
        <div id="mollie-sepa-direct-debit" className="hidden" />

        {submitError && (
          <p role="alert" className="text-sm text-destructive">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={!intent || !sdkReady || !mounted || submitting}
          className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
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
            `Confirm payment — ${formatPriceForLocale(props.tier === 'monthly' ? ADOPT_PRICE_MONTHLY_EUR : ADOPT_PRICE_YEARLY_EUR, props.locale)}${props.tier === 'monthly' ? ' / month' : ' / year'}`
          )}
        </button>
        <p className="text-xs text-foreground/60">
          Secured by Mollie. You will not be charged until payment is confirmed.
        </p>
      </form>
    </>
  )
}

/**
 * Mollie Components expects BCP-47-ish locales (en_US, nl_NL, de_DE…). Our
 * route locales are 2-letter codes; map to the nearest Mollie-supported value.
 * Unknown locales fall back to en_US (the Mollie default).
 */
function mapLocaleForMollie(routeLocale: string): string {
  switch (routeLocale) {
    case 'en':
      return 'en_US'
    case 'nl':
      return 'nl_NL'
    case 'es':
      return 'es_ES'
    case 'de':
      return 'de_DE'
    case 'it':
      return 'it_IT'
    case 'fr':
      return 'fr_FR'
    default:
      return 'en_US'
  }
}
