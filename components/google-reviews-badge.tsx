'use client'

import { useEffect, useState } from 'react'

interface Review {
    author: string
    rating: number
    text: string
    relativeTime: string
}

interface ReviewSummary {
    configured: boolean
    rating?: number
    reviewCount?: number
    topReviews?: Review[]
    error?: string
}

/**
 * Compact live Google Reviews summary — star rating + count.
 * Graceful no-op if API key not configured.
 */
export function GoogleReviewsBadge({ className = '' }: { className?: string }) {
    const [data, setData] = useState<ReviewSummary | null>(null)
    const [failed, setFailed] = useState(false)

    useEffect(() => {
        const ctrl = new AbortController()
        fetch('/api/google-reviews', { signal: ctrl.signal })
            .then((r) => r.json())
            .then((d) => setData(d))
            .catch(() => {
                if (!ctrl.signal.aborted) setFailed(true)
            })
        return () => ctrl.abort()
    }, [])

    if (failed || !data || !data.configured || !data.rating) return null

    const stars = '★'.repeat(Math.round(data.rating)) + '☆'.repeat(5 - Math.round(data.rating))
    return (
        <a
            href="https://g.page/r/alpacasibiza"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 text-sm text-foreground/80 hover:text-foreground ${className}`}
            aria-label={`Google rating ${data.rating} stars from ${data.reviewCount} reviews`}
        >
            <span aria-hidden="true" className="text-yellow-500 font-bold">{stars}</span>
            <span className="font-semibold">{data.rating.toFixed(1)}</span>
            <span className="text-muted-foreground">({data.reviewCount} Google reviews)</span>
        </a>
    )
}
