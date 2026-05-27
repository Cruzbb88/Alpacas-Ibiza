import type { MetadataRoute } from 'next'
import { getDefaultTenant } from '@/lib/tenants/server'
import { BRAND_THEME_COLOR_HEX, BRAND_BACKGROUND_HEX } from '@/lib/brand'

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
    short_name: tenant.brandName,
    description: tenant.tagline,
    start_url: '/',
    display: 'standalone',
    background_color: BRAND_BACKGROUND_HEX,
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
      {
        src: '/icon-maskable',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
