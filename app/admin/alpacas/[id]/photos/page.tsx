import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { getTenant } from '@/lib/tenants/server'
import { getProviders } from '@/lib/integrations'
import { alpacaGalleryStore } from '@/lib/alpaca-gallery-store'
import PhotoManager from './photo-manager'

export const metadata = {
  title: 'Alpaca Photo Manager — Admin',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
}

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * /admin/alpacas/[id]/photos — per-alpaca photo manager.
 *
 * Server component: loads the alpaca, the static gallery, and the runtime
 * uploads, then hands the merged list to the client `PhotoManager` form for
 * upload / delete actions.
 *
 * Static gallery photos are owner-typed in code (read-only here); runtime
 * uploads are deletable. Unknown slugs 404.
 */

export default async function AdminAlpacaPhotosPage({ params }: PageProps) {
  const session = await getServerSession(auth)
  if (!session) {
    redirect('/admin/login')
  }

  const { id } = await params
  const tenant = await getTenant()
  const providers = getProviders(tenant)
  const animal = providers.content.listAnimals().find((a) => a.id === id)
  if (!animal) {
    notFound()
  }

  const staticPhotos = (animal.gallery ?? []).map((g) => ({
    src: g.src,
    alt: g.alt,
  }))
  const uploads = await alpacaGalleryStore.list(id)
  const blobReady = !!process.env.BLOB_READ_WRITE_TOKEN

  return (
    <PhotoManager
      alpacaSlug={animal.id}
      alpacaName={animal.name}
      staticPhotos={staticPhotos}
      uploads={uploads.map((u) => ({ url: u.url, alt: u.alt, uploadedAt: u.uploadedAt }))}
      blobReady={blobReady}
    />
  )
}
