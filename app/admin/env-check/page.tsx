import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { TIER1_KEYS, TIER1_IMPACT, TIER2_VARS, isSet } from '@/lib/validate-env'

/** Capitalize first letter — validate-env stores lowercase (mid-sentence log fit). */
function sentenceCase(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1)
}

export const metadata = {
  title: 'Env Check — Admin',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
}

function maskedPreview(key: string): string | null {
  const v = process.env[key]
  if (!v || !isSet(key)) return null
  return v.length <= 4 ? `${v}***` : `${v.slice(0, 4)}***`
}

function StatusBadge({ set }: { set: boolean }) {
  if (set) {
    return (
      <span style={{ background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
        SET
      </span>
    )
  }
  return (
    <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
      UNSET
    </span>
  )
}

function EnvTable({
  rows,
  unsetColor,
}: {
  rows: { key: string; notes: string }[]
  unsetColor: string
}) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ background: '#f3f4f6' }}>
          <th style={{ textAlign: 'left', padding: '8px 12px', border: '1px solid #e5e7eb' }}>Variable</th>
          <th style={{ textAlign: 'center', padding: '8px 12px', border: '1px solid #e5e7eb', width: 80 }}>Status</th>
          <th style={{ textAlign: 'left', padding: '8px 12px', border: '1px solid #e5e7eb', width: 140 }}>Preview</th>
          <th style={{ textAlign: 'left', padding: '8px 12px', border: '1px solid #e5e7eb' }}>Notes</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ key, notes }) => {
          const set = isSet(key)
          const preview = maskedPreview(key)
          return (
            <tr key={key} style={{ background: set ? undefined : unsetColor }}>
              <td style={{ padding: '7px 12px', border: '1px solid #e5e7eb', fontFamily: 'monospace', fontSize: 12 }}>{key}</td>
              <td style={{ padding: '7px 12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                <StatusBadge set={set} />
              </td>
              <td style={{ padding: '7px 12px', border: '1px solid #e5e7eb', fontFamily: 'monospace', color: '#6b7280', fontSize: 12 }}>
                {preview ?? '—'}
              </td>
              <td style={{ padding: '7px 12px', border: '1px solid #e5e7eb', color: '#374151' }}>{notes}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export default async function AdminEnvCheckPage() {
  const session = await getServerSession(auth)
  if (!session) redirect('/admin/login')

  const tier1Rows = TIER1_KEYS.map((key) => ({
    key,
    notes: sentenceCase(TIER1_IMPACT[key] ?? ''),
  }))

  const unsetTier1 = tier1Rows.filter((r) => !isSet(r.key)).map((r) => r.key)
  const unsetTier2 = TIER2_VARS.filter((r) => !isSet(r.key)).map((r) => r.key)
  const allUnset = [...unsetTier1, ...unsetTier2]
  const envTemplate = allUnset.map((k) => `${k}=`).join('\n')

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 1000, margin: '0 auto', padding: '32px 16px' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Env Var Status</h1>
      <p style={{ color: '#6b7280', marginBottom: 32, fontSize: 14 }}>
        Server-side read of <code>process.env</code>. Values are masked (first 4 chars only). Reload to refresh.
      </p>

      {unsetTier1.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', marginBottom: 24 }}>
          <strong style={{ color: '#b91c1c' }}>⚠ {unsetTier1.length} Tier 1 var{unsetTier1.length > 1 ? 's' : ''} missing — site will break or be unsafe in production.</strong>
        </div>
      )}

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, marginTop: 0 }}>
        Tier 1 — Must set before prod ({TIER1_KEYS.length} vars)
      </h2>
      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>Site breaks or is unsafe without these.</p>
      <EnvTable rows={tier1Rows} unsetColor="#fef2f2" />

      <h2 style={{ fontSize: 16, fontWeight: 600, marginTop: 32, marginBottom: 8 }}>
        Tier 2 — Graceful degrade ({TIER2_VARS.length} vars)
      </h2>
      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>Site works; feature goes dark until set.</p>
      <EnvTable rows={TIER2_VARS} unsetColor="#fefce8" />

      {allUnset.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginTop: 32, marginBottom: 8 }}>
            .env.local template — {allUnset.length} unset var{allUnset.length > 1 ? 's' : ''}
          </h2>
          <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 8 }}>
            Copy the block below into your <code>.env.local</code> and fill in the values.
          </p>
          <pre style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            padding: '16px',
            fontSize: 12,
            fontFamily: 'monospace',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
          }}>
            {envTemplate}
          </pre>
        </>
      )}

      {allUnset.length === 0 && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '12px 16px', marginTop: 24 }}>
          <strong style={{ color: '#166534' }}>All env vars are set.</strong>
        </div>
      )}
    </div>
  )
}

