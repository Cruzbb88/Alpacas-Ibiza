import { NextResponse } from 'next/server'
import { buildSearchIndex } from '@/lib/search/build-index'

export const dynamic = 'force-static' // build-time cached
export const revalidate = 3600 // 1h ISR

export async function GET() {
  const items = buildSearchIndex()
  return NextResponse.json(
    { items, generatedAt: new Date().toISOString() },
    {
      headers: {
        'Cache-Control':
          'public, max-age=3600, s-maxage=86400, stale-while-revalidate=2592000',
      },
    },
  )
}
