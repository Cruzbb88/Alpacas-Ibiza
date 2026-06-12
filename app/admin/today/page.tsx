import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import Link from 'next/link'
import { getActiveAdopterCount } from '@/lib/adopters/count'
import { listAtRiskDonors } from '@/lib/payment-failure-tracker-readers'

export const metadata = {
  title: 'Today — Alpacas Admin',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
}

// Always fresh — live ops digest
export const dynamic = 'force-dynamic'
export const revalidate = 0

// ── Inline card shell (no UI lib dependency in admin surface) ──────────────
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: '20px 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
      className={className}
    >
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: '#9ca3af',
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  )
}

function BigNumber({ value, label }: { value: string | number; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span style={{ fontSize: 36, fontWeight: 800, color: '#111827', lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: 14, color: '#6b7280' }}>{label}</span>
    </div>
  )
}

// ── Fetch today's FareHarbor availability (server-side, no auth needed) ────
async function fetchTodayAvailability(): Promise<{ configured: boolean; slots: number | null }> {
  const appKey = process.env.FAREHARBOR_APP_KEY
  const userKey = process.env.FAREHARBOR_USER_KEY
  if (!appKey || !userKey) {
    return { configured: false, slots: null }
  }
  try {
    // Call internal API — reuse the existing route that already handles FH keys,
    // timeout, and fail-open semantics.
    const base = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const url = `${base}/api/availability?date=${today}`
    const res = await fetch(url, {
      headers: { 'x-internal': '1' },
      next: { revalidate: 0 },
    })
    if (!res.ok) return { configured: true, slots: null }
    const data = (await res.json()) as { availabilities?: unknown[] }
    const count = Array.isArray(data.availabilities) ? data.availabilities.length : null
    return { configured: true, slots: count }
  } catch {
    return { configured: true, slots: null }
  }
}

export default async function AdminTodayPage() {
  const session = await getServerSession(auth)
  if (!session) redirect('/admin/login')

  // Fetch in parallel — all are read-only, fail-quiet
  const [availability, adopterResult] = await Promise.all([
    fetchTodayAvailability(),
    getActiveAdopterCount(),
  ])

  // At-risk donors from in-memory dunning store (sync read, no await)
  const atRiskDonors = listAtRiskDonors()

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <main
      style={{
        fontFamily: 'system-ui, sans-serif',
        maxWidth: 600,
        margin: '0 auto',
        padding: '24px 16px 48px',
      }}
    >
      {/* Install banner — visible on mobile only (md:hidden via Tailwind className) */}
      <div className="md:hidden mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        On your phone? Tap browser menu → <strong>Add to Home Screen</strong> to install Alpacas Admin.
      </div>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: '#111827' }}>
          Today
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4, marginBottom: 0 }}>
          {today}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Card 1: Today's tours ──────────────────────────────────────── */}
        <Card>
          <SectionLabel>Today&apos;s tours</SectionLabel>
          {!availability.configured ? (
            <p style={{ fontSize: 15, color: '#6b7280', margin: 0 }}>
              FareHarbor not connected.{' '}
              <Link
                href="/admin/env-check"
                style={{ color: '#AD561A', textDecoration: 'none', fontWeight: 600 }}
              >
                Check env vars →
              </Link>
            </p>
          ) : availability.slots === null ? (
            <p style={{ fontSize: 15, color: '#6b7280', margin: 0 }}>
              Could not load availability — FareHarbor may be slow.
            </p>
          ) : (
            <BigNumber value={availability.slots} label="available time slots" />
          )}
        </Card>

        {/* ── Card 2: Active adopters ────────────────────────────────────── */}
        <Card>
          <SectionLabel>Active adopters</SectionLabel>
          {adopterResult.source === 'unconfigured' ? (
            <p style={{ fontSize: 15, color: '#6b7280', margin: 0 }}>
              Payment vendor not configured.
            </p>
          ) : adopterResult.source === 'error' ? (
            <p style={{ fontSize: 15, color: '#a44', margin: 0 }}>
              Error reading adopter count.
            </p>
          ) : (
            <>
              <BigNumber value={adopterResult.count} label="active" />
              {/* TODO: last-7d delta needs DB query — show total only for now */}
              <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 6, marginBottom: 0 }}>
                Last-7d delta not yet available — needs DB (see /admin/analytics/subscriptions).
              </p>
            </>
          )}
        </Card>

        {/* ── Card 3: At-risk dunning ────────────────────────────────────── */}
        <Card>
          <SectionLabel>At-risk donors</SectionLabel>
          {atRiskDonors.length === 0 ? (
            <p style={{ fontSize: 15, color: '#16a34a', fontWeight: 600, margin: 0 }}>
              All donors current — no follow-up needed.
            </p>
          ) : (
            <>
              <BigNumber
                value={atRiskDonors.length}
                label={atRiskDonors.length === 1 ? 'donor needs follow-up' : 'donors need follow-up'}
              />
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '12px 0 0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {atRiskDonors.slice(0, 5).map((d) => (
                  <li
                    key={`${d.vendor}:${d.customerId}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 14,
                      color: '#374151',
                    }}
                  >
                    <code style={{ fontSize: 12, color: '#6b7280' }}>{d.customerId}</code>
                    <span
                      style={{
                        background: d.severity === 'action-required' ? '#fee2e2' : '#fef3c7',
                        color: d.severity === 'action-required' ? '#991b1b' : '#92400e',
                        padding: '2px 8px',
                        borderRadius: 9999,
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}
                    >
                      {d.severity}
                    </span>
                  </li>
                ))}
              </ul>
              {atRiskDonors.length > 5 && (
                <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8, marginBottom: 0 }}>
                  +{atRiskDonors.length - 5} more
                </p>
              )}
              <Link
                href="/admin/analytics/dunning"
                style={{
                  display: 'inline-block',
                  marginTop: 12,
                  fontSize: 14,
                  color: '#AD561A',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                View full dunning report →
              </Link>
            </>
          )}
        </Card>

        {/* ── Card 4: Quick actions ──────────────────────────────────────── */}
        <Card>
          <SectionLabel>Quick actions</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(
              [
                { href: '/admin/quarterly-update',   label: 'Send quarterly update' },
                { href: '/admin/suppressions',        label: 'Run renewal reminders' },
                { href: '/admin/analytics',           label: 'View weekly digest' },
                { href: '/admin/birthday-test',       label: 'Trigger today\'s birthday emails' },
              ] as const
            ).map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: 48,
                  padding: '10px 16px',
                  background: '#FFFAF0',
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#111827',
                  textDecoration: 'none',
                }}
              >
                {label}
              </Link>
            ))}
          </div>
        </Card>

      </div>

      {/* Back to full admin */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Link
          href="/admin"
          style={{
            fontSize: 14,
            color: '#6b7280',
            textDecoration: 'none',
          }}
        >
          ← All admin pages
        </Link>
      </div>
    </main>
  )
}
