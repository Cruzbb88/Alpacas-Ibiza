import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { _internalGetStoreSnapshot } from '@/lib/payment-failure-tracker'
import { type DunningEntry } from '@/lib/payment-failure-tracker-readers'
import { Kpi } from '@/components/admin/Kpi'
import { adminTh as th, adminTd as td } from '@/lib/admin-styles'

export const metadata = {
  title: 'Dunning — Admin',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
}

// Always recompute on request — in-memory store, no stale caching useful here.
export const dynamic = 'force-dynamic'
export const revalidate = 0

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(epochMs: number): string {
  const diffMs = Date.now() - epochMs
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

function oldestEntry(entries: ReadonlyArray<DunningEntry>): DunningEntry | null {
  if (entries.length === 0) return null
  return entries.reduce((oldest, e) =>
    e.lastFailureAt < oldest.lastFailureAt ? e : oldest,
  )
}

function suggestedAction(severity: DunningEntry['severity']): string {
  return severity === 'action-required' ? 'Mark as lapsed' : 'WhatsApp follow-up'
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SeverityBadge({ severity }: { severity: DunningEntry['severity'] }) {
  const styles: Record<DunningEntry['severity'], React.CSSProperties> = {
    first: { background: '#e5e7eb', color: '#374151' },
    'at-risk': { background: '#fef3c7', color: '#92400e' },
    'action-required': { background: '#fee2e2', color: '#991b1b' },
  }
  const labels: Record<DunningEntry['severity'], string> = {
    first: 'first',
    'at-risk': 'at-risk',
    'action-required': 'action-required',
  }
  return (
    <span
      style={{
        ...styles[severity],
        padding: '2px 8px',
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        whiteSpace: 'nowrap',
      }}
    >
      {labels[severity]}
    </span>
  )
}

function DunningTable({
  entries,
  headerBg,
  headerColor,
  emptyMessage,
}: {
  entries: ReadonlyArray<DunningEntry>
  headerBg: string
  headerColor: string
  emptyMessage: string
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: headerBg }}>
            <th style={{ ...th, color: headerColor }}>Vendor</th>
            <th style={{ ...th, color: headerColor }}>Customer ID</th>
            <th style={{ ...th, color: headerColor }}>Severity</th>
            <th style={{ ...th, color: headerColor }}>Fails</th>
            <th style={{ ...th, color: headerColor }}>Last failure</th>
            <th style={{ ...th, color: headerColor }}>Last success</th>
            <th style={{ ...th, color: headerColor }}>Suggested action</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td style={td} colSpan={7}>
                <em>{emptyMessage}</em>
              </td>
            </tr>
          ) : (
            entries.map((e) => (
              <tr key={`${e.vendor}:${e.customerId}`}>
                <td style={td}>{e.vendor}</td>
                <td style={td}>
                  <code style={{ fontSize: 12 }}>{e.customerId}</code>
                </td>
                <td style={td}>
                  <SeverityBadge severity={e.severity} />
                </td>
                <td style={{ ...td, fontWeight: 700 }}>{e.count}</td>
                <td style={td}>{relativeTime(e.lastFailureAt)}</td>
                <td style={td}>
                  {e.lastSuccessAt !== null ? relativeTime(e.lastSuccessAt) : 'never recorded'}
                </td>
                <td style={{ ...td, color: e.severity === 'action-required' ? '#991b1b' : '#92400e' }}>
                  {suggestedAction(e.severity)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminDunningPage() {
  const session = await getServerSession(auth)
  if (!session) redirect('/admin/login')

  // Single snapshot read. Each call to _internalGetStoreSnapshot triggers a
  // TTL purge — calling it twice (once per severity) doubles that cost and,
  // worse, opens a window where the second call sees a freshly-purged entry
  // the first call still listed. One read, partition in memory.
  const snapshot = _internalGetStoreSnapshot() as ReadonlyArray<DunningEntry>
  const actionRequired = snapshot.filter((e) => e.severity === 'action-required')
  const atRisk = snapshot.filter((e) => e.severity === 'at-risk')

  const allAtRisk = [...actionRequired, ...atRisk]
  const oldest = oldestEntry(allAtRisk)

  const isEmpty = actionRequired.length === 0 && atRisk.length === 0

  return (
    <div
      style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 1100, margin: '0 auto', padding: '32px 16px' }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>
          Dunning — donors needing follow-up
        </h1>
        <a
          href="/admin/analytics/dunning"
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
      <p style={{ color: '#6b7280', marginBottom: 16 }}>
        At-risk (2+ failures) and action-required (3+ failures) donors. Refreshes on every load.
      </p>

      {/* Cold-start advisory */}
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
        <strong>⚠️ Cold-start caveat.</strong> Failure counters live in this Vercel
        instance&apos;s memory (ADR 001). A recent deploy, idle-recycle, or cron warm-up resets
        them — donors who failed before that restart will be missing from the lists below.
        Before marking a donor lapsed, cross-check Mollie&apos;s charge log directly.
      </div>

      {/* KPI strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        <Kpi
          label="Action required (3+ fails)"
          value={actionRequired.length.toString()}
          negative={actionRequired.length > 0}
        />
        <Kpi
          label="At-risk (2 fails)"
          value={atRisk.length.toString()}
          negative={atRisk.length > 0}
        />
        <Kpi
          label="Oldest unresolved"
          value={oldest !== null ? relativeTime(oldest.lastFailureAt) : '—'}
          negative={oldest !== null}
        />
      </div>

      {/* Empty state */}
      {isEmpty ? (
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
          All donors current. No at-risk or action-required entries in this instance&apos;s store.
        </div>
      ) : (
        <>
          {/* Action required table */}
          <h2 style={{ fontSize: 18, marginBottom: 12, color: '#991b1b' }}>
            Action required ({actionRequired.length})
          </h2>
          <div style={{ marginBottom: 32 }}>
            <DunningTable
              entries={actionRequired}
              headerBg="#fee2e2"
              headerColor="#991b1b"
              emptyMessage="No action-required donors."
            />
          </div>

          {/* At-risk table */}
          <h2 style={{ fontSize: 18, marginBottom: 12, color: '#92400e' }}>
            At-risk — 2 fails ({atRisk.length})
          </h2>
          <div style={{ marginBottom: 32 }}>
            <DunningTable
              entries={atRisk}
              headerBg="#fef3c7"
              headerColor="#92400e"
              emptyMessage="No at-risk donors."
            />
          </div>
        </>
      )}

      {/* Instance-scope disclaimer */}
      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 16 }}>
        View reflects this Lambda instance&apos;s state — refresh after a recent webhook delivery to confirm.
      </p>
    </div>
  )
}
