'use client'

/**
 * AdoptGiftAdoption — "adopt for a friend" flow.
 *
 * Renders as a collapsible disclosure below the main CTAs. When opened,
 * shows a small form: recipient name, recipient email (optional), delivery
 * date (when the certificate should arrive). All three fields are stored
 * in URL query params so the checkout route can attach them to Stripe /
 * Mollie metadata, the webhook handler reads them, and the welcome email
 * addresses the recipient instead of the buyer.
 *
 * Form does NOT submit — it threads its state into the existing checkout
 * URLs via `?gift_name=&gift_email=&gift_deliver=`. Clicking the donor's
 * existing tier CTA picks up the latest values.
 *
 * "Reset" button clears all gift params from the URL so the donor is back
 * to a self-adoption.
 *
 * Validation:
 *   - Recipient name required when any other gift field is filled (server
 *     also re-validates).
 *   - Email validated by `type=email` browser primitive.
 *   - Delivery date constrained to future-only via `min={today}`.
 *
 * Bookmarkable, shareable, survives back-button — same URL-state pattern
 * as AlpacaPicker / AlpacaSearchFilter.
 */

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useTransition } from 'react'
import type { Locale } from '@/i18n.config'
import { t } from '@/lib/translations'
import { trackEvent } from '@/lib/client-track'

interface AdoptGiftAdoptionProps {
  locale: Locale
  /** Optional override heading. */
  heading?: string
}

export function AdoptGiftAdoption({ locale, heading }: AdoptGiftAdoptionProps) {
  const translate = t(locale)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const giftName = searchParams?.get('gift_name') ?? ''
  const giftEmail = searchParams?.get('gift_email') ?? ''
  const giftDeliver = searchParams?.get('gift_deliver') ?? ''
  const isGift = giftName.length > 0 || giftEmail.length > 0 || giftDeliver.length > 0

  // ── Analytics ───────────────────────────────────────────────────────────
  // adopt_gift_toggled fires whenever the URL state flips between gift / not.
  // adopt_gift_fields_completed fires once the donor has filled the required
  // name field AND at least one optional channel (send date OR email/message).
  // Refs guard against duplicate fires while the user keeps typing.
  const lastGiftEnabledRef = useRef<boolean | null>(null)
  const completedFiredRef = useRef(false)

  useEffect(() => {
    if (lastGiftEnabledRef.current !== isGift) {
      lastGiftEnabledRef.current = isGift
      try {
        trackEvent('adopt_gift_toggled', { enabled: isGift })
      } catch {
        // Never break the form on analytics failure.
      }
      // Reset completion guard when the gift mode toggles back off so a
      // future re-enable can re-fire the "completed" event.
      if (!isGift) completedFiredRef.current = false
    }
  }, [isGift])

  useEffect(() => {
    if (!isGift || completedFiredRef.current) return
    // "Completed" = name present + at least one of (send date, message-channel).
    // No literal `message` field exists today, so we model giftEmail as the
    // message/contact channel boolean for this event.
    const hasSendDate = giftDeliver.length > 0
    const hasMessage = giftEmail.length > 0
    if (giftName.length > 0 && (hasSendDate || hasMessage)) {
      completedFiredRef.current = true
      try {
        trackEvent('adopt_gift_fields_completed', {
          has_send_date: hasSendDate,
          has_message: hasMessage,
        })
      } catch {
        // Swallow.
      }
    }
  }, [isGift, giftName, giftEmail, giftDeliver])

  // Computed once per client mount; avoids per-render UTC drift near midnight.
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function updateParam(key: 'gift_name' | 'gift_email' | 'gift_deliver', value: string) {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (value === '') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    const qs = params.toString()
    startTransition(() => {
      router.replace(`/${locale}/adopt${qs ? `?${qs}` : ''}`, { scroll: false })
    })
  }

  function debouncedUpdate(key: 'gift_name' | 'gift_email', value: string) {
    if (pendingRef.current) clearTimeout(pendingRef.current)
    pendingRef.current = setTimeout(() => updateParam(key, value), 300)
  }

  function resetGift() {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.delete('gift_name')
    params.delete('gift_email')
    params.delete('gift_deliver')
    const qs = params.toString()
    startTransition(() => {
      router.replace(`/${locale}/adopt${qs ? `?${qs}` : ''}`, { scroll: false })
    })
  }

  const headingText = heading ?? translate('adopt.gift.heading', 'Adopting for someone else?')
  const subheading = translate(
    'adopt.gift.sub',
    'Make this a gift — we\'ll personalise the certificate and time the welcome to arrive on the date you choose.',
  )

  return (
    <details
      className="group bg-card border border-border rounded-2xl overflow-hidden"
      open={isGift}
      aria-busy={isPending}
    >
      <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-5 py-4 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="text-xl">🎁</span>
          <div>
            <p className="font-semibold text-foreground text-sm sm:text-base">{headingText}</p>
            <p className="text-xs text-foreground/60 mt-0.5">
              {isGift
                ? translate('adopt.gift.activeBadge', `Gift mode active — for ${giftName || 'recipient'}`).replace('{name}', giftName)
                : translate('adopt.gift.expandHint', 'Click to personalise as a gift')}
            </p>
          </div>
        </div>
        <span
          aria-hidden="true"
          className="shrink-0 text-primary transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
        >
          +
        </span>
      </summary>

      <div className="px-5 pb-5 pt-1 space-y-4">
        <p className="text-sm text-foreground/70">{subheading}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wide text-foreground/60 mb-1">
              {translate('adopt.gift.nameLabel', 'Recipient name')}
              <span aria-hidden="true" className="text-primary"> *</span>
            </span>
            <input
              type="text"
              required={isGift}
              value={giftName}
              onChange={(e) => debouncedUpdate('gift_name', e.target.value)}
              placeholder={translate('adopt.gift.namePlaceholder', 'e.g. Marta')}
              maxLength={80}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wide text-foreground/60 mb-1">
              {translate('adopt.gift.emailLabel', 'Recipient email (optional)')}
            </span>
            <input
              type="email"
              value={giftEmail}
              onChange={(e) => debouncedUpdate('gift_email', e.target.value)}
              placeholder={translate('adopt.gift.emailPlaceholder', 'marta@example.com')}
              maxLength={254}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="block text-xs font-semibold uppercase tracking-wide text-foreground/60 mb-1">
              {translate('adopt.gift.deliverLabel', 'Deliver the welcome on')}
            </span>
            <input
              type="date"
              min={today}
              value={giftDeliver}
              onChange={(e) => updateParam('gift_deliver', e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            />
            <span className="block text-xs text-foreground/60 mt-1">
              {translate('adopt.gift.deliverHint', 'Leave blank to send the welcome immediately after checkout.')}
            </span>
          </label>
        </div>

        {isGift && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-foreground/60" role="status" aria-live="polite">
              {translate('adopt.gift.confirmation', 'Your tier buttons above will checkout as a gift.')}
            </p>
            <button
              type="button"
              onClick={resetGift}
              className="text-xs text-foreground/60 hover:text-foreground underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
            >
              {translate('adopt.gift.reset', 'Remove gift details')}
            </button>
          </div>
        )}
      </div>
    </details>
  )
}
