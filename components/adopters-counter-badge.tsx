/**
 * AdoptersCounterBadge — social-proof badge showing the live adopter count.
 *
 * Server component (no 'use client'). Async.
 *
 * Calls getActiveAdopterCount() directly (no HTTP round-trip) wrapped in a
 * Promise.race(150ms timeout) — same pattern as adopt/page.tsx cycle-6 fix —
 * so a slow Mollie/Stripe list call never blocks SSR cold-start.
 *
 * Renders null when:
 *   - count is 0 (unconfigured / error / genuinely zero)
 *   - timeout fires before the vendor responds
 *
 * Never invents a count — only renders real values from the payment vendor.
 *
 * Translation key (EN fallback embedded):
 *   adopters.badge   — "Join {count} alpaca adopters"
 *   (replace {count} with the live number)
 */

import { getActiveAdopterCount } from '@/lib/adopters/count'
import type { Locale } from '@/i18n.config'
import { getTranslations } from 'next-intl/server'

interface AdoptersCounterBadgeProps {
  locale: Locale
  /** Optional extra CSS classes on the wrapper span. */
  className?: string
}

export async function AdoptersCounterBadge({ locale, className }: AdoptersCounterBadgeProps) {
  // 150ms race — mirrors adopt/page.tsx cycle-6 fix so SSR never hangs.
  const adopterPromise = getActiveAdopterCount()
  const timeoutPromise = new Promise<{ count: number }>((resolve) =>
    setTimeout(() => resolve({ count: 0 }), 150),
  )
  const { count } = await Promise.race([adopterPromise, timeoutPromise])

  // Render nothing when count is zero (unconfigured, error, or timeout).
  if (count <= 0) return null

  const translate = await getTranslations()
  const template = translate('adopters.badge')
  const label = template.replace('{count}', String(count))

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm text-foreground/70 ${className ?? ''}`}
    >
      {/* Heart icon — purely decorative */}
      <svg
        className="h-4 w-4 text-primary flex-shrink-0"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
      <span>{label}</span>
    </span>
  )
}
