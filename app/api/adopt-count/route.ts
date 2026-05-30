/**
 * GET /api/adopt-count
 *
 * Returns the number of active adopters from the configured payment vendor.
 * Delegates all logic to lib/adopters/count.ts which owns the 1-hour
 * in-memory cache and fail-quiet behaviour.
 *
 * Response shape: { count: number; source: string }
 *
 * Cache-Control: s-maxage=3600 (CDN 1h) + stale-while-revalidate=86400 (24h).
 * On unconfigured / error: no-store so CDNs don't cache the zero.
 *
 * Useful for:
 *   - Server-side page renders (adopt/page.tsx calls the helper directly —
 *     no HTTP roundtrip needed).
 *   - Future client-side polling if AdopterCounter becomes a client component.
 */

import { NextResponse } from 'next/server'
import { getActiveAdopterCount } from '@/lib/adopters/count'
import { getRequestId, attachRequestId, makeRequestLogger } from '@/lib/request-id'

export async function GET(request: Request) {
  const reqId = getRequestId(request)
  const log = makeRequestLogger('adopt-count', reqId)

  const result = await getActiveAdopterCount()

  if (result.source === 'unconfigured') {
    return attachRequestId(
      NextResponse.json(result, {
        status: 200,
        headers: { 'cache-control': 'no-store' },
      }),
      reqId,
    )
  }

  if (result.source === 'error') {
    log.warn('getActiveAdopterCount returned error; responding with count=0')
    return attachRequestId(
      NextResponse.json(result, {
        status: 200,
        headers: { 'cache-control': 'no-store' },
      }),
      reqId,
    )
  }

  // Successful vendor fetch — cache at CDN layer.
  return attachRequestId(
    NextResponse.json(result, {
      status: 200,
      headers: {
        'cache-control': 's-maxage=3600, stale-while-revalidate=86400',
      },
    }),
    reqId,
  )
}
