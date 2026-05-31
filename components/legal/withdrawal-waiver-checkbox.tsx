'use client'

import type { Locale } from '@/i18n.config'
import { useTranslations } from 'next-intl'

interface WithdrawalWaiverCheckboxProps {
  locale: Locale
  name?: string
  required?: boolean
}

/**
 * EU Consumer Rights Directive 2011/83 Art 16(m) waiver checkbox.
 *
 * For digital symbolic-adoption subscriptions, the 14-day withdrawal right
 * applies UNLESS the consumer:
 *   1. Gives express affirmative consent to begin performance immediately
 *   2. Explicitly acknowledges they LOSE the withdrawal right
 *   3. Receives durable-medium confirmation (welcome email handles #3)
 *
 * Legal basis: Commission Notice C/2021/9314 confirms digital symbolic
 * adoptions fall under Directive 2011/83 as digital content services.
 *
 * Pre-ticked boxes or bundled T&C acceptance INVALIDATE the waiver.
 * Box MUST be unticked by default and required for checkout.
 *
 * NOT YET WIRED to the adopt checkout page — pending owner sign-off on copy.
 * See handoff/PEER_REVIEW_2026-05-29-mollie-management.md Cycle 11.
 */
export function WithdrawalWaiverCheckbox({ locale, name = 'withdrawal_waiver', required = true }: WithdrawalWaiverCheckboxProps) {
  const translate = useTranslations()
  return (
    <label className="flex items-start gap-2 text-xs text-foreground/80 cursor-pointer">
      <input
        type="checkbox"
        name={name}
        required={required}
        defaultChecked={false}
        className="mt-0.5 h-4 w-4 rounded border-border accent-primary focus-visible:ring-2 focus-visible:ring-primary/50"
      />
      <span>
        {translate('adopt.legal.withdrawalWaiver')}
      </span>
    </label>
  )
}
