/**
 * /admin/birthday-test — manual trigger for the alpaca birthday-card cron.
 *
 * Mirrors the "Run quarterly update" admin pattern:
 *   - Server component for auth + display of today's birthday alpacas.
 *   - Client form that fires a GET to /api/alpaca-birthday-cards with the
 *     CRON_SECRET in the Authorization header (same as quarterly-update trigger).
 *
 * Security: page and API route are both protected by CRON_SECRET auth.
 * This page is only reachable from /admin/today (admin session required).
 */

import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { ALPACAS } from '@/lib/data/alpacas'
import { BirthdayTriggerForm } from './trigger-form'

export const metadata = {
  title: 'Birthday cards — Admin',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminBirthdayTestPage() {
  const session = await getServerSession(auth)
  if (!session) redirect('/admin/login')

  // Compute today's MM-DD
  const now = new Date()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  const todayMmDd = `${mm}-${dd}`

  const birthdayAlpacas = ALPACAS.filter((a) => {
    if (!a.birthDate) return false
    return a.birthDate.slice(5) === todayMmDd
  })

  const noBirthDatesSet = ALPACAS.every((a) => !a.birthDate)

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 700, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>
        Alpaca birthday cards
      </h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>
        Manually trigger today&apos;s birthday card emails. The daily cron at 09:00 UTC runs automatically —
        use this page only for testing or if you need to re-send.
      </p>

      {/* Today's status */}
      <div
        style={{
          background: birthdayAlpacas.length > 0 ? '#f0fdf4' : '#f9fafb',
          border: `1px solid ${birthdayAlpacas.length > 0 ? '#86efac' : '#e5e7eb'}`,
          borderRadius: 8,
          padding: '16px 20px',
          marginBottom: 24,
        }}
      >
        <p style={{ margin: 0, fontWeight: 600, color: birthdayAlpacas.length > 0 ? '#15803d' : '#374151' }}>
          {birthdayAlpacas.length > 0
            ? `Today (${todayMmDd}) is the birthday of: ${birthdayAlpacas.map((a) => a.name).join(', ')}`
            : `No alpaca birthdays today (${todayMmDd}).`}
        </p>
        {birthdayAlpacas.length > 0 && (
          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#166534' }}>
            Triggering will send birthday card emails to all active adopters of the above alpaca(s).
          </p>
        )}
      </div>

      {noBirthDatesSet && (
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
          <strong>No birth dates configured yet.</strong> All 14 alpacas currently have{' '}
          <code>birthDate: null</code>. Add dates to{' '}
          <code>lib/data/alpacas.ts</code> in YYYY-MM-DD format to activate this feature.
        </div>
      )}

      <BirthdayTriggerForm />

      <div style={{ marginTop: 32, borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
        <a href="/admin/today" style={{ fontSize: 14, color: '#6b7280', textDecoration: 'none' }}>
          ← Back to Today
        </a>
      </div>
    </div>
  )
}
