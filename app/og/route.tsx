import { ImageResponse } from 'next/og'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { sanitiseDisplayName } from '@/lib/html'

export const runtime = 'edge'

const MAX_LEN = 100

export async function GET(request: Request) {
  const ip = getClientIp(request)
  const limited = rateLimit({ key: `og:${ip}`, limit: 60, windowMs: 5 * 60 * 1000 })
  if (!limited.allowed) {
    return new Response('Too Many Requests', {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil(limited.resetMs / 1000)) },
    })
  }

  const url = new URL(request.url)
  const title = (sanitiseDisplayName(url.searchParams.get('title'), MAX_LEN) ?? '') || 'Alpacas Ibiza'
  const subtitle = (sanitiseDisplayName(url.searchParams.get('subtitle'), MAX_LEN) ?? '') || "Ibiza's first alpaca farm · Es Currals"

  const imageResponse = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #F4EEDD 0%, #E8DCC2 50%, #D7C8A4 100%)',
          padding: '80px',
          position: 'relative',
        }}
      >
        <div style={{
          display: 'flex',
          position: 'absolute',
          top: 60,
          left: 60,
          fontSize: 22,
          color: '#556B2F',
          letterSpacing: 6,
          textTransform: 'uppercase',
          fontWeight: 600,
        }}>
          Es Currals · Ibiza
        </div>
        <div style={{
          display: 'flex',
          fontSize: 76,
          fontWeight: 700,
          color: '#2E2E2E',
          textAlign: 'center',
          lineHeight: 1.1,
          marginBottom: 24,
          maxWidth: 1000,
        }}>
          {title}
        </div>
        <div style={{
          display: 'flex',
          fontSize: 32,
          color: '#666',
          textAlign: 'center',
          maxWidth: 900,
        }}>
          {subtitle}
        </div>
        <div style={{
          display: 'flex',
          position: 'absolute',
          bottom: 60,
          right: 60,
          fontSize: 20,
          color: '#999',
          letterSpacing: 2,
        }}>
          alpacasibiza.com
        </div>
        <div style={{
          display: 'flex',
          position: 'absolute',
          bottom: 60,
          left: 60,
          fontSize: 48,
        }}>
          🦙
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )

  // Aggressively CDN-cache: identical title+subtitle always produces the same PNG.
  // 1d browser / 7d CDN / 30d stale-while-revalidate.
  imageResponse.headers.set('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000')
  return imageResponse
}
