'use client'

/**
 * SendTestEmailButton — admin probe to verify Resend is working end-to-end.
 *
 * POSTs to /api/admin/send-test-email and surfaces inline feedback.
 * Shown in /admin/email-setup.
 */

import { useState } from 'react'

interface Props {
  /** The default recipient shown in the button label (CONTACT_EMAIL). */
  defaultRecipient: string
}

type State =
  | { phase: 'idle' }
  | { phase: 'sending' }
  | { phase: 'success'; sentAt: string }
  | { phase: 'error'; code: string; message?: string }

export function SendTestEmailButton({ defaultRecipient }: Props) {
  const [state, setState] = useState<State>({ phase: 'idle' })

  async function handleClick() {
    setState({ phase: 'sending' })
    try {
      const res = await fetch('/api/admin/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: defaultRecipient }),
      })
      const json = (await res.json()) as {
        ok: boolean
        sentAt?: string
        code?: string
        message?: string
      }
      if (json.ok && json.sentAt) {
        setState({ phase: 'success', sentAt: json.sentAt })
      } else {
        setState({ phase: 'error', code: json.code ?? String(res.status), message: json.message })
      }
    } catch (err) {
      setState({ phase: 'error', code: 'NETWORK_ERROR', message: err instanceof Error ? err.message : String(err) })
    }
  }

  const isLoading = state.phase === 'sending'

  return (
    <div style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#111827' }}>
        Send a test email
      </h2>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
        Sends a real email to <strong>{defaultRecipient}</strong> via Resend to verify the
        API key and domain are working.
      </p>

      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '9px 18px',
          borderRadius: 8,
          border: '1.5px solid #d1d5db',
          background: isLoading ? '#f9fafb' : '#fff',
          color: '#111827',
          fontSize: 14,
          fontWeight: 600,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.7 : 1,
        }}
      >
        {isLoading ? 'Sending…' : `Send test email to ${defaultRecipient}`}
      </button>

      {state.phase === 'success' && (
        <p
          role="status"
          style={{ marginTop: 10, fontSize: 13, color: '#16a34a', fontWeight: 600 }}
        >
          Sent — check inbox. Sent at: {new Date(state.sentAt).toLocaleTimeString('en-GB')}
        </p>
      )}

      {state.phase === 'error' && (
        <p
          role="alert"
          style={{ marginTop: 10, fontSize: 13, color: '#dc2626', fontWeight: 600 }}
        >
          Error: {state.code}
          {state.message ? ` — ${state.message}` : ''}
        </p>
      )}
    </div>
  )
}
