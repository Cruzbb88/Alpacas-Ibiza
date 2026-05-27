'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface BillingPortalLinkProps {
  locale: string
}

/**
 * Collapsed "Already adopted? Manage your subscription" section at the
 * bottom of the adopt page. Calls POST /api/billing-portal with the
 * subscriber's email, then redirects to Stripe Customer Portal on success.
 *
 * Rendered as a <details> so it is invisible noise for new visitors and
 * only expands for existing subscribers who look for it.
 *
 * Requires Stripe Customer Portal activated in Stripe dashboard:
 *   Stripe → Settings → Billing → Customer portal → Activate
 */
export function BillingPortalLink({ locale }: BillingPortalLinkProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'not-found'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/billing-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
      })
      const data: { url?: string; error?: string; message?: string } = await res.json()

      if (res.ok && data.url) {
        window.location.href = data.url
        return
      }

      setStatus(data.error === 'CUSTOMER_NOT_FOUND' ? 'not-found' : 'error')
      setErrorMsg(data.message ?? 'Something went wrong — please try again.')
    } catch {
      setStatus('error')
      setErrorMsg('Network error — please try again.')
    }
  }

  return (
    <details className="max-w-md mx-auto mt-12 mb-4 text-sm">
      <summary className="cursor-pointer text-muted-foreground hover:text-foreground select-none">
        Already adopted? Manage your subscription
      </summary>

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

        <Button type="submit" disabled={status === 'loading'} variant="outline" size="sm">
          {status === 'loading' ? 'Opening portal…' : 'Open subscription portal'}
        </Button>

        {status === 'not-found' && (
          <p className="text-amber-700 dark:text-amber-400 text-xs">
            No subscription found for that email. Contact{' '}
            <a href="mailto:info@alpacasibiza.com" className="underline">
              info@alpacasibiza.com
            </a>{' '}
            if you think this is wrong.
          </p>
        )}
        {status === 'error' && (
          <p className="text-destructive text-xs">{errorMsg}</p>
        )}
      </form>
    </details>
  )
}
