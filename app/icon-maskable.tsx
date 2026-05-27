import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

/**
 * Maskable PWA icon. The 80% safe zone is the only part guaranteed visible after
 * the Android home-screen mask. Background fills the full 512×512; the letter
 * sits in the center 410×410 area.
 */
export default function MaskableIcon() {
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
          fontSize: 280,
        }}
      >
        A
      </div>
    ),
    { ...size },
  )
}
