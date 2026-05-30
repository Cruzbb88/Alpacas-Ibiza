/**
 * /admin/launch-readiness — Live launch-readiness dashboard.
 * Server component. Session-gated. Runs all checks in parallel.
 * Refresh button posts ?refresh=1 to bypass DNS cache.
 */

import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { checkTier1Env, checkPaymentVendor } from '@/lib/launch-readiness/check-env'
import { checkEmailDNS } from '@/lib/launch-readiness/check-dns'
import { checkOwnerContent } from '@/lib/launch-readiness/check-content'
import { checkDeployState } from '@/lib/launch-readiness/check-deploy'
import { checkBuildState } from '@/lib/launch-readiness/check-build'
import { CheckList } from '@/components/admin/check-list'
import type { CheckResult } from '@/lib/launch-readiness/check-env'

export const metadata = {
  title: 'Launch Readiness — Admin',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface SectionProps {
  title: string
  checks: CheckResult[]
}

function Section({ title, checks }: SectionProps) {
  const reds = checks.filter((c) => c.status === 'red').length
  const yellows = checks.filter((c) => c.status === 'yellow').length
  const greens = checks.filter((c) => c.status === 'green').length

  let headerAccent = '#16a34a'
  if (reds > 0) headerAccent = '#dc2626'
  else if (yellows > 0) headerAccent = '#ca8a04'

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
          {greens}/{checks.length} green
          {reds > 0 ? ` · ${reds} red` : ''}
          {yellows > 0 ? ` · ${yellows} yellow` : ''}
        </span>
      </div>
      <CheckList checks={checks} />
    </div>
  )
}

export default async function LaunchReadinessPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const session = await getServerSession(auth)
  if (!session) redirect('/admin/login')

  const bypassCache = searchParams['refresh'] === '1'

  // Run all checks in parallel
  const [tier1, paymentVendor, dns, content, deploy, build] = await Promise.all([
    Promise.resolve(checkTier1Env()),
    Promise.resolve(checkPaymentVendor()),
    checkEmailDNS('alpacasibiza.com', bypassCache),
    checkOwnerContent(),
    checkDeployState(),
    checkBuildState(),
  ])

  const allChecks: CheckResult[] = [
    ...tier1,
    paymentVendor,
    ...dns,
    ...content,
    ...deploy,
    ...build,
  ]

  const totalChecks = allChecks.length
  const greenCount = allChecks.filter((c) => c.status === 'green').length
  const redCount = allChecks.filter((c) => c.status === 'red').length
  const yellowCount = allChecks.filter((c) => c.status === 'yellow').length
  const remaining = totalChecks - greenCount

  // Tier 1 determines headline color
  const tier1Reds = tier1.filter((c) => c.status === 'red').length
  const tier1Yellows = tier1.filter((c) => c.status === 'yellow').length
  let headlineColor = '#16a34a'
  if (tier1Reds > 0) headlineColor = '#dc2626'
  else if (tier1Yellows > 0 || redCount > 0 || yellowCount > 0) headlineColor = '#ca8a04'

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Launch Readiness</h1>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
            Live checks against env vars, DNS, content, and deploy state.
          </p>
        </div>
        <form method="GET" action="/admin/launch-readiness">
          <input type="hidden" name="refresh" value="1" />
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
          background: tier1Reds > 0 ? '#fef2f2' : remaining === 0 ? '#f0fdf4' : '#fffbeb',
          border: `1px solid ${tier1Reds > 0 ? '#fca5a5' : remaining === 0 ? '#86efac' : '#fde68a'}`,
          borderRadius: 8,
          padding: '14px 18px',
          marginBottom: 28,
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 700, color: headlineColor }}>
          Launch readiness: {greenCount}/{totalChecks} checks green.{' '}
          {remaining > 0 ? `${remaining} item${remaining === 1 ? '' : 's'} remaining.` : 'All clear.'}
        </span>
        {(redCount > 0 || yellowCount > 0) && (
          <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 12 }}>
            {redCount > 0 ? `${redCount} red · ` : ''}{yellowCount > 0 ? `${yellowCount} yellow` : ''}
            {bypassCache ? ' (DNS cache bypassed)' : ''}
          </span>
        )}
      </div>

      {/* Section 1: Tier 1 Environment */}
      <Section title="1. Tier 1 Environment (launch-blockers)" checks={tier1} />

      {/* Section 2: Payment Vendor */}
      <Section title="2. Payment Vendor" checks={[paymentVendor]} />

      {/* Section 3: Email DNS */}
      <Section title="3. Email DNS (SPF / DKIM / DMARC)" checks={dns} />

      {/* Section 4 + 5: Legal + Owner Content */}
      <Section title="4. Legal Content Gate + Owner Content" checks={content} />

      {/* Section 6: Build State */}
      <Section title="5. Build State + Handoff" checks={build} />

      {/* Section 7: Deploy State */}
      <Section title="6. Deploy State" checks={deploy} />

      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 16 }}>
        DNS results cached 1h. Click &ldquo;Re-run checks&rdquo; to bypass cache.
        Page last rendered: {new Date().toISOString()}
      </p>
    </div>
  )
}
