/**
 * /admin/launch-readiness — Live launch-readiness dashboard.
 * Server component. Session-gated. Runs all checks via shared lib.
 * Refresh button posts ?refresh=1 (no-op now; all checks are dynamic).
 */

import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { runLaunchReadinessChecks } from '@/lib/launch-readiness/checks'
import type { LaunchReadinessCheck } from '@/lib/launch-readiness/checks'

export const metadata = {
  title: 'Launch Readiness — Admin',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

// ── Traffic-light icon ────────────────────────────────────────────────────────

function StatusDot({ status }: { status: LaunchReadinessCheck['status'] }) {
  if (status === 'pass') {
    return (
      <span
        aria-label="Passed"
        style={{
          display: 'inline-block',
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: '#16a34a',
          flexShrink: 0,
          marginTop: 4,
        }}
      />
    )
  }
  if (status === 'warn') {
    return (
      <span
        aria-label="Warning"
        style={{
          display: 'inline-block',
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderBottom: '11px solid #ca8a04',
          flexShrink: 0,
          marginTop: 2,
        }}
      />
    )
  }
  if (status === 'fail') {
    return (
      <span
        aria-label="Failed"
        style={{
          display: 'inline-block',
          fontWeight: 700,
          color: '#dc2626',
          fontSize: 14,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ✕
      </span>
    )
  }
  // skip
  return (
    <span
      aria-label="Skipped"
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: '#d1d5db',
        flexShrink: 0,
        marginTop: 4,
      }}
    />
  )
}

// ── Check row ─────────────────────────────────────────────────────────────────

function CheckRow({ check }: { check: LaunchReadinessCheck }) {
  const rowBg =
    check.status === 'fail'
      ? '#fef2f2'
      : check.status === 'warn'
      ? '#fffbeb'
      : undefined

  return (
    <li
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        padding: '10px 12px',
        borderBottom: '1px solid #f3f4f6',
        background: rowBg,
      }}
    >
      <StatusDot status={check.status} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#111827',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <span style={{ fontFamily: 'monospace' }}>{check.label}</span>
          {check.blocking && check.status === 'fail' && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                background: '#dc2626',
                color: '#fff',
                borderRadius: 4,
                padding: '1px 5px',
                letterSpacing: 0.5,
              }}
            >
              BLOCKER
            </span>
          )}
        </div>
        {check.detail && (
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{check.detail}</div>
        )}
      </div>
    </li>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({
  title,
  checks,
}: {
  title: string
  checks: LaunchReadinessCheck[]
}) {
  const fails = checks.filter((c) => c.status === 'fail').length
  const warns = checks.filter((c) => c.status === 'warn').length
  const passes = checks.filter((c) => c.status === 'pass').length

  let headerAccent = '#16a34a'
  if (fails > 0) headerAccent = '#dc2626'
  else if (warns > 0) headerAccent = '#ca8a04'

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 20,
      }}
    >
      <div
        style={{
          background: '#f9fafb',
          padding: '10px 14px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#111827' }}>{title}</h2>
        <span style={{ fontSize: 12, color: headerAccent, fontWeight: 600 }}>
          {passes}/{checks.length} pass
          {fails > 0 ? ` · ${fails} fail` : ''}
          {warns > 0 ? ` · ${warns} warn` : ''}
        </span>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {checks.map((c) => (
          <CheckRow key={c.id} check={c} />
        ))}
        {checks.length === 0 && (
          <li style={{ padding: '10px 12px', color: '#9ca3af', fontSize: 13 }}>No checks</li>
        )}
      </ul>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function LaunchReadinessPage() {
  const session = await getServerSession(auth)
  if (!session) redirect('/admin/login')

  const report = await runLaunchReadinessChecks()

  const tier1 = report.checks.filter((c) => c.category === 'tier1-required')
  const tier2 = report.checks.filter((c) => c.category === 'tier2-graceful')
  const content = report.checks.filter((c) => c.category === 'content')
  const integrations = report.checks.filter((c) => c.category === 'integrations')
  const compliance = report.checks.filter((c) => c.category === 'compliance')

  const { blockerCount, warnCount, overall, summary } = report

  let headlineColor = '#16a34a'
  if (overall === 'blocked') headlineColor = '#dc2626'
  else if (overall === 'launching-with-warnings') headlineColor = '#ca8a04'

  const bannerBg = overall === 'blocked' ? '#fef2f2' : overall === 'ready' ? '#f0fdf4' : '#fffbeb'
  const bannerBorder = overall === 'blocked' ? '#fca5a5' : overall === 'ready' ? '#86efac' : '#fde68a'

  return (
    <div
      style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}
    >
      {/* Header */}
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Launch Readiness</h1>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
            Live checks against env vars, content, integrations, and compliance.
          </p>
        </div>
        <form method="GET" action="/admin/launch-readiness">
          <button
            type="submit"
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 600,
              background: '#1d4ed8',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Re-run checks
          </button>
        </form>
      </div>

      {/* Summary banner */}
      <div
        style={{
          background: bannerBg,
          border: `1px solid ${bannerBorder}`,
          borderRadius: 8,
          padding: '14px 18px',
          marginBottom: 28,
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 700, color: headlineColor }}>
          {overall === 'ready' && 'Ready to launch — all checks passing.'}
          {overall === 'blocked' && `Blocked — ${blockerCount} blocker${blockerCount !== 1 ? 's' : ''} must be resolved.`}
          {overall === 'launching-with-warnings' && `Launching with warnings — ${warnCount} warning${warnCount !== 1 ? 's' : ''}.`}
        </span>
        <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 12 }}>
          {summary.passed} pass · {summary.failed} fail · {summary.warnings} warn · {summary.skipped} skip
        </span>
      </div>

      {/* API hint */}
      <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 20 }}>
        Monitoring endpoint:{' '}
        <code style={{ background: '#f3f4f6', padding: '1px 4px', borderRadius: 3 }}>
          GET /api/launch-readiness?token=CRON_SECRET
        </code>
      </p>

      {/* Sections */}
      <Section title="1. Tier 1 — Required (launch blockers)" checks={tier1} />
      <Section title="2. Tier 2 — Graceful (warn-only)" checks={tier2} />
      <Section title="3. Content" checks={content} />
      <Section title="4. Integrations" checks={integrations} />
      <Section title="5. Compliance" checks={compliance} />

      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 16 }}>
        Page last rendered: {report.generatedAt}
      </p>
    </div>
  )
}
