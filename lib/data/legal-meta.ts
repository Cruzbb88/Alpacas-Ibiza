/**
 * Last-updated metadata for legal pages.
 *
 * When a policy changes:
 *   1. Bump `updatedAt` to the new date.
 *   2. Add a `changelog` entry describing what changed (optional, transparency).
 *   3. Bump `version` if material changes (every backwards-incompatible change).
 *
 * `version` is for legal change tracking. `updatedAt` is what the user sees.
 */
export interface LegalPageMeta {
  readonly slug: 'privacy' | 'terms' | 'cookies'
  readonly version: string  // semver-ish ('1.0.0')
  readonly updatedAt: string  // ISO 8601 date
  /** Optional human-readable summary of the latest change. */
  readonly latestChange?: string
}

export const LEGAL_PAGE_META: ReadonlyArray<LegalPageMeta> = [
  {
    slug: 'privacy',
    version: '1.0.0',
    updatedAt: '2026-05-27',
    latestChange: 'Initial publication — placeholder content; full GDPR-compliant policy pending legal review.',
  },
  {
    slug: 'terms',
    version: '1.0.0',
    updatedAt: '2026-05-27',
    latestChange: 'Initial publication — placeholder content; full terms pending legal review.',
  },
  {
    slug: 'cookies',
    version: '1.0.0',
    updatedAt: '2026-05-27',
    latestChange: 'Initial publication — placeholder content; full cookie inventory pending audit.',
  },
]

export function findLegalMeta(slug: LegalPageMeta['slug']): LegalPageMeta | null {
  return LEGAL_PAGE_META.find(m => m.slug === slug) ?? null
}
