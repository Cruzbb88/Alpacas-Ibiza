'use client'

/**
 * SkeinGiftToggle — "is this a gift?" disclosure for the skein sponsorship flow.
 *
 * Mirrors AdoptGiftAdoption in design pattern (URL-state, <details>/disclosure,
 * debounced text inputs) but is skein-specific in copy and omits the delivery
 * date field (skeins ship in October regardless — no per-recipient scheduling).
 *
 * Fields:
 *   - gift_name  (required when any gift field is present, ≤80 chars)
 *   - gift_email (optional, browser-validated type=email)
 *   - gift_message (optional, ≤500 chars)
 *
 * State lives in URL params so the existing checkout href picks them up
 * automatically without any prop-drilling.
 *
 * Copy: "Gifting? Add the recipient's name (and optionally a message) — we'll
 * add a hand-written card to the package."
 */

import { useRouter, useSearchParams } from 'next/navigation'
import { useRef, useTransition } from 'react'
import type { Locale } from '@/i18n.config'
import { useTranslations } from 'next-intl'

interface SkeinGiftToggleProps {
  locale: Locale
}

export function SkeinGiftToggle({ locale }: SkeinGiftToggleProps) {
  const translate = useTranslations()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const giftName = searchParams?.get('gift_name') ?? ''
  const giftEmail = searchParams?.get('gift_email') ?? ''
  const giftMessage = searchParams?.get('gift_message') ?? ''
  const isGift = giftName.length > 0 || giftEmail.length > 0 || giftMessage.length > 0

  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function updateParam(
    key: 'gift_name' | 'gift_email' | 'gift_message',
    value: string,
  ) {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (value === '') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    const qs = params.toString()
    startTransition(() => {
      router.replace(`/${locale}/skein${qs ? `?${qs}` : ''}`, { scroll: false })
    })
  }

  function debouncedUpdate(key: 'gift_name' | 'gift_email' | 'gift_message', value: string) {
    if (pendingRef.current) clearTimeout(pendingRef.current)
    pendingRef.current = setTimeout(() => updateParam(key, value), 300)
  }

  function resetGift() {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.delete('gift_name')
    params.delete('gift_email')
    params.delete('gift_message')
    const qs = params.toString()
    startTransition(() => {
      router.replace(`/${locale}/skein${qs ? `?${qs}` : ''}`, { scroll: false })
    })
  }

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
            <p className="font-semibold text-foreground text-sm sm:text-base">
              {translate('skein.gift.toggle')}
            </p>
            <p className="text-xs text-foreground/60 mt-0.5">
              {isGift
                ? translate('skein.gift.activeBadge', { name: giftName || 'recipient' })
                : translate('skein.gift.expandHint')}
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
        <p className="text-sm text-foreground/70">
          {translate('skein.gift.subheading')}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Recipient name — required */}
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wide text-foreground/60 mb-1">
              {translate('skein.gift.recipientName')}
              <span aria-hidden="true" className="text-primary"> *</span>
            </span>
            <input
              type="text"
              required={isGift}
              defaultValue={giftName}
              onChange={(e) => debouncedUpdate('gift_name', e.target.value)}
              maxLength={80}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </label>

          {/* Recipient email — optional */}
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wide text-foreground/60 mb-1">
              {translate('skein.gift.recipientEmail')}
            </span>
            <input
              type="email"
              defaultValue={giftEmail}
              onChange={(e) => debouncedUpdate('gift_email', e.target.value)}
              maxLength={254}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            />
          </label>

          {/* Personal message — optional, full width */}
          <label className="block sm:col-span-2">
            <span className="block text-xs font-semibold uppercase tracking-wide text-foreground/60 mb-1">
              {translate('skein.gift.message')}
            </span>
            <textarea
              defaultValue={giftMessage}
              onChange={(e) => debouncedUpdate('gift_message', e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-none"
            />
          </label>
        </div>

        {isGift && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-foreground/60" role="status" aria-live="polite">
              {translate('skein.gift.confirmation')}
            </p>
            <button
              type="button"
              onClick={resetGift}
              className="text-xs text-foreground/60 hover:text-foreground underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
            >
              {translate('skein.gift.reset')}
            </button>
          </div>
        )}
      </div>
    </details>
  )
}
