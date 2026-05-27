/**
 * Per-route OG image for /[locale]/yoga
 * Edge runtime — no external fetches, system fonts only.
 */

import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Alpaca Yoga Ibiza — Alpacas Ibiza'

export default function YogaOgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#556B2F',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          color: '#F5F5DC',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Brand monogram top-left */}
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 28, opacity: 0.85 }}>
          <div
            style={{
              background: '#F5F5DC',
              color: '#556B2F',
              fontWeight: 700,
              width: 56,
              height: 56,
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 20,
              fontSize: 36,
            }}
          >
            A
          </div>
          <span>Alpacas Ibiza</span>
        </div>

        {/* Title + subtitle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05, margin: 0 }}>
            Alpaca Yoga Ibiza
          </div>
          <div style={{ fontSize: 36, fontWeight: 400, opacity: 0.85 }}>
            Hatha · €30 · Wed + Sat · Max 6
          </div>
        </div>

        {/* Footer URL */}
        <div style={{ fontSize: 24, opacity: 0.7 }}>alpacasibiza.com</div>
      </div>
    ),
    { ...size },
  )
}
