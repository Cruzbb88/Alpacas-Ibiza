import { ImageResponse } from 'next/og'

export const size = { width: 192, height: 192 }
export const contentType = 'image/png'

/**
 * 192×192 PWA icon — Chrome installability requires this size.
 * Matches the visual style of icon.tsx (32) and icon-maskable.tsx (512).
 */
export default function Icon192() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#556B2F',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#F5F5DC',
          fontWeight: 700,
          fontFamily: 'system-ui',
          fontSize: 110,
        }}
      >
        A
      </div>
    ),
    { ...size },
  )
}
