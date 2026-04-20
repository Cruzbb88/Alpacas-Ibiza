import { NextResponse } from 'next/server'

/**
 * GET /api/google-reviews
 *
 * Server-side proxy to Google Places API for live review summary.
 * Cached 6h (ISR revalidate). If no API key configured, returns stub that lets
 * the UI gracefully hide the widget.
 *
 * Env vars:
 *   GOOGLE_PLACES_API_KEY — server-side key with Places API (New) enabled
 *   GOOGLE_PLACES_PLACE_ID — the Google Business Profile place ID
 *
 * Docs: https://developers.google.com/maps/documentation/places/web-service/place-details
 */
async function fetchWithTimeout(url: string, init: RequestInit, ms = 5000) {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), ms)
    try {
        return await fetch(url, { ...init, signal: ctrl.signal })
    } finally {
        clearTimeout(t)
    }
}

interface ReviewSummary {
    rating: number
    reviewCount: number
    topReviews: Array<{
        author: string
        rating: number
        text: string
        relativeTime: string
    }>
}

export async function GET() {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    const placeId = process.env.GOOGLE_PLACES_PLACE_ID

    if (!apiKey || !placeId) {
        return NextResponse.json(
            { configured: false },
            { status: 200, headers: { 'cache-control': 'public, max-age=300' } }
        )
    }

    try {
        const res = await fetchWithTimeout(
            `https://places.googleapis.com/v1/places/${placeId}?fields=rating,userRatingCount,reviews`,
            {
                headers: {
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask': 'rating,userRatingCount,reviews',
                },
            },
            6000
        )

        if (!res.ok) {
            throw new Error(`Places API returned ${res.status}`)
        }

        const data = await res.json()
        const summary: ReviewSummary = {
            rating: data.rating || 0,
            reviewCount: data.userRatingCount || 0,
            topReviews: (data.reviews || [])
                .slice(0, 3)
                .map((r: any) => ({
                    author: r.authorAttribution?.displayName || 'Anonymous',
                    rating: r.rating || 0,
                    text: r.text?.text || '',
                    relativeTime: r.relativePublishTimeDescription || '',
                })),
        }

        return NextResponse.json(
            { configured: true, ...summary },
            {
                headers: {
                    // 6h browser cache + 24h CDN
                    'cache-control': 'public, max-age=21600, s-maxage=86400',
                },
            }
        )
    } catch (err) {
        console.error('[google-reviews] fetch failed:', err)
        return NextResponse.json(
            { configured: true, error: 'fetch_failed' },
            { status: 502 }
        )
    }
}

// ISR revalidate 6h
export const revalidate = 21600
