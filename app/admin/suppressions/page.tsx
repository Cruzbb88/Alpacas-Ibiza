import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { listSuppressions } from '@/lib/email-suppression'
import { SuppressionTable } from './suppression-table'

export const metadata = {
  title: 'Email suppressions — Admin',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminSuppressionsPage() {
  const session = await getServerSession(auth)
  if (!session) redirect('/admin/login')

  const entries = listSuppressions()
  const counts = {
    total: entries.length,
    complaint: entries.filter((e) => e.reason === 'complaint').length,
    hardBounce: entries.filter((e) => e.reason === 'hard-bounce').length,
    manual: entries.filter((e) => e.reason === 'manual').length,
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 1000, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Email suppressions</h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>
        Addresses we will NOT send to. Populated automatically by Resend
        bounce + complaint webhooks (see <code>/api/resend-webhook</code>).
        Use the &quot;Unsuppress&quot; button to re-enable a recipient whose
        bounce was transient (full mailbox, server hiccup).
      </p>

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
        <strong>⚠️ Cold-start caveat.</strong> Suppression list lives in this
        Vercel instance&apos;s memory (ADR 001). After a deploy or idle-recycle,
        newly-bounced addresses could be re-sent to ONCE before Resend&apos;s
        next bounce event re-flags them. Acceptable bandaid until DB migration.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard label="Total suppressed" value={counts.total} />
        <StatCard label="Spam complaints" value={counts.complaint} accent={counts.complaint > 0 ? '#b91c1c' : undefined} />
        <StatCard label="Hard bounces" value={counts.hardBounce} accent={counts.hardBounce > 0 ? '#a16207' : undefined} />
        <StatCard label="Manual" value={counts.manual} />
      </div>

      <SuppressionTable initialEntries={entries.map((e) => ({ email: e.email, reason: e.reason, addedAt: e.addedAt }))} />
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: 16, border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent ?? '#111827', lineHeight: 1.1 }}>{value}</div>
    </div>
  )
}
