'use client'

import { useEffect, useState } from 'react'

interface AvailableDate {
    date: string
    capacity: number
    startTime: string
}

/**
 * Conversion-lift micro-component: shows the next available slot + scarcity signal.
 * Silently hides if /api/availability is not configured (FareHarbor API creds missing).
 */
export function AvailabilityUrgency({ className = '' }: { className?: string }) {
    const [next, setNext] = useState<AvailableDate | null>(null)
    const [totalSlotsThisWeek, setTotalSlotsThisWeek] = useState(0)
    const [unavailable, setUnavailable] = useState(false)

    useEffect(() => {
        const ctrl = new AbortController()
        fetch('/api/availability', { signal: ctrl.signal })
            .then((r) => r.json())
            .then((data) => {
                if (data?.error || !data?.dates?.length) {
                    setUnavailable(true)
                    return
                }
                const dates: AvailableDate[] = data.dates
                setNext(dates[0])
                const oneWeek = Date.now() + 7 * 24 * 60 * 60 * 1000
                const thisWeek = dates.filter(
                    (d) => new Date(d.date).getTime() <= oneWeek
                )
                const slots = thisWeek.reduce((sum, d) => sum + (d.capacity || 0), 0)
                setTotalSlotsThisWeek(slots)
            })
            .catch(() => setUnavailable(true))
        return () => ctrl.abort()
    }, [])

    if (unavailable || !next) return null

    const d = new Date(next.date)
    const dayStr = d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    })

    return (
        <div
            className={`rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm flex flex-wrap items-center gap-2 ${className}`}
        >
            <span aria-hidden="true">📅</span>
            <span className="font-medium text-foreground">
                Next available: <strong>{dayStr}</strong>
            </span>
            {next.capacity <= 5 && (
                <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-700 font-semibold text-xs">
                    Only {next.capacity} spots left
                </span>
            )}
            {totalSlotsThisWeek > 0 && totalSlotsThisWeek <= 30 && (
                <span className="ml-auto text-xs text-muted-foreground">
                    {totalSlotsThisWeek} spots total this week
                </span>
            )}
        </div>
    )
}
