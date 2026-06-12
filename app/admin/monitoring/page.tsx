/**
 * /admin/monitoring — live ops overview dashboard.
 *
 * Server component. Aggregates all 11 admin subsystems into one page
 * with traffic-light status so the owner can scan ops in 30 seconds.
 *
 * Revalidates every 60s (ISR) so the page stays fresh on screen
 * without client-side useEffect. Owner can also hard-refresh manually.
 *
 * Auth: getServerSession(auth) gate — redirects to /admin/login if
 * no session (middleware also covers this, belt-and-suspenders).
 */

import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import Link from 'next/link'
import { getMonitoringSnapshot } from '@/lib/monitoring/snapshot'
import type { MailerAuditSection, ClientErrorsSection } from '@/lib/monitoring/snapshot'
import { MonitoringCard } from '@/components/admin/monitoring-card'
import { MonitoringErrorFeed } from '@/components/admin/monitoring-error-feed'

export const metadata = {
  title: 'Monitoring — Alpacas Admin',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
}

// ISR: re-render every 60s when the page is being viewed
export const revalidate = 60

export default async function AdminMonitoringPage() {
  const session = await getServerSession(auth)
  if (!session) redirect('/admin/login')

  const snap = await getMonitoringSnapshot()

  const generated = new Date(snap.generatedAt).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <main
      style={{
        fontFamily: 'system-ui, sans-serif',
        maxWidth: 1100,
        margin: '0 auto',
        padding: '28px 16px 60px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link
          href="/admin"
          style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 10 }}
        >
          ← Admin
        </Link>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 4px', color: '#111827' }}>
          Monitoring
        </h1>
        <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
          Snapshot at {generated} &mdash; auto-refreshes every 60 s
        </p>
      </div>

      {/* ── Status cards (4-column desktop, 1-column mobile) ─────────────── */}
      <section style={{ marginBottom: 32 }}>
        <SectionLabel>System status</SectionLabel>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          {/* 1. Payments */}
          <Link href="/admin/analytics" style={{ textDecoration: 'none' }}>
            <MonitoringCard
              title="Payments"
              status={snap.payments.status}
              badge={snap.payments.activeCount > 0 ? `${snap.payments.activeCount} active` : undefined}
              details={[
                `Vendor: ${snap.payments.vendor}`,
                snap.payments.note,
              ]}
            />
          </Link>

          {/* 2. Webhooks */}
          <Link href="/admin/analytics" style={{ textDecoration: 'none' }}>
            <MonitoringCard
              title="Webhooks"
              status={snap.webhooks.status}
              badge={
                snap.webhooks.actionRequiredCount > 0
                  ? `${snap.webhooks.actionRequiredCount} action required`
                  : snap.webhooks.atRiskCount > 0
                  ? `${snap.webhooks.atRiskCount} at-risk`
                  : undefined
              }
              details={[
                `Idempotency window: ${snap.webhooks.idempotencyMapSize} events`,
                snap.webhooks.note,
              ]}
            />
          </Link>

          {/* 3. Email */}
          <Link href="/admin/suppressions" style={{ textDecoration: 'none' }}>
            <MonitoringCard
              title="Email"
              status={snap.email.status}
              badge={snap.email.suppressionCount > 0 ? `${snap.email.suppressionCount} suppressed` : undefined}
              details={[
                `RESEND_API_KEY: ${snap.email.resendKeySet ? 'set' : 'unset'}`,
                snap.email.note,
              ]}
            />
          </Link>

          {/* 4. Crons */}
          <MonitoringCard
            title="Crons"
            status={snap.crons.status}
            badge={snap.crons.entries.length > 0 ? `${snap.crons.entries.length} scheduled` : undefined}
            details={
              snap.crons.entries.length > 0
                ? snap.crons.entries.map((c) => `${c.path} — ${c.schedule}`)
                : [snap.crons.note]
            }
          />

          {/* 5. Launch Readiness */}
          <Link href="/admin/launch-readiness" style={{ textDecoration: 'none' }}>
            <MonitoringCard
              title="Launch Readiness"
              status={snap.launchReadiness.status}
              badge={
                snap.launchReadiness.blockerCount > 0
                  ? `${snap.launchReadiness.blockerCount} blocker${snap.launchReadiness.blockerCount !== 1 ? 's' : ''}`
                  : snap.launchReadiness.warnCount > 0
                  ? `${snap.launchReadiness.warnCount} warning${snap.launchReadiness.warnCount !== 1 ? 's' : ''}`
                  : snap.launchReadiness.checksTotal > 0
                  ? 'all clear'
                  : undefined
              }
              details={[
                snap.launchReadiness.checksTotal > 0
                  ? `${snap.launchReadiness.checksPassed} of ${snap.launchReadiness.checksTotal} checks passing`
                  : 'No checks run',
                snap.launchReadiness.blockerCount > 0
                  ? `${snap.launchReadiness.blockerCount} blocker(s) must be resolved before launch`
                  : snap.launchReadiness.overall === 'ready'
                  ? 'Ready to launch'
                  : `Launching with ${snap.launchReadiness.warnCount} warning(s)`,
              ]}
            />
          </Link>
        </div>
      </section>

      {/* ── Live counters (3-up row) ─────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <SectionLabel>Live counters</SectionLabel>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
          }}
        >
          <CounterCard
            label="Total subscriptions"
            value={snap.counters.totalSubscriptions}
            sub={`source: ${snap.counters.subscriptionSource}`}
          />
          <CounterCard
            label="New this week"
            value={snap.counters.weeklyNewSignups}
            sub={snap.counters.weeklyNewSignups === null ? 'logging gap' : 'sign-ups (7d)'}
          />
          <CounterCard
            label="Emails sent (24h)"
            value={snap.counters.past24hEmailSends}
            sub={snap.counters.past24hEmailSends === null ? 'logging gap' : 'sends'}
          />
        </div>
        {snap.counters.note ? (
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 8, marginBottom: 0 }}>
            {snap.counters.note}
          </p>
        ) : null}
      </section>

      {/* ── Error feed ──────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <SectionLabel>Error feed</SectionLabel>
        <MonitoringErrorFeed errors={snap.errors} />
      </section>

      {/* ── Mailer audit ────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <SectionLabel>Mailer audit (last 20)</SectionLabel>
        <MailerAuditTable mailerAudit={snap.mailerAudit} />
      </section>

      {/* ── Client errors ───────────────────────────────────────────────── */}
      <section>
        <SectionLabel>Client errors (last 20)</SectionLabel>
        <ClientErrorTable clientErrors={snap.clientErrors} />
      </section>
    </main>
  )
}

// ── Inline helpers ────────────────────────────────────────────────────────────

function MailerAuditTable({ mailerAudit }: { mailerAudit: MailerAuditSection }) {
  const { summary, recent } = mailerAudit
  const { sent, failed, cancelled } = summary.last24h
  const avgDuration =
    recent.length > 0
      ? Math.round(recent.reduce((acc, e) => acc + e.durationMs, 0) / recent.length)
      : null

  const summaryLine = [
    `${sent} sent`,
    `${failed} errored`,
    ...(cancelled > 0 ? [`${cancelled} cancelled`] : []),
    ...(avgDuration !== null ? [`avg ${avgDuration} ms`] : []),
  ].join(' · ')

  return (
    <div
      style={{
        background: '#fff',
        border: '1.5px solid #e5e7eb',
        borderRadius: 12,
        padding: '16px 18px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 6 }}>
        Mailer audit
      </div>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>{summaryLine}</div>

      {recent.length === 0 ? (
        <div style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>
          No audit entries in buffer.
        </div>
      ) : (
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {/* Header row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '120px 1fr 80px 64px 70px',
              gap: 8,
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 1,
              color: '#9ca3af',
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            <span>Time</span>
            <span>Subject</span>
            <span>To (host)</span>
            <span>Status</span>
            <span style={{ textAlign: 'right' }}>ms</span>
          </div>
          {/* Data rows */}
          {[...recent].reverse().map((entry, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr 80px 64px 70px',
                gap: 8,
                padding: '7px 12px',
                background: i % 2 === 0 ? '#f9fafb' : '#fff',
                borderRadius: 6,
                fontSize: 13,
                alignItems: 'center',
              }}
            >
              <span style={{ color: '#9ca3af', fontSize: 11, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                {new Date(entry.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span
                style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={entry.subject}
              >
                {entry.subject}
              </span>
              <span style={{ color: '#6b7280', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.toHostnameOnly}
              </span>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: 12,
                  color:
                    entry.status === 'sent'
                      ? '#16a34a'
                      : entry.status === 'failed'
                      ? '#dc2626'
                      : '#d97706',
                }}
              >
                {entry.status}
              </span>
              <span style={{ color: '#6b7280', fontSize: 12, textAlign: 'right' }}>
                {entry.durationMs}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ClientErrorTable({ clientErrors }: { clientErrors: ClientErrorsSection }) {
  const { summary, recent } = clientErrors
  const totalLast1h = Object.values(summary.last1h).reduce((a, b) => a + b, 0)
  const typeBreakdown = Object.entries(summary.last1h)
    .map(([t, c]) => `${c} ${t}`)
    .join(', ')

  const summaryLine =
    totalLast1h > 0
      ? `${totalLast1h} in last 1 h (${typeBreakdown}) · ${summary.total} in buffer`
      : `0 in last 1 h · ${summary.total} in buffer`

  return (
    <div
      style={{
        background: '#fff',
        border: '1.5px solid #e5e7eb',
        borderRadius: 12,
        padding: '16px 18px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 6 }}>
        Client errors
      </div>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>{summaryLine}</div>

      {recent.length === 0 ? (
        <div style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>
          No client error entries in buffer.
        </div>
      ) : (
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {/* Header row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '120px 140px 160px 1fr',
              gap: 8,
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 1,
              color: '#9ca3af',
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            <span>Time</span>
            <span>Type</span>
            <span>Path</span>
            <span>Message</span>
          </div>
          {/* Data rows */}
          {[...recent].reverse().map((entry, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 140px 160px 1fr',
                gap: 8,
                padding: '7px 12px',
                background: i % 2 === 0 ? '#f9fafb' : '#fff',
                borderRadius: 6,
                fontSize: 13,
                alignItems: 'center',
              }}
            >
              <span style={{ color: '#9ca3af', fontSize: 11, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                {new Date(entry.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span style={{ color: '#374151', fontFamily: 'monospace', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.type}
              </span>
              <span
                style={{ color: '#6b7280', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={entry.path}
              >
                {entry.path}
              </span>
              <span
                style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                title={entry.message}
              >
                {entry.message.slice(0, 80)}
              </span>
            </div>
          ))}
        </div>
      )}
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
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  )
}

function CounterCard({
  label,
  value,
  sub,
}: {
  label: string
  value: number | null
  sub: string
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: '16px 18px',
        minHeight: 44,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: 1,
          color: '#6b7280',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          color: value === null ? '#d1d5db' : '#111827',
          lineHeight: 1,
          marginBottom: 4,
        }}
      >
        {value === null ? '—' : value.toLocaleString()}
      </div>
      <div style={{ fontSize: 12, color: '#9ca3af' }}>{sub}</div>
    </div>
  )
}
