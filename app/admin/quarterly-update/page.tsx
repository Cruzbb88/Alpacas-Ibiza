import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { listQuarterlyContent, getQuarterlyContent } from '@/lib/quarterly-content-store'
import { getQuarterLabel } from '@/lib/quarterly-update'
import { QuarterlyComposeForm } from './compose-form'

export const metadata = {
  title: 'Quarterly update — Admin',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminQuarterlyUpdatePage() {
  const session = await getServerSession(auth)
  if (!session) redirect('/admin/login')

  const currentQuarter = getQuarterLabel(new Date())
  const existing = getQuarterlyContent(currentQuarter)
  const history = listQuarterlyContent().filter((q) => q.quarter !== currentQuarter)

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 900, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>
        Quarterly adopter update
      </h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>
        Compose the "what's new on the farm" section that goes out to every active
        adopter on Jan 1 / Apr 1 / Jul 1 / Oct 1 at 09:00 UTC. The rest of the
        email (greeting, alpaca line, share CTA) is auto-generated per recipient.
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
        <strong>⚠️ Cold-start caveat.</strong> Draft content lives in this Vercel
        instance&apos;s memory (ADR 001). A deploy or idle-recycle drops the
        draft — save final copy as a backup before deploying.
      </div>

      <QuarterlyComposeForm
        quarter={currentQuarter}
        initialHtml={existing?.newsHtml ?? ''}
        lastUpdated={existing?.updatedAt ?? null}
        sentAt={existing?.sentAt ?? null}
      />

      {history.length > 0 && (
        <section style={{ marginTop: 48 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Previously sent quarters</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {history.map((q) => (
              <li
                key={q.quarter}
                style={{
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  marginBottom: 8,
                  background: '#fff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <strong>{q.quarter}</strong>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>
                    {q.sentAt ? `Sent ${new Date(q.sentAt).toLocaleString('en-GB')}` : 'Not sent'}
                  </span>
                </div>
                <a
                  href={`/api/admin/quarterly-update/preview?quarter=${encodeURIComponent(q.quarter)}`}
                  target="_blank"
                  rel="noopener"
                  style={{ fontSize: 13, color: '#6366f1' }}
                >
                  Preview rendered email →
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
