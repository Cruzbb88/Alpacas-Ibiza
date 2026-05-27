import { ImageResponse } from 'next/og'
import { getDefaultTenant } from '@/lib/tenants/server'
import { BRAND_PRIMARY_HEX, BRAND_SECONDARY_HEX } from '@/lib/brand'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Alpacas Ibiza — Sustainability'

export default async function OGImage() {
  let tenant
  try {
    tenant = getDefaultTenant()
  } catch {
    tenant = { brandName: 'Alpacas Ibiza' }
  }

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
        <div style={{ fontSize: '32px', opacity: 0.75, marginBottom: '12px' }}>
          {tenant.brandName}
        </div>
        <div style={{ fontSize: '88px', fontWeight: 700, lineHeight: 1.05, marginBottom: '24px' }}>
          Sustainability
        </div>
        <div style={{ fontSize: '32px', opacity: 0.9, maxWidth: '900px' }}>
          Solar, water reuse, regenerative practice. Built to last.
        </div>
        <title>{alt}</title>
      </div>
    ),
    { ...size }
  )
}
