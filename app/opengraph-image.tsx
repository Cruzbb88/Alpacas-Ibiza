import { ImageResponse } from 'next/og'
import { getDefaultTenant } from '@/lib/tenants/server'
import { BRAND_PRIMARY_HEX, BRAND_SECONDARY_HEX } from '@/lib/brand'

// Edge runtime required — ImageResponse uses the Vercel/Next.js edge image API.
export const runtime = 'edge'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OGImage() {
  let tenant
  try {
    tenant = getDefaultTenant()
  } catch {
    // Failsafe: return a minimal branded image even if tenant resolution fails.
    tenant = { brandName: 'Alpacas Ibiza', tagline: '' }
  }

  // alt text pulled from tenant so it stays in sync with the brand.
  // Note: the `alt` named export must be a static string per Next.js metadata route
  // convention — it cannot be dynamic. This variable is used in the rendered JSX
  // accessible fallback title only.
  const altText = `${tenant.brandName} — ${tenant.tagline}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: BRAND_PRIMARY_HEX,
          color: BRAND_SECONDARY_HEX,
          fontFamily: 'system-ui, sans-serif',
          padding: '64px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '72px',
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: '24px',
          }}
        >
          {tenant.brandName}
        </div>
        <div
          style={{
            fontSize: '36px',
            fontWeight: 400,
            opacity: 0.9,
            maxWidth: '900px',
          }}
        >
          {tenant.tagline}
        </div>
        {/* Hidden accessible title — ImageResponse renders this as SVG alt fallback */}
        <title>{altText}</title>
      </div>
    ),
    { ...size }
  )
}

// Static alt text for Next.js metadata route convention.
// Matches tenant.brandName + tagline (kept in sync manually when tenant changes).
export const alt = 'Alpacas Ibiza — The very first alpaca farm on Ibiza'
