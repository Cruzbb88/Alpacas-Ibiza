'use client'

import { useState } from 'react'

interface Entry {
  email: string
  reason: 'hard-bounce' | 'complaint' | 'manual'
  addedAt: string
}

interface Props {
  initialEntries: Entry[]
}

const reasonStyles: Record<Entry['reason'], { bg: string; fg: string; label: string }> = {
  complaint: { bg: '#fee2e2', fg: '#991b1b', label: 'COMPLAINT' },
  'hard-bounce': { bg: '#fef3c7', fg: '#92400e', label: 'HARD BOUNCE' },
  manual: { bg: '#e5e7eb', fg: '#374151', label: 'MANUAL' },
}

export function SuppressionTable({ initialEntries }: Props) {
  const [entries, setEntries] = useState(initialEntries)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleUnsuppress(email: string) {
    if (!confirm(`Unsuppress ${email}?\nFuture sends to this address will be attempted again. If it bounces again, Resend will re-add it within minutes.`)) {
      return
    }
    setPendingEmail(email)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/admin/suppressions?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setErrorMsg(typeof body?.error === 'string' ? body.error : `HTTP ${res.status}`)
        return
      }
      setEntries((cur) => cur.filter((e) => e.email !== email))
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
    } finally {
      setPendingEmail(null)
    }
  }

  if (entries.length === 0) {
    return (
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '24px 20px', color: '#166534', fontWeight: 600, fontSize: 16, textAlign: 'center' }}>
        No suppressed addresses. Sender reputation is healthy.
      </div>
    )
  }

  return (
    <div>
      {errorMsg && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#991b1b', fontSize: 14 }}>
          {errorMsg}
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={th}>Email</th>
              <th style={th}>Reason</th>
              <th style={th}>Added</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const style = reasonStyles[e.reason]
              const isPending = pendingEmail === e.email
              return (
                <tr key={e.email}>
                  <td style={td}>
                    <code style={{ fontSize: 12 }}>{e.email}</code>
                  </td>
                  <td style={td}>
                    <span style={{ background: style.bg, color: style.fg, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                      {style.label}
                    </span>
                  </td>
                  <td style={td}>{new Date(e.addedAt).toLocaleString('en-GB')}</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <button
                      onClick={() => handleUnsuppress(e.email)}
                      disabled={isPending}
                      style={{
                        background: '#fff',
                        color: '#556B2F',
                        border: '1px solid #556B2F',
                        padding: '6px 12px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: isPending ? 'not-allowed' : 'pointer',
                        opacity: isPending ? 0.5 : 1,
                      }}
                    >
                      {isPending ? 'Removing…' : 'Unsuppress'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  borderBottom: '1px solid #e5e7eb',
  fontWeight: 600,
  color: '#374151',
}
const td: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid #f3f4f6',
  color: '#111827',
}
