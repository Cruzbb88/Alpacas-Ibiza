import Link from 'next/link'
import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { getTenant } from '@/lib/tenants/server'
import { getProviders } from '@/lib/integrations'
import { alpacaGalleryStore } from '@/lib/alpaca-gallery-store'

export const metadata = {
  title: 'Alpaca Photos — Admin',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
}

/**
 * /admin/alpacas — owner-facing index of every alpaca in the canonical
 * roster (sourced from lib/tenants/<tenant>-content.ts via the content
 * provider abstraction, ADR 012).
 *
 * Each row links to /admin/alpacas/{id}/photos and shows a live count of
 * (static gallery + runtime uploads) so the owner sees at-a-glance which
 * alpacas still need photos.
 *
 * Static gallery photos come from owner-typed code (AnimalEntity.gallery);
 * runtime uploads come from the in-memory alpacaGalleryStore (this session).
 */

export default async function AdminAlpacasIndexPage() {
  const session = await getServerSession(auth)
  if (!session) {
    redirect('/admin/login')
  }

  const tenant = await getTenant()
  const providers = getProviders(tenant)
  const animals = providers.content.listAnimals()
  const uploadCounts = await alpacaGalleryStore.countAll()

  const blobReady = !!process.env.BLOB_READ_WRITE_TOKEN

  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Alpaca Photos</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Pick an alpaca to manage their gallery. Static photos (typed in
          code) are shown read-only; runtime uploads can be added or removed.
        </p>
        {!blobReady && (
          <p className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <strong>BLOB_READ_WRITE_TOKEN not set.</strong> Uploads will return
            503 until this Vercel env var is configured. Set it in the Vercel
            dashboard → Project Settings → Environment Variables.
          </p>
        )}
      </header>

      <ul className="divide-y divide-neutral-200 rounded border border-neutral-200">
        {animals.map((a) => {
          const staticCount = a.gallery?.length ?? 0
          const uploadCount = uploadCounts[a.id] ?? 0
          const total = staticCount + uploadCount
          return (
            <li key={a.id} className="flex items-center justify-between p-4">
              <div>
                <Link
                  href={`/admin/alpacas/${a.id}/photos`}
                  className="text-base font-medium text-blue-700 underline-offset-2 hover:underline"
                >
                  {a.name}
                </Link>
                <p className="text-xs text-neutral-500">slug: {a.id}</p>
              </div>
              <div className="text-right text-sm text-neutral-700">
                <div>
                  {total} photo{total === 1 ? '' : 's'}
                </div>
                <div className="text-xs text-neutral-500">
                  {staticCount} static · {uploadCount} uploaded
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
