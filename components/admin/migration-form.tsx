'use client'

import { useState, useRef } from 'react'

interface MigrationLinkRow {
  customerName: string
  email: string
  tier: 'monthly' | 'yearly'
  nextRenewal: string
  checkoutUrl: string
  expiresAt: string
}

interface SkipEntry {
  reason: string
  count: number
}

interface ErrorEntry {
  email: string
  reason: string
}

interface ApiResponse {
  rows: MigrationLinkRow[]
  skipped: SkipEntry[]
  errors: ErrorEntry[]
}

// ---------------------------------------------------------------------------
// Email template body from runbook Section 4 Step 3, URL-encoded
// ---------------------------------------------------------------------------
function buildMailtoLink(email: string, name: string, checkoutUrl: string): string {
  const subject = encodeURIComponent(
    'Continuing your Alpaca adoption — one-click setup',
  )
  const firstName = name.split(' ')[0] || name
  const body = encodeURIComponent(
    `Hi ${firstName},\n\nYour adoption renewed today as usual — thank you! To continue with our new system and get access to your certificate download and adopter dashboard, please confirm your payment details here:\n\n${checkoutUrl}\n\nThis is a one-time step. Same price, same perks. Takes under two minutes.\n\nIf you have any questions, just reply.\n\nWarm regards,\nAlpacas Ibiza`,
  )
  return `mailto:${email}?subject=${subject}&body=${body}`
}

// ---------------------------------------------------------------------------
// Inline style constants (match existing admin page style)
// ---------------------------------------------------------------------------
const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  borderBottom: '1px solid #e5e7eb',
  fontWeight: 600,
  color: '#374151',
  background: '#f9fafb',
  whiteSpace: 'nowrap',
}
const td: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid #f3f4f6',
  color: '#111827',
  verticalAlign: 'top',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function MigrationForm() {
  const [csv, setCsv] = useState('')
  const [lookaheadDays, setLookaheadDays] = useState(30)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ApiResponse | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!csv.trim()) return
    setLoading(true)
    setResult(null)
    setApiError(null)
    try {
      const res = await fetch('/api/admin/migration-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv, lookaheadDays }),
      })
      const data: unknown = await res.json()
      if (!res.ok) {
        const msg = (data as { error?: string })?.error ?? `HTTP ${res.status}`
        setApiError(msg)
      } else {
        setResult(data as ApiResponse)
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setCsv((ev.target?.result as string) ?? '')
    reader.readAsText(file)
  }

  async function copyToClipboard(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // Fallback: select the text manually — browser will prompt
    }
  }

  return (
    <div>
      {/* ── Form ───────────────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 14 }}>
            FareHarbor CSV export
          </label>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
            Paste the CSV content below, or upload the file directly. Columns are matched
            by fuzzy header — exact names are not required.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            style={{ display: 'block', marginBottom: 8, fontSize: 13 }}
          />
          <textarea
            value={csv}
            onChange={e => setCsv(e.target.value)}
            rows={10}
            placeholder={"Name,Email,Product,Tier,Start Date,Next Renewal,Total Paid,Order ID\nJane Doe,jane@example.com,Adopt-a-Paca,Monthly,2024-01-15,2026-06-15,75,FH-12345"}
            style={{
              width: '100%',
              fontFamily: 'monospace',
              fontSize: 12,
              border: '1px solid #d1d5db',
              borderRadius: 6,
              padding: '10px 12px',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap' }}>
            Lookahead window (days):
          </label>
          <input
            type="number"
            min={1}
            max={365}
            value={lookaheadDays}
            onChange={e => setLookaheadDays(Number(e.target.value))}
            style={{
              width: 80,
              border: '1px solid #d1d5db',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 14,
            }}
          />
          <span style={{ fontSize: 13, color: '#6b7280' }}>
            Only customers whose renewal is within this many days will be included.
          </span>
        </div>

        <button
          type="submit"
          disabled={loading || !csv.trim()}
          style={{
            background: loading ? '#9ca3af' : '#4f46e5',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '10px 24px',
            fontWeight: 600,
            fontSize: 14,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Generating links…' : 'Generate migration links'}
        </button>
      </form>

      {/* ── API error ──────────────────────────────────────────────────── */}
      {apiError && (
        <div
          style={{
            marginTop: 20,
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: 8,
            padding: '14px 16px',
            color: '#991b1b',
            fontSize: 14,
          }}
        >
          <strong>Error:</strong> {apiError}
        </div>
      )}

      {/* ── Results ────────────────────────────────────────────────────── */}
      {result && (
        <div style={{ marginTop: 32 }}>
          {/* Skip / error summary */}
          {(result.skipped.length > 0 || result.errors.length > 0) && (
            <div
              style={{
                background: '#fffbeb',
                borderLeft: '4px solid #d97706',
                borderRadius: 6,
                padding: '12px 16px',
                marginBottom: 20,
                fontSize: 13,
                color: '#78350f',
              }}
            >
              <strong>Skipped rows:</strong>{' '}
              {result.skipped.map(s => `${s.reason}: ${s.count}`).join(', ') || 'none'}
              {result.errors.length > 0 && (
                <>
                  <br />
                  <strong>Stripe errors ({result.errors.length}):</strong>{' '}
                  {result.errors.map(e => `${e.email} (${e.reason})`).join('; ')}
                </>
              )}
            </div>
          )}

          {result.rows.length === 0 ? (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 10,
                padding: '24px 20px',
                color: '#166534',
                fontWeight: 600,
                fontSize: 16,
                textAlign: 'center',
              }}
            >
              No customers in the renewal window. Try increasing the lookahead days.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                  Migration links ({result.rows.length})
                </h2>
                <span style={{ fontSize: 13, color: '#6b7280' }}>
                  Links expire in 14 days
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={th}>Customer</th>
                      <th style={th}>Email</th>
                      <th style={th}>Tier</th>
                      <th style={th}>Next Renewal</th>
                      <th style={th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => {
                      const copyKey = `copy-${i}`
                      const mailto = buildMailtoLink(row.email, row.customerName, row.checkoutUrl)
                      return (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                          <td style={td}>{row.customerName}</td>
                          <td style={td}>
                            <code style={{ fontSize: 12 }}>{row.email}</code>
                          </td>
                          <td style={td}>
                            <span
                              style={{
                                background: row.tier === 'yearly' ? '#dbeafe' : '#ede9fe',
                                color: row.tier === 'yearly' ? '#1e40af' : '#5b21b6',
                                padding: '2px 8px',
                                borderRadius: 9999,
                                fontSize: 11,
                                fontWeight: 600,
                                textTransform: 'uppercase',
                              }}
                            >
                              {row.tier}
                            </span>
                          </td>
                          <td style={td}>{row.nextRenewal}</td>
                          <td style={{ ...td, whiteSpace: 'nowrap' }}>
                            <button
                              onClick={() => copyToClipboard(row.checkoutUrl, copyKey)}
                              style={{
                                background: copied === copyKey ? '#16a34a' : '#6366f1',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 5,
                                padding: '5px 12px',
                                fontSize: 12,
                                cursor: 'pointer',
                                marginRight: 8,
                                fontWeight: 600,
                              }}
                            >
                              {copied === copyKey ? 'Copied!' : 'Copy link'}
                            </button>
                            <a
                              href={mailto}
                              style={{
                                display: 'inline-block',
                                background: '#f3f4f6',
                                color: '#374151',
                                border: '1px solid #d1d5db',
                                borderRadius: 5,
                                padding: '5px 12px',
                                fontSize: 12,
                                textDecoration: 'none',
                                fontWeight: 600,
                              }}
                            >
                              Email customer
                            </a>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
