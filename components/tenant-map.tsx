/**
 * TenantMap — renders an accessible iframe map for a tenant's location.
 *
 * Delegates to getProviders(tenant).map to select the right embed URL
 * (osm-iframe by default, google-embed if GOOGLE_MAPS_EMBED_API_KEY is set).
 *
 * Accessibility:
 *   - <section> with aria-labelledby pointing to a visually-hidden <h2>.
 *   - <iframe> with an explicit title attribute.
 *   Pattern matches the existing map section in app/[locale]/contact/page.tsx.
 *
 * Wave B will replace the hardcoded map in the contact page with this component.
 * Do NOT use this component in the contact page yet — see PLAN.md Wave B.
 */

import { getProviders } from '@/lib/integrations'
import type { Tenant } from '@/lib/tenants/_types'

interface TenantMapProps {
  tenant: Tenant
  /** Override the map heading text. Defaults to "Find us". */
  heading?: string
  /** Override the iframe title. Defaults to "Map showing {brandName} location". */
  iframeTitle?: string
  /** Override the "View larger map →" link label. */
  largerMapLabel?: string
  /** Zoom level passed to the provider. Defaults to 14. */
  zoom?: number
  /** Additional className for the outer section element. */
  className?: string
}

export function TenantMap({
  tenant,
  heading = 'Find us',
  iframeTitle,
  largerMapLabel = 'View larger map →',
  zoom = 14,
  className = '',
}: TenantMapProps) {
  const { map } = getProviders(tenant)
  const { latitude: lat, longitude: lng } = tenant.geo

  const resolvedTitle =
    iframeTitle ?? `Map showing ${tenant.brandName} location`

  const src = map.embedUrl({ lat, lng, zoom })
  const href = map.linkUrl({ lat, lng, query: tenant.mapsQuery })

  // Stable ID for aria-labelledby — derived from tenant slug so it's unique
  // if multiple TenantMap instances appear on a page.
  const headingId = `tenant-map-heading-${tenant.slug}`

  return (
    <section
      aria-labelledby={headingId}
      className={`w-full px-4 pb-16 md:pb-24 bg-background ${className}`.trim()}
    >
      <div className="max-w-6xl mx-auto">
        <h2 id={headingId} className="sr-only">
          {heading}
        </h2>
        <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
          <iframe
            title={resolvedTitle}
            src={src}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full h-[360px] block"
          />
          <p className="text-xs text-muted-foreground p-3 bg-background">
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary"
            >
              {largerMapLabel}
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
