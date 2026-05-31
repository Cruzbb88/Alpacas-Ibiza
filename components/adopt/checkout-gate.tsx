'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Locale } from '@/i18n.config'
import { useTranslations } from 'next-intl'

/**
 * CheckoutGate — EU Directive 2011/83 Art 16(m) consent gate for adopt checkout.
 *
 * Provides WaiverContext to all AdoptCheckoutLink descendants. Links that
 * call useWaiverGate() will block navigation until the donor checks the
 * withdrawal-rights checkbox.
 *
 * Belt-and-suspenders: client gate here + server-side 400 in the checkout
 * routes (app/api/checkout/route.ts + app/api/mollie-checkout/route.ts).
 *
 * ADR-022 status: PROPOSED — owner copy approval still pending.
 * OWNER_INPUT_NEEDED: final waiver copy must be reviewed by a EU consumer-law
 * qualified lawyer before go-live. The current text satisfies Art 16(m)
 * minimums per the deep-research placeholder in cycle 11.
 */

interface WaiverContextValue {
  accepted: boolean
  showError: () => void
}

const WaiverContext = createContext<WaiverContextValue | null>(null)

/**
 * Hook consumed by AdoptCheckoutLink. Throws when used outside CheckoutGate
 * so missing-context bugs surface at development time, not silently in prod.
 */
export function useWaiverGate(): WaiverContextValue {
  const ctx = useContext(WaiverContext)
  if (!ctx) throw new Error('useWaiverGate must be used inside <CheckoutGate>')
  return ctx
}

interface CheckoutGateProps {
  locale: Locale
  children: ReactNode
}

export function CheckoutGate({ locale, children }: CheckoutGateProps) {
  const translate = useTranslations()
  const [accepted, setAccepted] = useState(false)
  const [errorVisible, setErrorVisible] = useState(false)

  function showError() {
    setErrorVisible(true)
    // Scroll the checkbox into view so the donor can see what they missed.
    const el = document.querySelector<HTMLInputElement>('input[name="withdrawal_waiver"]')
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el?.focus()
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAccepted(e.target.checked)
    if (e.target.checked) setErrorVisible(false)
  }

  return (
    <WaiverContext.Provider value={{ accepted, showError }}>
      {children}

      {/* Waiver checkbox — rendered once, below the tier grid, before any CTA. */}
      <div className="mt-6 mx-auto max-w-2xl space-y-2 px-4">
        <label className="flex items-start gap-2 text-xs text-foreground/80 cursor-pointer">
          <input
            type="checkbox"
            name="withdrawal_waiver"
            checked={accepted}
            onChange={handleChange}
            className="mt-0.5 h-4 w-4 rounded border-border accent-primary focus-visible:ring-2 focus-visible:ring-primary/50 shrink-0"
            required
            aria-describedby={errorVisible && !accepted ? 'waiver-error' : undefined}
          />
          <span>
            {/* OWNER_INPUT_NEEDED: final waiver copy pending owner approval per ADR-022.
                Current text is the deep-research-derived placeholder satisfying Art 16(m)
                minimums. A EU consumer-law lawyer should review before go-live. */}
            {translate('adopt.legal.withdrawalWaiver')}
          </span>
        </label>

        {errorVisible && !accepted && (
          <p id="waiver-error" className="text-xs text-destructive" role="alert">
            {translate('adopt.legal.waiverRequired')}
          </p>
        )}
      </div>
    </WaiverContext.Provider>
  )
}
