'use client'

/**
 * /[locale]/redeem-voucher — Gift voucher redemption scaffold.
 *
 * Client component. Visitor enters their voucher code; page POSTs to
 * /api/voucher-redeem and shows success or a polite generic message.
 *
 * The backend always returns 200 (anti-enumeration) so the UI always shows
 * "check your email" on valid codes. Invalid codes receive a gentle message
 * that does not confirm the code was wrong (avoids code-scanning attacks).
 *
 * This is a SCAFFOLD — the backend stub validates against VALID_VOUCHER_CODES
 * (owner-set comma-separated list). Full voucher-account linking is a future step.
 *
 * Failsafe: form is static HTML — renders even without JS; POST requires JS.
 */

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function RedeemVoucherPage() {
  const params = useParams()
  const locale = typeof params?.locale === 'string' ? params.locale : 'en'
  const [code, setCode] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'invalid' | 'error'>('idle')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmedCode = code.trim()
    if (!trimmedCode) return

    startTransition(async () => {
      try {
        const res = await fetch('/api/voucher-redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: trimmedCode }),
        })
        const json = (await res.json()) as { ok: boolean; valid?: boolean }
        if (json.ok && json.valid) {
          setStatus('success')
        } else if (json.ok && !json.valid) {
          setStatus('invalid')
        } else {
          setStatus('error')
        }
      } catch {
        setStatus('error')
      }
    })
  }

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="w-full py-20 px-4 bg-gradient-to-br from-primary/10 to-accent/10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Redeem your voucher
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Received an alpaca adoption voucher as a gift? Enter your code below to get started.
          </p>
        </div>
      </section>

      {/* ── Voucher form ─────────────────────────────────────────────────── */}
      <section className="w-full py-16 px-4 bg-background">
        <div className="max-w-md mx-auto">
          <div className="bg-card rounded-xl border border-border p-8 shadow-sm">
            {status === 'success' ? (
              <div className="text-center space-y-4">
                <div className="text-5xl">🦙</div>
                <h2 className="text-xl font-bold text-foreground">Voucher accepted!</h2>
                <p className="text-sm text-muted-foreground">
                  Check your email for next steps on completing your adoption and adding it to your
                  account. Welcome to the herd!
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <Link
                    href={`/${locale}/tours`}
                    className="inline-flex items-center justify-center px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold text-sm transition-colors"
                  >
                    Book your visit →
                  </Link>
                  <Link
                    href={`/${locale}/contact`}
                    className="text-xs text-muted-foreground underline hover:text-primary transition-colors"
                  >
                    Questions? Contact us
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="voucher-code"
                    className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1"
                  >
                    Voucher code
                  </label>
                  <input
                    id="voucher-code"
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. ALPACA-GIFT-2024"
                    maxLength={64}
                    disabled={isPending}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50"
                  />
                </div>

                {/* Anti-enumeration: both invalid and error show a soft message */}
                {(status === 'invalid' || status === 'error') && (
                  <p className="text-sm text-muted-foreground bg-primary/5 border border-primary/10 rounded-lg px-4 py-3">
                    We couldn&apos;t verify that code. Please double-check it and try again, or
                    contact us at{' '}
                    <a
                      href="mailto:info@alpacasibiza.com"
                      className="underline text-foreground hover:text-primary"
                    >
                      info@alpacasibiza.com
                    </a>{' '}
                    if you need help.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isPending || !code.trim()}
                  className="w-full px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? 'Checking…' : 'Redeem voucher'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── Help section ─────────────────────────────────────────────────── */}
      <section className="w-full py-10 px-4 bg-primary/5">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-lg font-bold text-foreground mb-2">Need help?</h3>
          <p className="text-sm text-muted-foreground">
            Your voucher code was included in the gift email you received. If you can&apos;t find
            it, contact us at{' '}
            <a
              href="mailto:info@alpacasibiza.com"
              className="underline text-foreground hover:text-primary"
            >
              info@alpacasibiza.com
            </a>
            .
          </p>
        </div>
      </section>
    </>
  )
}
