'use client'

import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { Locale } from '@/i18n.config'
import { REFERRAL_CODE_RE } from '@/lib/referral-codes'

/**
 * ReferralAppliedBanner — shows a friendly notice when the URL contains a
 * valid referral code in either supported param:
 *
 *   `?referral=<code>` — Stripe coupon / discount code. Shows "coupon applied"
 *                         copy; the actual coupon validity is checked server-side
 *                         at /api/checkout.
 *
 *   `?ref=<code>`      — Attribution-only referral link (Alice's share URL).
 *                         No coupon; shows "referred by a friend" copy so the
 *                         donor gets confirmation their referral will be credited.
 *                         The attribution is silently recorded in Stripe metadata.referredBy.
 *
 * Renders null when neither param is present or both fail the format check.
 */
export function ReferralAppliedBanner({ locale }: { locale: Locale }) {
  const searchParams = useSearchParams()
  // Rules of Hooks: call unconditionally before the early returns below.
  const tr = useTranslations()

  const couponCode = searchParams.get('referral')
  const refCode = searchParams.get('ref')

  const validCoupon = couponCode && REFERRAL_CODE_RE.test(couponCode) ? couponCode : null
  const validRef = refCode && REFERRAL_CODE_RE.test(refCode) ? refCode : null

  if (!validCoupon && !validRef) return null

  // Attribution (?ref=) copy: confirm the referral is tracked, no discount promise.
  if (validRef && !validCoupon) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="bg-primary/5 border border-primary/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-center sm:text-left"
      >
        <span className="text-xl" aria-hidden="true">🤝</span>
        <div>
          <p className="text-sm sm:text-base font-bold text-primary">
            {tr('adopt.referral.attributionHeading')}
          </p>
          <p className="text-xs sm:text-sm text-foreground/70 mt-1">
            {tr('adopt.referral.attributionBody')}
          </p>
        </div>
      </div>
    )
  }

  // Coupon (?referral=) copy: discount applied at checkout.
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-primary/5 border border-primary/20 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 text-center sm:text-left"
    >
      <span className="text-xl" aria-hidden="true">🎁</span>
      <div>
        <p className="text-sm sm:text-base font-bold text-primary">
          {tr('adopt.referral.welcomeFromFriend')}
        </p>
        <p className="text-xs sm:text-sm text-foreground/70 mt-1">
          {tr('adopt.referral.codeApplied')}{' '}
          <code className="font-mono font-semibold">{validCoupon}</code>.
        </p>
      </div>
    </div>
  )
}
