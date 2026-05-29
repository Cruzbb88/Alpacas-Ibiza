import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { getMollieClient } from '@/lib/integrations/payment-mollie'
import { adminTh as th, adminTd as td } from '@/lib/admin-styles'

export const metadata = {
  title: 'Referrals — Admin',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
}

// Always recompute on request — admin-only, low traffic, and the Mollie page
// iteration is cheap relative to the human-read latency of an admin
// refreshing this dashboard.
export const dynamic = 'force-dynamic'
export const revalidate = 0

// ─── Internal shapes ────────────────────────────────────────────────────────
// Narrow what we read from Mollie. The `subscriptions.iterate()` SDK call
// returns the cross-customer page; we only need id, status, createdAt and
// metadata.referredBy for the grouping below.
interface SubRaw {
  id: string
  status?: string
  createdAt?: string
  metadata?: { referredBy?: string } | null
}

interface ReferralGroupRow {
  /** Referrer's 6-char code as stored in metadata.referredBy. */
  refCode: string
  /** Total active+pending subscriptions attributed to this referrer. */
  count: number
  /** Newest createdAt across the group, ISO 8601 — drives the "Latest" column. */
  latestReferralAt: string | null
}

/**
 * Group active subscriptions by metadata.referredBy and rank by count.
 *
 * "Active" here = status === 'active' || 'pending'. Canceled subs are
 * deliberately excluded so a referrer who brought in someone who churned
 * after one month doesn't keep showing in the leaderboard forever — when
 * the owner uses this page to thank top referrers, they want to thank for
 * *current* contribution.
 */
function groupByReferrer(rows: SubRaw[]): ReferralGroupRow[] {
  const byCode = new Map<string, { count: number; latest: string | null }>()
  for (const r of rows) {
    const code = r.metadata?.referredBy?.trim()
    if (!code) continue
    const status = r.status ?? 'unknown'
    if (status !== 'active' && status !== 'pending') continue
    const prev = byCode.get(code) ?? { count: 0, latest: null }
    prev.count += 1
    if (r.createdAt) {
      if (!prev.latest || r.createdAt > prev.latest) prev.latest = r.createdAt
    }
    byCode.set(code, prev)
  }
  return Array.from(byCode.entries())
    .map(([refCode, v]) => ({ refCode, count: v.count, latestReferralAt: v.latest }))
    .sort((a, b) => {
      // Highest count first, then most-recent referral as tiebreaker — the
      // dashboard's job is to surface "who is bringing donors NOW".
      if (b.count !== a.count) return b.count - a.count
      if (a.latestReferralAt === b.latestReferralAt) return 0
      if (a.latestReferralAt === null) return 1
      if (b.latestReferralAt === null) return -1
      return b.latestReferralAt.localeCompare(a.latestReferralAt)
    })
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

interface FetchResult {
  rows: SubRaw[]
  /** Human-readable error message when something went wrong; null on success. */
  error: string | null
  /** False when MOLLIE_API_KEY unset OR the SDK package is missing. */
  hasMollie: boolean
}

/**
 * Page subscriptions across the merchant account, capping at 500 to match
 * the existing /admin/analytics/subscriptions ceiling. Fail-quiet: any
 * iteration error returns the partial set + an error string the page
 * surfaces as a banner.
 */
async function fetchSubscriptions(): Promise<FetchResult> {
  const apiKey = process.env.MOLLIE_API_KEY
  if (!apiKey) {
    return { rows: [], error: 'MOLLIE_API_KEY is not set', hasMollie: false }
  }
  const mollie = await getMollieClient(apiKey)
  if (!mollie) {
    return { rows: [], error: '@mollie/api-client is not installed', hasMollie: false }
  }

  const rows: SubRaw[] = []
  const ITERATION_CAP = 500
  try {
    const iter = (mollie as unknown as {
      subscriptions: { iterate: () => AsyncIterable<SubRaw> }
    }).subscriptions.iterate()
    let i = 0
    for await (const raw of iter) {
      i++
      if (i > ITERATION_CAP) {
        return {
          rows,
          error: `Iteration capped at ${ITERATION_CAP} subscriptions — leaderboard reflects first ${ITERATION_CAP} only.`,
          hasMollie: true,
        }
      }
      rows.push(raw)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { rows, error: message, hasMollie: true }
  }
  return { rows, error: null, hasMollie: true }
}

export default async function AdminReferralsPage() {
  const session = await getServerSession(auth)
  if (!session) redirect('/admin/login')

  const { rows, error, hasMollie } = await fetchSubscriptions()
  const groups = groupByReferrer(rows)

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Referrals</h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>
        Active &amp; pending Mollie subscriptions grouped by{' '}
        <code style={{ background: '#f3f4f6', padding: '1px 6px', borderRadius: 4 }}>
          metadata.referredBy
        </code>
        . Refreshes on every load.
      </p>

      {!hasMollie && (
        <div
          style={{
            background: '#fff3f3',
            borderLeft: '4px solid #a44',
            padding: 16,
            marginBottom: 24,
            color: '#a44',
          }}
        >
          <strong>Mollie not available.</strong>{' '}
          {error ?? 'Set MOLLIE_API_KEY + install @mollie/api-client.'}
        </div>
      )}
      {hasMollie && error && (
        <div
          style={{
            background: '#fff8e1',
            borderLeft: '4px solid #ffb300',
            padding: 16,
            marginBottom: 24,
            color: '#7a5500',
          }}
        >
          <strong>Partial data.</strong> {error} Showing {groups.length} referrers across {rows.length} fetched subscriptions.
        </div>
      )}

      {groups.length === 0 ? (
        <div
          style={{
            background: '#f9fafb',
            border: '1px dashed #d1d5db',
            borderRadius: 10,
            padding: '32px 20px',
            color: '#6b7280',
            fontSize: 15,
            textAlign: 'center',
          }}
        >
          <em>No referrals yet.</em>
          <p style={{ fontSize: 13, marginTop: 8, color: '#9ca3af' }}>
            Each donor&apos;s portal shows a stable 6-char code. Once a referred
            donor checks out with{' '}
            <code style={{ background: '#fff', padding: '1px 4px', borderRadius: 3 }}>
              ?ref=XXXXXX
            </code>{' '}
            in the URL, the attribution appears here.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={th}>Ref code</th>
                <th style={th}>Subscriptions referred</th>
                <th style={th}>Latest referral</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.refCode}>
                  <td style={td}>
                    <code style={{ fontSize: 13, fontWeight: 600 }}>{g.refCode}</code>
                  </td>
                  <td style={{ ...td, fontWeight: 700 }}>{g.count}</td>
                  <td style={td}>{formatDate(g.latestReferralAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 24 }}>
        Counts include status=active and status=pending. Canceled subscriptions
        are excluded so the leaderboard reflects current contribution, not
        historical sign-ups.
      </p>
    </div>
  )
}
