'use client'

import { useSearchParams } from 'next/navigation'
import { getTranslation } from '@/lib/translations'
import type { Locale } from '@/i18n.config'

const REFERRAL_CODE_RE = /^ALPACA-[A-Z0-9]{6}$/

/**
 * ReferralAppliedBanner — shows a friendly discount notice when the URL
 * contains a valid referral code param: `?referral=ALPACA-XXXXXX`.
 *
 * Client-side format validation only. The actual coupon validity is checked
 * server-side at /api/checkout — this banner is purely informational.
 *
 * Renders null when:
 *   - `?referral=` is absent
 *   - Code fails the /^ALPACA-[A-Z0-9]{6}$/ format check
 */
export function ReferralAppliedBanner({ locale }: { locale: Locale }) {
  const searchParams = useSearchParams()
  const code = searchParams.get('referral')

  if (!code || !REFERRAL_CODE_RE.test(code)) return null

  const tr = (key: string, fallback: string) => getTranslation(locale, key, fallback)

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-primary/5 border border-primary/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-center sm:text-left"
    >
      <span className="text-xl" aria-hidden="true">🎁</span>
      <div>
        <p className="text-sm sm:text-base font-bold text-primary">
          {tr('adopt.referral.welcomeFromFriend', '🎁 Welcome from a friend — your first month is €5 off.')}
        </p>
        <p className="text-xs sm:text-sm text-foreground/70 mt-1">
          {tr('adopt.referral.codeApplied', 'Discount applied automatically at checkout with code')}{' '}
          <code className="font-mono font-semibold">{code}</code>.
        </p>
      </div>
    </div>
  )
}
