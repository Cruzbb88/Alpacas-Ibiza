'use client'

import { useState } from 'react'
import { t } from '@/lib/translations'
import { TurnstileWidget } from '@/components/turnstile-widget'

interface NewsletterFormProps {
  locale: string
}

export function NewsletterForm({ locale }: NewsletterFormProps) {
  const [email, setEmail] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const translate = t(locale)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setStatus('sending')
    setError(null)

    try {
      const res = await fetch(`/${locale}/api/newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, 'cf-turnstile-response': captchaToken }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body?.error || 'Request failed')
      }
      setStatus('success')
      setEmail('')
    } catch (err: any) {
      setStatus('error')
      setError(err.message)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="email"
          placeholder={translate('newsletter.placeholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1 px-4 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={status === 'sending' || !email}
          className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {status === 'sending'
            ? translate('sending')
            : translate('newsletter.subscribe')}
        </button>
      </div>
      <TurnstileWidget onToken={setCaptchaToken} />
      {status === 'success' && (
        <p className="text-sm text-green-600">
          {translate('newsletter.success')}
        </p>
      )}
      {status === 'error' && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </form>
  )
}
