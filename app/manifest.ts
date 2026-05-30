import type { MetadataRoute } from 'next'
import { getDefaultTenant } from '@/lib/tenants/server'
import { BRAND_THEME_COLOR_HEX, BRAND_BACKGROUND_HEX } from '@/lib/brand'

/**
 * W3C App Manifest spec requires short_name ≤ 12 characters for home-screen
 * labels on Android. Truncate at a word boundary so the label never cuts a
 * word mid-stream (e.g. "Alpacas Ibiza" → "Alpacas", never "Alpacas Ibiz").
 */
function toShortName(brandName: string): string {
  if (brandName.length <= 12) return brandName
  const clipped = brandName.slice(0, 12)
  const lastSpace = clipped.lastIndexOf(' ')
  // Only fall back to a hard slice if the first word itself exceeds 12 chars.
  return lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped
}

export default function manifest(): MetadataRoute.Manifest {
  let tenant
  try {
    tenant = getDefaultTenant()
  } catch {
    // Failsafe: getDefaultTenant() should never throw, but if the module
    // fails during an unusual build path, return a minimal valid manifest.
    return { name: 'Site' }
  }

  return {
    name: tenant.brandName,
    // W3C: short_name must be ≤ 12 chars — Android launcher label.
    // 'Alpacas Ibiza' is 13 chars; slice to 'Alpacas Ibiz'.
    short_name: toShortName(tenant.brandName),
    description: tenant.tagline,
    start_url: '/',
    display: 'standalone',
    background_color: BRAND_BACKGROUND_HEX,
    // theme_color must match app/layout.tsx viewport.themeColor (#6da855).
    theme_color: BRAND_THEME_COLOR_HEX,
    orientation: 'portrait-primary',
    lang: tenant.defaultLocale,
    icons: [
      {
        src: '/icon',
        sizes: '32x32',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-icon',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
      // 192×192 is the minimum size required by Chrome's PWA installability
      // checker. Served by app/icon-192.tsx (ImageResponse, edge runtime).
      {
        src: '/icon-192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-maskable',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
