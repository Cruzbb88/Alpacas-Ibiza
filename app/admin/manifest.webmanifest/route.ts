import { NextResponse } from 'next/server'

export const dynamic = 'force-static'

export async function GET() {
  return NextResponse.json(
    {
      name: 'Alpacas Ibiza — Admin',
      short_name: 'Alpacas Admin',
      description: 'Daily ops for the herd',
      start_url: '/admin/today',
      display: 'standalone',
      background_color: '#FFFAF0',
      theme_color: '#AD561A',
      icons: [
        { src: '/images/brand/logo-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/images/brand/logo-512.png', sizes: '512x512', type: 'image/png' },
      ],
      scope: '/admin',
    },
    { headers: { 'Content-Type': 'application/manifest+json' } },
  )
}
