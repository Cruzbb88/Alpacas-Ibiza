/**
 * In-memory store for owner-uploaded alpaca gallery photos.
 *
 * Keyed by alpaca slug (matching the canonical roster id in
 * lib/tenants/alpacasibiza-content.ts). Values are arrays of
 * { url, alt, uploadedAt } records produced by the
 * /api/admin/alpacas/upload route after a successful Vercel Blob put().
 *
 * Cold-start caveat — same tradeoff as bookingScheduleStore + the rate
 * limiter (ADR 001). Process-scoped Map: state is lost on cold start /
 * redeploy. The Vercel Blob objects themselves persist (they are durable
 * cloud storage), so the worst case after a cold start is the dashboard
 * listing temporarily shows no uploads even though the blobs are still
 * reachable by URL. The owner re-uploads OR the runtime is augmented with
 * a DB-backed table.
 *
 * Future migration path (FUTURE_DB):
 *   1. Add an `alpaca_gallery_uploads` table to lib/db/schema.ts
 *      (columns: id, alpaca_slug, url, alt, uploaded_at, uploaded_by).
 *   2. Swap MemoryStore for a Drizzle-backed implementation of
 *      AlpacaGalleryStore. The interface below is intentionally small so
 *      the swap is a single-file change.
 *
 * Read-side helper `getMergedAlpacaGallery(slug)` merges the static
 * AnimalEntity.gallery (owner-typed code in lib/tenants/<tenant>-content.ts)
 * with these runtime uploads, exposing a single `{src, alt}[]` shape that
 * surfaces in both /my-adoption and /alpacas/[slug].
 *
 * The tenant chain (which transitively imports 'next/headers') is loaded via
 * dynamic import inside getMergedAlpacaGallery() so this module is safe to
 * import from `node --test` without pulling in the App Router runtime.
 */

export interface AlpacaUpload {
  url: string
  alt: string
  uploadedAt: string // ISO 8601
}

export interface AlpacaGalleryStore {
  list(slug: string): Promise<ReadonlyArray<AlpacaUpload>>
  add(slug: string, upload: AlpacaUpload): Promise<void>
  remove(slug: string, url: string): Promise<boolean>
  /** Total uploads across every slug — used by the admin index page. */
  countAll(): Promise<Record<string, number>>
}

class MemoryStore implements AlpacaGalleryStore {
  private map = new Map<string, AlpacaUpload[]>()

  async list(slug: string): Promise<ReadonlyArray<AlpacaUpload>> {
    return this.map.get(slug) ?? []
  }

  async add(slug: string, upload: AlpacaUpload): Promise<void> {
    const existing = this.map.get(slug) ?? []
    // De-dupe on URL so an accidental double-submit doesn't double-list.
    if (existing.some((u) => u.url === upload.url)) return
    this.map.set(slug, [...existing, upload])
  }

  async remove(slug: string, url: string): Promise<boolean> {
    const existing = this.map.get(slug)
    if (!existing) return false
    const filtered = existing.filter((u) => u.url !== url)
    if (filtered.length === existing.length) return false
    if (filtered.length === 0) {
      this.map.delete(slug)
    } else {
      this.map.set(slug, filtered)
    }
    return true
  }

  async countAll(): Promise<Record<string, number>> {
    const out: Record<string, number> = {}
    for (const [slug, uploads] of this.map.entries()) {
      out[slug] = uploads.length
    }
    return out
  }
}

// globalThis-pinned singleton survives HMR in dev (mirrors booking-schedule-store).
const globalForStore = globalThis as unknown as {
  __alpacaGalleryStore?: AlpacaGalleryStore
}

export const alpacaGalleryStore: AlpacaGalleryStore =
  globalForStore.__alpacaGalleryStore ?? new MemoryStore()

if (process.env.NODE_ENV !== 'production') {
  globalForStore.__alpacaGalleryStore = alpacaGalleryStore
}

// ── Read-side helper ────────────────────────────────────────────────────────

export interface GalleryPhoto {
  src: string
  alt: string
}

/**
 * Pure merge of static gallery photos + runtime uploads → single GalleryPhoto[].
 * Static entries are listed first (preserves owner-authored ordering); uploads
 * are appended in upload-time order. Exported so the test suite can exercise
 * the merge logic without bootstrapping the tenant chain.
 */
export function mergeStaticAndUploads(
  staticGallery: ReadonlyArray<{ src: string; alt: string }> | null | undefined,
  uploads: ReadonlyArray<AlpacaUpload>,
): GalleryPhoto[] {
  const staticPart: GalleryPhoto[] =
    staticGallery?.map((g) => ({ src: g.src, alt: g.alt })) ?? []
  const uploadPart: GalleryPhoto[] = uploads.map((u) => ({ src: u.url, alt: u.alt }))
  return [...staticPart, ...uploadPart]
}

/**
 * Returns the merged gallery for a given alpaca slug:
 *   1. Static photos from the tenant content module (AnimalEntity.gallery),
 *      authored in code by the owner. These are READ-ONLY here.
 *   2. Runtime uploads from the in-memory store (this file), produced by
 *      the owner-facing /admin/alpacas/[id]/photos page.
 *
 * Empty array when the slug is unknown OR when no photos exist on either side.
 *
 * This is the integration point /my-adoption and /alpacas/[slug] read from
 * once the gallery surface is wired (Sonnet 5 cross-cutting task).
 *
 * Tenant chain is dynamic-imported so this module remains testable under
 * `node --test` (which does not load Next runtime). In a real request scope
 * the dynamic import resolves synchronously after the first call.
 */
export async function getMergedAlpacaGallery(slug: string): Promise<GalleryPhoto[]> {
  let staticGallery: ReadonlyArray<{ src: string; alt: string }> | null = null
  try {
    const { getTenant } = await import('@/lib/tenants/server')
    const { getProviders } = await import('@/lib/integrations')
    const tenant = await getTenant()
    const providers = getProviders(tenant)
    const animal = providers.content.listAnimals().find((a) => a.id === slug)
    staticGallery = animal?.gallery ?? null
  } catch {
    // Out-of-request scope (e.g. unit test). Fall through with no static gallery.
  }
  const uploads = await alpacaGalleryStore.list(slug)
  return mergeStaticAndUploads(staticGallery, uploads)
}
