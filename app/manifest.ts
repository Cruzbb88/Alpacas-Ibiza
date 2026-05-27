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
    // UNMAPPED — owner drops /public/icon-192.png, /public/icon-512.png
    // and /app/apple-icon.png to auto-generate PWA icons via Next.js convention.
    // Once those files exist, populate the icons array here:
    //   icons: [
    //     { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    //     { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    //   ],
  }
}
