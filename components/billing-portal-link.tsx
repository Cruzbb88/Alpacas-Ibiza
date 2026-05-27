'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { TurnstileWidget } from '@/components/turnstile-widget'

interface BillingPortalLinkProps {
  locale: string
}

/**
 * Collapsed "Already adopted? Manage your subscription" section at the
 * bottom of the adopt page.
 *
 * Flow (privacy-preserving — closes email-oracle enumeration):
 *   1. User submits email → POST /api/billing-portal
 *   2. Server always returns 200 {ok:true} regardless of subscriber status
 *   3. If subscription exists, server emails the user a portal link
 *   4. UI shows generic "check your inbox" message either way — never
 *      confirms whether the address is in the customer list.
 *
 * Requires Stripe Customer Portal activated in Stripe dashboard:
 *   Stripe → Settings → Billing → Customer portal → Activate
 */
export function BillingPortalLink({ locale }: BillingPortalLinkProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const captchaTokenRef = useRef<string>('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')

    try {
      const res = await fetch('/api/billing-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale, 'cf-turnstile-response': captchaTokenRef.current }),
      })

      // 503 only when Stripe key unset on server. Every other path returns 200.
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
