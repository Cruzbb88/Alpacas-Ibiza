'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { TurnstileWidget } from '@/components/turnstile-widget'

interface BillingPortalLinkProps {
  locale: string
  /**
   * Which manage endpoint to hit. Defaults to 'mollie' per ADR 019 (Mollie is
   * the primary processor; cheaper SEPA fees). Set to 'stripe' when the page
   * is rendered under PAYMENT_VENDOR=stripe so the donor's email is looked up
   * in the right vendor's customer list. Both endpoints return identical 200
   * shapes — the donor never sees which vendor handled the lookup.
   */
  vendor?: 'mollie' | 'stripe'
}

/**
 * Collapsed "Already adopted? Manage your subscription" section at the
 * bottom of the adopt page.
 *
 * Flow (privacy-preserving — closes email-oracle enumeration):
 *   1. User submits email → POST /api/mollie-manage  (or /api/billing-portal for Stripe)
 *   2. Server always returns 200 {ok:true} regardless of subscriber status
 *   3. If subscription exists, server emails the user a manage link
 *   4. UI shows generic "check your inbox" message either way — never
 *      confirms whether the address is in the customer list.
 *
 * Mollie flow: the email contains a token-gated cancel link that hits
 * /api/mollie-manage/cancel and triggers mollie.customers_subscriptions.cancel().
 * Stripe flow: the email contains the Stripe Customer Portal URL.
 */
export function BillingPortalLink({ locale, vendor = 'mollie' }: BillingPortalLinkProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const captchaTokenRef = useRef<string>('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')

    const endpoint = vendor === 'mollie' ? '/api/mollie-manage' : '/api/billing-portal'
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale, 'cf-turnstile-response': captchaTokenRef.current }),
      })

      // 503 only when the vendor's key/SDK is unset. Every other path returns 200.
      setStatus(res.ok ? 'sent' : 'error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <details className="max-w-md mx-auto mt-12 mb-4 text-sm">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
        Already adopted? Manage your subscription
      </summary>

      {status === 'sent' ? (
        <p className="mt-4 text-sm text-muted-foreground">
          If a subscription exists for that email, we&apos;ve sent a link to manage it.
          Check your inbox (and spam folder) within a few minutes.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <label htmlFor="bp-email" className="sr-only">
            Email address
          </label>
          <input
            id="bp-email"
            type="email"
            required
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
            disabled={status === 'loading'}
          />

          <TurnstileWidget
            onToken={(token) => { captchaTokenRef.current = token }}
            className="self-start"
          />

          <Button type="submit" disabled={status === 'loading'} variant="outline" size="sm">
            {status === 'loading' ? 'Sending link…' : 'Email me a portal link'}
          </Button>

          {status === 'error' && (
            <p className="text-destructive text-xs">
              Subscription portal is unavailable. Contact{' '}
              <a href="mailto:info@alpacasibiza.com" className="underline">
                info@alpacasibiza.com
              </a>
              .
            </p>
          )}
        </form>
      )}
    </details>
  )
}
