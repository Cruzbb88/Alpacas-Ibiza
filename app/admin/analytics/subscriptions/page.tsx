import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { getMollieClient } from '@/lib/integrations/payment-mollie'
import { Kpi } from '@/components/admin/Kpi'
import { adminTh as th, adminTd as td } from '@/lib/admin-styles'
import { listActiveSubscriptionsFromDb } from '@/lib/db/read-subscriptions'

export const metadata = {
  title: 'Subscriptions — Admin',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
}

// Always recompute on request — this is admin-only and not heavily trafficked.
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface SubscriptionRow {
  id: string
  customerId: string | null
  status: string
  amountValue: number
  amountCurrency: string
  interval: string
  tier: string | null
  createdAt: string | null
  canceledAt: string | null
  nextPaymentDate: string | null
}

/**
 * Estimate normalised monthly revenue contribution for a subscription line.
 * Yearly subs are divided by 12 so MRR aggregates cleanly across interval mixes.
 * The amount.value is a string per Mollie; parse defensively.
 */
function monthlyContribution(row: SubscriptionRow): number {
  const v = Number.parseFloat(row.amountValue.toString())
  if (!Number.isFinite(v)) return 0
  const intervalLower = (row.interval ?? '').toLowerCase()
  if (intervalLower.includes('year') || intervalLower === '12 months' || intervalLower === '1 year') {
    return v / 12
  }
  // Default: monthly (Mollie's "1 month" / "month" patterns).
  return v
}

function isActive(status: string): boolean {
  return status === 'active' || status === 'pending'
}

// Process-scoped 60-second cache. Same pattern as lib/webhook-idempotency.ts.
// At Mollie's typical ~80ms p50 per page × 10 pages = ~800ms, the first
// dashboard load per cold-start pays that latency; subsequent admin refreshes
// within 60s serve from this snapshot. Multi-instance Vercel = per-instance
// cache (acceptable for admin traffic). Performance-optimizer 2026-05-29.
interface SnapshotPayload {
  rows: SubscriptionRow[]
  fetchError: string | null
  hasMollie: boolean
}
const SNAPSHOT_TTL_MS = 60_000
const globalForSnapshot = globalThis as unknown as {
  __subsSnapshot?: { value: SnapshotPayload; at: number }
}

async function fetchAllSubscriptions(): Promise<SnapshotPayload> {
  const cached = globalForSnapshot.__subsSnapshot
  if (cached && Date.now() - cached.at < SNAPSHOT_TTL_MS) {
    return cached.value
  }

  const apiKey = process.env.MOLLIE_API_KEY
  if (!apiKey) {
    return { rows: [], fetchError: 'MOLLIE_API_KEY is not set', hasMollie: false }
  }
  const mollie = await getMollieClient(apiKey)
  if (!mollie) {
    return { rows: [], fetchError: '@mollie/api-client is not installed', hasMollie: false }
  }

  // Page through every subscription across the merchant account. The
  // top-level Subscriptions endpoint (not the customer-scoped one) returns
  // all subscriptions for the API key's merchant. Cap at 500 (down from 2000
  // per resonance-finder 2026-05-29): at €75/mo SEPA that's €37.5k MRR which
  // is years away. The truncation banner below surfaces the cap if hit.
  type SubRaw = {
    id: string
    customerId?: string | null
    status?: string
    amount?: { value: string; currency: string }
    interval?: string
    description?: string
    createdAt?: string
    canceledAt?: string | Date
    nextPaymentDate?: string
    metadata?: { tier?: string }
  }

  const rows: SubscriptionRow[] = []
  try {
    // The SDK exposes `subscriptions.iterate({})` at the top level for cross-
    // customer paging.
    const iter = (mollie as unknown as {
      subscriptions: { iterate: () => AsyncIterable<SubRaw> }
    }).subscriptions.iterate()
    const ITERATION_CAP = 500
    let i = 0
    let truncated = false
    for await (const raw of iter) {
      i++
      if (i > ITERATION_CAP) {
        truncated = true
        break
      }
      rows.push({
        id: raw.id,
        customerId: raw.customerId ?? null,
        status: raw.status ?? 'unknown',
        amountValue: raw.amount ? Number.parseFloat(raw.amount.value) : 0,
        amountCurrency: raw.amount?.currency ?? 'EUR',
        interval: raw.interval ?? '',
        tier: raw.metadata?.tier ?? null,
        createdAt: raw.createdAt ?? null,
        canceledAt:
          raw.canceledAt instanceof Date
            ? raw.canceledAt.toISOString()
            : (typeof raw.canceledAt === 'string' ? raw.canceledAt : null),
        nextPaymentDate: raw.nextPaymentDate ?? null,
      })
    }
    if (truncated) {
      // Truncated state: surface the cap-hit through fetchError so the banner
      // renders, but do NOT cache — truncated data may be stale/partial and
      // the next admin load should re-fetch (peer review 2026-05-29 item 6;
      // fixed 2026-06-05). Full success path below is the only cached path.
      return {
        rows,
        fetchError: `Iteration capped at ${ITERATION_CAP} subscriptions — KPIs are based on the first ${ITERATION_CAP} only. Bump cap or implement DB snapshot when this trips.`,
        hasMollie: true,
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // Error payloads are NOT cached — the next admin load should retry fresh
    // so a transient Mollie blip doesn't poison every refresh for 60s
    // (peer review 2026-05-29 item 6; fixed 2026-06-05).
    return { rows, fetchError: message, hasMollie: true }
  }

  const payload: SnapshotPayload = { rows, fetchError: null, hasMollie: true }
  globalForSnapshot.__subsSnapshot = { value: payload, at: Date.now() }
  return payload
}

function relativeDay(iso: string | null): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: '2-digit' })
  } catch {
    return iso
  }
}

interface ChurnBuckets {
  active: number
  canceledLast30: number
  canceledLast90: number
  newLast30: number
}

function computeBuckets(rows: SubscriptionRow[]): ChurnBuckets {
  const now = Date.now()
  const ms30 = 30 * 24 * 60 * 60 * 1000
  const ms90 = 90 * 24 * 60 * 60 * 1000
  let active = 0
  let canceledLast30 = 0
  let canceledLast90 = 0
  let newLast30 = 0
  for (const r of rows) {
    if (isActive(r.status)) active++
    if (r.canceledAt) {
      const cancelMs = new Date(r.canceledAt).getTime()
      if (now - cancelMs <= ms30) canceledLast30++
      if (now - cancelMs <= ms90) canceledLast90++
    }
    if (r.createdAt) {
      const createMs = new Date(r.createdAt).getTime()
      if (now - createMs <= ms30) newLast30++
    }
  }
  return { active, canceledLast30, canceledLast90, newLast30 }
}

export default async function AdminSubscriptionsPage() {
  const session = await getServerSession(auth)
  if (!session) redirect('/admin/login')

  // Prefer the local DB mirror when DATABASE_URL is set. Returns null when
  // the DB layer is dormant (no DATABASE_URL) or a transient error fired —
  // both cases fall through to the existing Mollie-iteration path so this
  // page never goes dark when the DB is unavailable.
  const dbRows = await listActiveSubscriptionsFromDb()
  const sourceMode: 'db' | 'mollie' = dbRows ? 'db' : 'mollie'

  let rows: SubscriptionRow[]
  let fetchError: string | null
  let hasMollie: boolean
  if (dbRows) {
    rows = dbRows.map((r) => ({
      id: r.vendorSubscriptionId,
      customerId: r.customerEmail ?? r.customerId, // surface email when present, fall back to local id
      status: r.status,
      amountValue: r.amountEur,
      amountCurrency: r.amountCurrency,
      interval: r.interval,
      tier: r.tier,
      createdAt: r.createdAt,
      canceledAt: r.canceledAt,
      nextPaymentDate: null, // DB schema doesn't snapshot next charge; Mollie path retains it
    }))
    fetchError = null
    hasMollie = true // suppress the "Mollie unavailable" banner — DB is authoritative
  } else {
    const fetched = await fetchAllSubscriptions()
    rows = fetched.rows
    fetchError = fetched.fetchError
    hasMollie = fetched.hasMollie
  }

  const buckets = computeBuckets(rows)
  const activeRows = rows.filter((r) => isActive(r.status))
  const mrr = activeRows.reduce((acc, r) => acc + monthlyContribution(r), 0)
  const arr = mrr * 12

  // Churn rate over the last 30 days = canceled30 / (active + canceled30).
  // Treats the snapshot population as (still active + recently churned).
  const churn30 =
    buckets.active + buckets.canceledLast30 === 0
      ? 0
      : (buckets.canceledLast30 / (buckets.active + buckets.canceledLast30)) * 100

  // Tier breakdown
  const tierCounts = new Map<string, number>()
  for (const r of activeRows) {
    const t = r.tier ?? 'unknown'
    tierCounts.set(t, (tierCounts.get(t) ?? 0) + 1)
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 1100, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Adopt-a-Paca subscriptions</h1>
      <p style={{ color: '#6b7280', marginBottom: 8 }}>
        Mollie-side view of the herd's recurring revenue. Refreshes on every load.
      </p>
      {/*
       * Source indicator — surfaces which read path served this page so the
       * owner can verify the DB mirror is being preferred after DATABASE_URL
       * is provisioned. "Source: DB" = local Postgres mirror; "Source: Mollie
       * live" = per-request Mollie iteration (DB dormant or errored).
       */}
      <p style={{ color: sourceMode === 'db' ? '#15803d' : '#a16207', marginBottom: 24, fontSize: 13 }}>
        Source: {sourceMode === 'db' ? 'DB (local Postgres mirror)' : 'Mollie live (no DB configured)'}
      </p>

      {!hasMollie && (
        <div style={{ background: '#fff3f3', borderLeft: '4px solid #a44', padding: 16, marginBottom: 24, color: '#a44' }}>
          <strong>Mollie not available.</strong> {fetchError ?? 'Set MOLLIE_API_KEY + install @mollie/api-client.'}
        </div>
      )}
      {hasMollie && fetchError && (
        <div style={{ background: '#fff8e1', borderLeft: '4px solid #ffb300', padding: 16, marginBottom: 24, color: '#7a5500' }}>
          <strong>Partial data.</strong> Iteration stopped: {fetchError}. Showing {rows.length} subscriptions retrieved before error.
        </div>
      )}

      {/* Headline KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        <Kpi label="MRR (€)" value={mrr.toFixed(2)} />
        <Kpi label="ARR (€)" value={arr.toFixed(0)} />
        <Kpi label="Active subscribers" value={buckets.active.toString()} />
        <Kpi label="New (30d)" value={`+${buckets.newLast30}`} />
        <Kpi label="Canceled (30d)" value={`−${buckets.canceledLast30}`} negative={buckets.canceledLast30 > 0} />
        <Kpi label="Churn 30d (%)" value={churn30.toFixed(1)} negative={churn30 > 5} />
      </div>

      {/* Tier breakdown */}
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Active by tier</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 32 }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={th}>Tier</th>
            <th style={th}>Count</th>
            <th style={th}>Share</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(tierCounts.entries()).map(([tier, count]) => (
            <tr key={tier}>
              <td style={td}>{tier}</td>
              <td style={td}>{count}</td>
              <td style={td}>{((count / (activeRows.length || 1)) * 100).toFixed(1)}%</td>
            </tr>
          ))}
          {tierCounts.size === 0 && (
            <tr>
              <td style={td} colSpan={3}><em>No active subscriptions yet.</em></td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Detail table */}
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>All subscriptions ({rows.length})</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={th}>ID</th>
              <th style={th}>Customer</th>
              <th style={th}>Status</th>
              <th style={th}>Tier</th>
              <th style={th}>Amount</th>
              <th style={th}>Interval</th>
              <th style={th}>Created</th>
              <th style={th}>Next charge</th>
              <th style={th}>Canceled</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={td}><code>{r.id}</code></td>
                <td style={td}><code>{r.customerId ?? '—'}</code></td>
                <td style={td}>{r.status}</td>
                <td style={td}>{r.tier ?? '—'}</td>
                <td style={td}>{r.amountValue.toFixed(2)} {r.amountCurrency}</td>
                <td style={td}>{r.interval}</td>
                <td style={td}>{relativeDay(r.createdAt)}</td>
                <td style={td}>{relativeDay(r.nextPaymentDate)}</td>
                <td style={td}>{r.canceledAt ? relativeDay(r.canceledAt) : '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td style={td} colSpan={9}><em>No subscriptions found.</em></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

