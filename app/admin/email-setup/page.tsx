import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { auth } from '@/app/api/auth/[...nextauth]/route'

async function fetchResendDomainStatus(): Promise<{
  status: 'unconfigured' | 'pending' | 'verified' | 'error'
  records: ReadonlyArray<{ name: string; type: string; value: string; status: string }>
  message: string
}> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { status: 'unconfigured', records: [], message: 'RESEND_API_KEY not set in environment' }
  }
  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 0 },
    })
    if (!res.ok) {
      return { status: 'error', records: [], message: `Resend API returned ${res.status}` }
    }
    const json = await res.json() as { data?: Array<{ name: string; status: string; records?: Array<{ name: string; type: string; value: string; status: string }> }> }
    const alpaca = json.data?.find((d) => d.name === 'alpacasibiza.com')
    if (!alpaca) {
      return { status: 'unconfigured', records: [], message: 'Domain alpacasibiza.com not added in Resend yet. Add it at https://resend.com/domains.' }
    }
    return {
      status: alpaca.status === 'verified' ? 'verified' : 'pending',
      records: alpaca.records ?? [],
      message: alpaca.status === 'verified' ? 'Domain verified — DKIM-signed emails active.' : 'Add the DNS records below to your DNS host, then re-check.',
    }
  } catch (err) {
    return { status: 'error', records: [], message: err instanceof Error ? err.message : String(err) }
  }
}

export default async function EmailSetupPage() {
  const session = await getServerSession(auth)
  if (!session) redirect('/admin/login')

  const status = await fetchResendDomainStatus()

  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-6">Email DNS setup</h1>
      <p className="text-foreground/70 mb-6">
        Status: <strong>{status.status}</strong> — {status.message}
      </p>
      {status.records.length > 0 && (
        <table className="w-full border border-border rounded-lg overflow-hidden text-sm">
          <thead className="bg-secondary/40">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Type</th>
              <th className="text-left p-3">Value</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {status.records.map((r, i) => (
              <tr key={i} className="border-t border-border">
                <td className="p-3 font-mono">{r.name}</td>
                <td className="p-3">{r.type}</td>
                <td className="p-3 font-mono break-all">{r.value}</td>
                <td className="p-3">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="text-xs text-foreground/50 mt-6">
        After adding records, wait ~5 min for DNS propagation, then refresh this page.
      </p>
    </main>
  )
}
