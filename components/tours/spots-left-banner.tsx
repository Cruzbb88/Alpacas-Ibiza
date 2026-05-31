'use client'

import { useEffect, useState } from 'react'

interface AvailableDate {
    date: string
    capacity: number
    startTime: string
}

interface AvailabilityResponse {
    dates?: AvailableDate[]
    error?: string
}

interface SpotsLeftBannerProps {
    /** FareHarbor item ID for this specific tour. If undefined the banner is always hidden. */
    itemId: string | undefined
    /** Human-readable tour label — reserved for future logging / a11y use. */
    tourLabel: string
}

/**
 * Urgency widget: fetches /api/availability (existing route, existing rate-limit)
 * and renders a scarcity prompt when fewer than 30 spots remain in the next 7 days.
 *
 * Fail-quiet in every error / "plenty" / unconfigured case — renders null.
 * Never adds a new FareHarbor API call; delegates entirely to the route.
 *
 * NOTE: /api/availability does not accept an `item` query param — it reads
 * FAREHARBOR_ITEM_ID from env (or fetches all items). The itemId prop is
 * therefore not forwarded to the route; the banner reflects aggregate
 * availability across the configured items. This matches the existing
 * AvailabilityUrgency pattern on the tours hub page.
 */
export function SpotsLeftBanner({ itemId, tourLabel: _tourLabel }: SpotsLeftBannerProps) {
    const [spotsThisWeek, setSpotsThisWeek] = useState<number | null>(null)

    useEffect(() => {
        // Only attempt if an itemId is configured — prevents noise on unconfigured pages.
        if (!itemId) return

        const ctrl = new AbortController()

        fetch('/api/availability', { signal: ctrl.signal })
            .then((r): Promise<AvailabilityResponse> => {
                if (!r.ok) throw new Error('non-2xx')
                return r.json()
            })
            .then((data) => {
                if (data.error || !data.dates?.length) return

                const oneWeek = Date.now() + 7 * 24 * 60 * 60 * 1000
                const thisWeek = data.dates.filter(
                    (d) => new Date(d.date).getTime() <= oneWeek,
                )
                const total = thisWeek.reduce((sum, d) => sum + (d.capacity ?? 0), 0)

                // Only surface scarcity — hide when supply is ample (>= 30)
                if (total > 0 && total < 30) {
                    setSpotsThisWeek(total)
                }
            })
            .catch(() => {
                // Fail-quiet: network error or rate-limit → stay null
            })

        return () => ctrl.abort()
    }, [itemId])

    if (spotsThisWeek === null) return null

    return (
        <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-800"
        >
            <span aria-hidden="true" className="text-base">⚡</span>
            <span>
                Only <strong>{spotsThisWeek}</strong> spot{spotsThisWeek !== 1 ? 's' : ''} left
                in the next 7 days —{' '}
                <span className="font-semibold">book now</span>
            </span>
        </div>
    )
}
