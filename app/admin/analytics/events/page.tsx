import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { listRecentPaymentEvents, type PaymentEventRow } from '@/lib/db/read-events'
import { maskCustomerId } from '@/lib/log-pii'
import { adminTh as th, adminTd as td } from '@/lib/admin-styles'
import ReplayButton from './replay-button-client'

export const metadata = {
  title: 'Payment events — Admin',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
}

// Always recompute on request — admin-only and the page is the operational
// debugging tool for missed webhooks (a stale snapshot is a worse experience
// than a 200ms reload).
export const dynamic = 'force-dynamic'
export const revalidate = 0

const EVENTS_LIMIT = 100

/**
 * Format a UTC ISO string as "DD MMM YY · HH:mm:ss" in the en-GB locale. Matches
 * the dunning / subscriptions page convention — operator-friendly, not
 * marketing-friendly.
 */
function fmtTimestamp(iso: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString('en-GB', {
      year: '2-digit',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  } catch {
    return iso
  }
}

/**
 * Strip the local `<vendor>_` prefix so the table renders the bare vendor id
 * (e.g. `cus_PQR…XYZ56`) — that's what the operator searches Stripe / Mollie
 * dashboards for. The maskCustomerId helper still applies vendor-prefix-aware
 * masking on the bare id.
 */
function bareVendorId(prefixed: string | null): string | null {
  if (!prefixed) return null
  const underscoreIdx = prefixed.indexOf('_')
  if (underscoreIdx <= 0) return prefixed
  return prefixed.slice(underscoreIdx + 1)
}

function VendorBadge({ vendor }: { vendor: PaymentEventRow['vendor'] }) {
  const styles: Record<PaymentEventRow['vendor'], React.CSSProperties> = {
    stripe: { background: '#ede9fe', color: '#5b21b6' },
    mollie: { background: '#dbeafe', color: '#1e40af' },
  }
  return (
    <span
      style={{
        ...styles[vendor],
        padding: '2px 8px',
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        whiteSpace: 'nowrap',
      }}
    >
      {vendor}
    </span>
  )
}

export default async function AdminPaymentEventsPage() {
  const session = await getServerSession(auth)
  if (!session) redirect('/admin/login')

  const rows = await listRecentPaymentEvents(EVENTS_LIMIT)

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 1100, margin: '0 auto', padding: '32px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>
          Payment events
        </h1>
        <a
          href="/admin/analytics/events"
          style={{
            fontSize: 13,
            color: '#6366f1',
            textDecoration: 'none',
            border: '1px solid #c7d2fe',
            borderRadius: 6,
            padding: '6px 14px',
            whiteSpace: 'nowrap',
            marginTop: 4,
          }}
        >
          ↻ Refresh
        </a>
      </div>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>
        Last {EVENTS_LIMIT} webhook deliveries we accepted, newest first. Use
        Replay to re-fire a payload against our own webhook handler — handlers
        are idempotent (markProcessed), so a replay tests "did the original
        delivery complete" without re-running side effects.
      </p>

      {/* Cold-start advisory — matches dunning page wording */}
      <div
        style={{
          background: '#fffbeb',
          borderLeft: '4px solid #d97706',
          padding: '12px 16px',
          marginBottom: 24,
          fontSize: 13,
          color: '#78350f',
          borderRadius: 6,
        }}
      >
        <strong>Cold-start caveat.</strong> Webhook idempotency state lives in this
        Vercel instance&apos;s memory (ADR 001). A recent deploy or idle-recycle
        clears it — a Replay after a cold start will re-run the handler&apos;s
        side effects (welcome email, owner notification). Replays during the
        same warm instance short-circuit on the in-memory dedup map; that is
        the intended ops semantics — we&apos;re testing that the original
        delivery completed.
      </div>

      {/* Empty state — DB dormant */}
      {rows === null && (
        <div
          style={{
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            padding: '24px 20px',
            color: '#374151',
            fontSize: 14,
            textAlign: 'center',
            marginBottom: 32,
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>No payment events recorded yet.</p>
          <p style={{ margin: '8px 0 0', color: '#6b7280' }}>
            Set <code>DATABASE_URL</code> to activate.
          </p>
        </div>
      )}

      {/* Empty state — DB live but no rows yet */}
      {rows !== null && rows.length === 0 && (
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
            marginBottom: 32,
          }}
        >
          DB is live but no webhook events have landed yet. First Adopt-a-Paca
          subscription will populate this table.
        </div>
      )}

      {/* Events table */}
      {rows !== null && rows.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={th}>Timestamp</th>
                <th style={th}>Vendor</th>
                <th style={th}>Event type</th>
                <th style={th}>Customer</th>
                <th style={th}>Idempotency key</th>
                <th style={th}>Replay</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={td}>{fmtTimestamp(r.processedAt)}</td>
                  <td style={td}><VendorBadge vendor={r.vendor} /></td>
                  <td style={td}><code style={{ fontSize: 12 }}>{r.eventType}</code></td>
                  <td style={td}>
                    <code style={{ fontSize: 12 }}>
                      {maskCustomerId(bareVendorId(r.customerId))}
                    </code>
                  </td>
                  <td style={td}>
                    <code style={{ fontSize: 11, color: '#6b7280' }}>{r.idempotencyKey}</code>
                  </td>
                  <td style={td}>
                    <ReplayButton eventId={r.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 24 }}>
        Showing up to {EVENTS_LIMIT} rows. Older events are still in the DB —
        query <code>payment_events</code> directly for historical replay.
      </p>
    </div>
  )
}
