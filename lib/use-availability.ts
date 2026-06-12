'use client'

import { useEffect, useState } from 'react'

export interface AvailableDate {
    date: string
    capacity: number
    startTime: string
}

export interface AvailabilityResponse {
    dates: AvailableDate[]
    lastUpdated?: string
    error?: string
}

const CLIENT_TTL_MS = 60_000

let cachedPromise: Promise<AvailabilityResponse> | null = null
let cachedAt = 0

function fetchAvailability(): Promise<AvailabilityResponse> {
    const fresh = cachedPromise && Date.now() - cachedAt < CLIENT_TTL_MS
    if (fresh) return cachedPromise!

    cachedAt = Date.now()
    // 8s ceiling: /api/availability proxies FareHarbor; a stalled upstream would
    // otherwise leave the date grid pending forever. The abort rejects, and the
    // existing .catch converts it to the graceful "failed" fallback.
    cachedPromise = fetch('/api/availability', { signal: AbortSignal.timeout(8_000) })
        .then((r) => r.json() as Promise<AvailabilityResponse>)
        .catch(() => ({ dates: [], error: 'failed' }))
    return cachedPromise
}

/**
 * Shared client-side cache for /api/availability. Deduplicates the fetch
 * across all consumers on the same page (booking-section + availability-urgency
 * both call this), with a 60s in-memory TTL. Re-mounts within the TTL get the
 * already-resolved promise.
 */
export function useAvailability() {
    const [data, setData] = useState<AvailabilityResponse | null>(null)

    useEffect(() => {
        let alive = true
        fetchAvailability().then((res) => {
            if (alive) setData(res)
        })
        return () => {
            alive = false
        }
    }, [])

    return data
}
