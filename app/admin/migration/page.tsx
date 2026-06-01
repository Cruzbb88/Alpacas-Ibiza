import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { MigrationForm } from '@/components/admin/migration-form'

export const metadata = {
  title: 'FareHarbor Migration — Admin',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
}

// Always fresh — no caching on this admin action page.
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * /admin/migration
 *
 * One-click FareHarbor → Stripe migration link generator.
 * Implements Strategy B (grandfather at renewal) from the migration playbook.
 *
 * Workflow:
 *   1. Export the "Adopt-a-Paca customers" CSV from FareHarbor (see runbook Section 2).
 *   2. Paste or upload it here.
 *   3. Click "Generate migration links" — the API creates a Stripe Checkout session
 *      per customer with client_reference_id = FareHarbor customer ID (for original
 *      adoption date preservation) and expires_at = 14 days.
 *   4. Use "Email customer" to open a pre-filled mailto, or copy the link manually.
 *   5. After each customer completes Stripe Checkout, cancel their FareHarbor product
 *      ("cancel after current period") and mark them migrated in your tracker spreadsheet.
 */
export default async function MigrationPage() {
  const session = await getServerSession(auth)
  if (!session) redirect('/admin/login')

  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        maxWidth: 1100,
        margin: '0 auto',
        padding: '32px 16px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>
          FareHarbor → Stripe migration
        </h1>
        <a
          href="/admin/migration"
          style={{
            fontSize: 13,
            color: '#6366f1',
            textDecoration: 'none',
            border: '1px solid #c7d2fe',
            borderRadius: 6,
            padding: '12px 18px',
            whiteSpace: 'nowrap',
            marginTop: 4,
            display: 'inline-flex',
            alignItems: 'center',
            minHeight: 44,
            minWidth: 44,
          }}
        >
          ↻ Reset
        </a>
      </div>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>
        Strategy B — grandfather at renewal. Paste or upload your FareHarbor CSV export
        to generate per-customer Stripe Checkout links for customers whose renewal is
        approaching within the lookahead window.
      </p>

      {/* Runbook advisory */}
      <div
        style={{
          background: '#eff6ff',
          borderLeft: '4px solid #3b82f6',
          borderRadius: 6,
          padding: '12px 16px',
          marginBottom: 28,
          fontSize: 13,
          color: '#1e3a5f',
        }}
      >
        <strong>Before you start:</strong> Read{' '}
        <code>docs/runbooks/FAREHARBOR_MIGRATION_PLAYBOOK.md</code> — especially
        Section 4 (per-customer workflow) and Section 6 (risks, including the
        double-billing window and the SEPA 5-day mandate delay). The CSV must not be
        stored in public cloud storage (GDPR — runbook Section 2).
      </div>

      {/* Client component — handles form submit, fetch, and results table */}
      <MigrationForm />

      {/* Footer disclaimer */}
      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 32 }}>
        Each Stripe Checkout session is pre-filled with the customer email,
        FareHarbor ID as <code>client_reference_id</code> (for original adoption-date
        preservation), and expires 14 days from generation. The{' '}
        <code>metadata.migrated_from = &quot;fareharbor&quot;</code> field flags these
        sessions for the receiving webhook.
      </p>
    </div>
  )
}
