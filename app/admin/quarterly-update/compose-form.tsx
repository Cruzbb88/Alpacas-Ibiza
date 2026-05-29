'use client'

import { useState, type FormEvent } from 'react'

interface Props {
  quarter: string
  initialHtml: string
  lastUpdated: string | null
  sentAt: string | null
}

export function QuarterlyComposeForm({ quarter, initialHtml, lastUpdated, sentAt }: Props) {
  const [html, setHtml] = useState(initialHtml)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('saving')
    setErrorMsg(null)
    try {
      const res = await fetch('/api/admin/quarterly-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quarter, newsHtml: html }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setErrorMsg(typeof body?.error === 'string' ? body.error : `HTTP ${res.status}`)
        setStatus('error')
        return
      }
      setStatus('saved')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  const previewUrl = `/api/admin/quarterly-update/preview?quarter=${encodeURIComponent(quarter)}`

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          background: '#f0fdf4',
          borderLeft: `4px solid ${sentAt ? '#9ca3af' : '#22c55e'}`,
          padding: '12px 16px',
          marginBottom: 16,
          fontSize: 13,
          color: sentAt ? '#4b5563' : '#166534',
          borderRadius: 6,
        }}
      >
        <strong>{quarter}</strong>{' '}
        {sentAt
          ? `was sent on ${new Date(sentAt).toLocaleString('en-GB')}. Edits below
             only affect future re-sends (manual replay).`
          : lastUpdated
            ? `draft saved ${new Date(lastUpdated).toLocaleString('en-GB')}.`
            : 'has no content yet. Compose below.'}
      </div>

      <label htmlFor="news-html" style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
        Farm news HTML
      </label>
      <p style={{ fontSize: 12, color: '#6b7280', marginTop: 0, marginBottom: 8 }}>
        Inline HTML accepted. Use{' '}
        <code style={{ background: '#f3f4f6', padding: '1px 4px', borderRadius: 3 }}>
          &lt;p&gt;
        </code>
        {' '}for paragraphs,{' '}
        <code style={{ background: '#f3f4f6', padding: '1px 4px', borderRadius: 3 }}>
          &lt;img src=&quot;...&quot;&gt;
        </code>
        {' '}for photos. No scripts.
      </p>
      <textarea
        id="news-html"
        name="newsHtml"
        value={html}
        onChange={(e) => setHtml(e.target.value)}
        required
        rows={18}
        style={{
          width: '100%',
          padding: 12,
          fontFamily: 'ui-monospace, monospace',
          fontSize: 13,
          lineHeight: 1.5,
          borderRadius: 8,
          border: '1px solid #d1d5db',
          background: '#fff',
        }}
        placeholder="<p>Hi adopters! Spring on the farm has been...</p>"
      />

      <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          type="submit"
          disabled={status === 'saving' || html.trim().length === 0}
          style={{
            background: '#556B2F',
            color: '#fff',
            border: 0,
            padding: '10px 24px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: status === 'saving' ? 'not-allowed' : 'pointer',
            opacity: status === 'saving' || html.trim().length === 0 ? 0.6 : 1,
          }}
        >
          {status === 'saving' ? 'Saving…' : 'Save draft'}
        </button>
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener"
          style={{ fontSize: 14, color: '#6366f1', textDecoration: 'none' }}
        >
          Preview rendered email →
        </a>
        {status === 'saved' && (
          <span style={{ fontSize: 13, color: '#16a34a' }}>✓ Draft saved.</span>
        )}
        {status === 'error' && errorMsg && (
          <span style={{ fontSize: 13, color: '#a44' }}>Error: {errorMsg}</span>
        )}
      </div>
    </form>
  )
}
