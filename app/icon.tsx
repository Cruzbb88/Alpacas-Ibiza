import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

/**
 * Dynamic favicon. Renders a brand-color square with a single letter "A" (Alpacas)
 * in cream. Tenant-agnostic by design — favicons are the tightest constraint
 * (32×32 px) and need to be readable.
 *
 * Edge runtime — no Node APIs allowed.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 22,
          background: '#556B2F',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#F5F5DC',
          fontWeight: 700,
          fontFamily: 'system-ui',
        }}
      >
        A
      </div>
    ),
    { ...size },
  )
}
