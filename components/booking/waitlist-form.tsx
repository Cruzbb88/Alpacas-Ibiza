'use client'

/**
 * WaitlistForm — client component.
 *
 * Renders when a tour date shows 0 availability, or as a fallback "Sold out? Join waitlist" CTA.
 * Posts to /api/waitlist. Shows inline confirmation on success.
 *
 * Security: honeypot (business_name) + Turnstile + per-IP/email rate-limit (server-side).
 * i18n: keys under waitlist.* — en + nl real, others __UNTRANSLATED__.
 */

import { useState } from 'react'
import { TurnstileWidget } from '@/components/turnstile-widget'

export interface WaitlistFormProps {
  /** Pre-fill the tour slug (e.g. 'weaving-workshop') */
  tourSlug?: string
  /** Current locale for i18n routing */
  locale?: string
  /** i18n strings — host page passes these so no next-intl client dependency needed here */
  labels?: {
    heading?: string
    subheading?: string
    emailPlaceholder?: string
    datePlaceholder?: string
    submitLabel?: string
    successMessage?: string
  }
  className?: string
}

export function WaitlistForm({
  tourSlug = '',
  locale = 'en',
  labels = {},
  className = '',
}: WaitlistFormProps) {
  const [email, setEmail] = useState('')
  const [preferredDate, setPreferredDate] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const heading      = labels.heading       ?? 'Sold out? Join the waitlist'
  const subheading   = labels.subheading    ?? "We'll email you if a spot opens up."
  const emailPh      = labels.emailPlaceholder ?? 'Your email address'
  const datePh       = labels.datePlaceholder  ?? 'Preferred date (optional)'
  const submitLabel  = labels.submitLabel   ?? 'Join waitlist'
  const successMsg   = labels.successMessage  ?? "Got it — we'll be in touch if a spot opens."

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          preferredDate,
          tourSlug,
          locale,
          'cf-turnstile-response': captchaToken,
          // honeypot — left empty by real users
          business_name: '',
        }),
      })

      if (!res.ok) {
        // API always returns 200; non-200 means a network/infra error
        setStatus('error')
        setErrorMsg('Something went wrong — please try again.')
        return
      }

      setStatus('success')
    } catch {
      setStatus('error')
      setErrorMsg('Network error — please check your connection and try again.')
    }
  }

  if (status === 'success') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center space-y-3 ${className}`}
      >
        <p className="text-sm font-semibold text-primary">{successMsg}</p>
        <p className="text-xs text-foreground/60">While you wait:</p>
        <div className="flex flex-wrap gap-2 justify-center">
          <a
            href={`/${locale}/journal`}
            className="text-xs font-medium text-primary underline hover:text-primary/80 transition-colors"
          >
            Browse the journal
          </a>
          <span className="text-foreground/30" aria-hidden="true">·</span>
          <a
            href={`/${locale}#newsletter`}
            className="text-xs font-medium text-primary underline hover:text-primary/80 transition-colors"
          >
            Join the newsletter
          </a>
          <span className="text-foreground/30" aria-hidden="true">·</span>
          <a
            href={`/${locale}/adopt`}
            className="text-xs font-medium text-primary underline hover:text-primary/80 transition-colors"
          >
            Adopt an alpaca
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border border-border bg-background p-5 ${className}`}>
      <h3 className="text-base font-bold text-foreground mb-1">{heading}</h3>
      <p className="text-xs text-foreground/60 mb-4">{subheading}</p>

      <form onSubmit={handleSubmit} noValidate>
        {/* Honeypot — hidden from real users, visible to bots */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
          <input
            type="text"
            name="business_name"
            tabIndex={-1}
            autoComplete="off"
            value=""
            onChange={() => {}}
          />
        </div>

        <div className="flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={emailPh}
            aria-label={emailPh}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />

          <input
            type="text"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            placeholder={datePh}
            aria-label={datePh}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />

          {/* Turnstile widget — no-op when site key unset (fail-open) */}
          <TurnstileWidget
            fieldName="cf-turnstile-response"
            onToken={setCaptchaToken}
          />

          {errorMsg ? (
            <p role="alert" className="text-xs text-destructive">{errorMsg}</p>
          ) : null}

          <button
            type="submit"
            disabled={status === 'loading' || !email}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {status === 'loading' ? 'Submitting…' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
