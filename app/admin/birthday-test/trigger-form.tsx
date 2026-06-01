'use client'

import { useState } from 'react'

interface TriggerResult {
  ok: boolean
  scanned?: number
  alpacasWithBirthdays?: number
  emailsSent?: number
  errors?: number
  error?: string
}

/**
 * Client-side form that fires POST /api/alpaca-birthday-cards.
 * CRON_SECRET is read from the NEXT_PUBLIC_CRON_SECRET_PREVIEW env var
 * (set on admin-only preview environments only — never on production public deploys).
 *
 * NOTE: In production, the owner triggers via a curl/fetch with the Bearer token
 * from a secure context. This form is intentionally restricted to admin sessions.
 */
export function BirthdayTriggerForm() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<TriggerResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')

  async function handleTrigger() {
    setStatus('loading')
    setResult(null)
    setErrorMessage('')

    try {
      const res = await fetch('/api/alpaca-birthday-cards', {
        method: 'POST',
        headers: {
          // CRON_SECRET must be set as NEXT_PUBLIC_CRON_SECRET_PREVIEW in the
          // deployment env to enable manual triggering from the browser.
          // Leave unset in production to require curl/server-side triggering only.
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET_PREVIEW ?? ''}`,
          'Content-Type': 'application/json',
        },
      })
      const data = (await res.json()) as TriggerResult
      if (!res.ok) {
        setStatus('error')
        setErrorMessage(`HTTP ${res.status}: ${data.error ?? 'Unknown error'}`)
        return
      }
      setResult(data)
      setStatus('done')
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleTrigger}
        disabled={status === 'loading'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 24px',
          background: status === 'loading' ? '#9ca3af' : '#556B2F',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontSize: 15,
          fontWeight: 600,
          cursor: status === 'loading' ? 'not-allowed' : 'pointer',
        }}
      >
        {status === 'loading' ? 'Sending…' : 'Trigger today\'s birthday emails'}
      </button>

      {status === 'done' && result && (
        <div
          style={{
            marginTop: 16,
            background: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: 8,
            padding: '14px 18px',
            fontSize: 14,
          }}
        >
          <strong style={{ color: '#15803d' }}>Done.</strong>
          <ul style={{ margin: '8px 0 0', padding: '0 0 0 16px', color: '#374151' }}>
            <li>Alpacas scanned: {result.scanned}</li>
            <li>With birthdays today: {result.alpacasWithBirthdays}</li>
            <li>Emails sent: {result.emailsSent}</li>
            <li>Errors: {result.errors}</li>
          </ul>
        </div>
      )}

      {status === 'error' && (
        <div
          style={{
            marginTop: 16,
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: 8,
            padding: '14px 18px',
            fontSize: 14,
            color: '#991b1b',
          }}
        >
          <strong>Error:</strong> {errorMessage}
          {errorMessage.includes('401') && (
            <p style={{ margin: '8px 0 0', fontSize: 13 }}>
              The request was unauthorized. Set{' '}
              <code>NEXT_PUBLIC_CRON_SECRET_PREVIEW</code> in your admin deploy env
              to match <code>CRON_SECRET</code>, then redeploy.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
