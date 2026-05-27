import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 130,
          background: '#556B2F',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#F5F5DC',
          fontWeight: 700,
          fontFamily: 'system-ui',
          borderRadius: 36,
        }}
      >
        A
      </div>
    ),
    { ...size },
  )
}
