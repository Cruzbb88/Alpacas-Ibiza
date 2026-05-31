'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { Locale } from '@/i18n.config'
import { TurnstileWidget } from '@/components/turnstile-widget'
import { HoneypotField } from '@/components/honeypot-field'
import { MarketingConsentCheckbox } from '@/components/legal/marketing-consent-checkbox'
import { trackEvent } from '@/lib/client-track'

interface NewsletterFormProps {
  locale: Locale
  /** Where on the site the form lives. Used as `source` for GA4 funnel reports. */
  source?: string
}

export function NewsletterForm({ locale, source = 'footer' }: NewsletterFormProps) {
  const [email, setEmail] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [honeypot, setHoneypot] = useState('')
  // PECR / GDPR Art. 7: marketing consent must be un-ticked by default and
  // captured affirmatively before the address leaves the browser.
  const [consent, setConsent] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const translate = useTranslations()

  const canSubmit = email.length > 0 && consent && status !== 'sending'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    if (!consent) {
      // Belt-and-braces: the submit button is disabled until consent is
      // ticked, but a synthetic submit (Enter key on the email field while
      // the checkbox is empty) still routes through here.
      setSubmitAttempted(true)
      setStatus('error')
      setError(
        translate('legal.marketingConsentRequired'),
      )
      return
    }
    setStatus('sending')
    setError(null)
    // GA4: fire attempted BEFORE the request so we can compare attempt→success
    // ratio (drop-off due to Turnstile / honeypot / server 429).
    try {
      trackEvent('newsletter_signup_attempted', { source })
    } catch {
      // Never block the form on analytics failure.
    }

    // Capture the moment the donor ticked + submitted so the API (and any
    // future audit log) has a verifiable consent timestamp per GDPR Art. 7(1)
    // "controller shall be able to demonstrate that the data subject has
    // consented". Sent in the POST body; API ignores unknown fields safely.
    const consentAt = new Date().toISOString()

    try {
      const res = await fetch(`/api/newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          'cf-turnstile-response': captchaToken,
          business_name: honeypot,
          consentAt,
        }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body?.error || 'Request failed')
      }
      setStatus('success')
      setEmail('')
      setConsent(false)
      setSubmitAttempted(false)
      try {
        trackEvent('newsletter_signup_succeeded', { source })
      } catch {
        // Swallow.
      }
    } catch (err: any) {
      setStatus('error')
      setError(err.message)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <HoneypotField name="business_name" value={honeypot} onChange={setHoneypot} />
      <label htmlFor="newsletter-email-input" className="sr-only">
        {translate('newsletter.emailLabel')}
      </label>
      <div className="flex gap-2">
        <input
          id="newsletter-email-input"
          type="email"
          placeholder={translate('newsletter.placeholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="flex-1 px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          aria-describedby={!consent ? 'newsletter-consent-help' : undefined}
          className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'sending'
            ? translate('sending')
            : translate('newsletter.subscribe')}
        </button>
      </div>
      <MarketingConsentCheckbox
        locale={locale}
        checked={consent}
        onChange={setConsent}
        required
        id="newsletter-marketing-consent"
        disabled={status === 'sending'}
      />
      {!consent && submitAttempted && (
        <p id="newsletter-consent-help" className="text-xs text-foreground/60">
          {translate('legal.marketingConsentRequired')}
        </p>
      )}
      <TurnstileWidget onToken={setCaptchaToken} />
      {status === 'success' && (
        <p role="status" aria-live="polite" className="text-sm text-green-600">
          {translate('newsletter.success')}
        </p>
      )}
      {status === 'error' && (
        <p role="alert" aria-live="assertive" className="text-sm text-red-600">{error}</p>
      )}
    </form>
  )
}
