'use client'

import { useEffect, useRef, useState } from 'react'

interface FareHarborCalendarProps {
    /** FareHarbor account shortname. Defaults to NEXT_PUBLIC_FAREHARBOR_SHORTNAME. */
    shortname?: string
    /** Flow ID to scope calendar to a specific booking flow. Defaults to NEXT_PUBLIC_FAREHARBOR_FLOW_ID. */
    flowId?: string
    /** Filter to a specific item ID. When set, shows only that item's calendar. */
    itemId?: string
    /** Include full item images + descriptions in the calendar. Default true. */
    fullItems?: boolean
    /** Fallback behaviour when JS is disabled. Default "simple". */
    fallback?: 'simple' | 'error'
    /** Optional className applied to the wrapper. */
    className?: string
}

/**
 * Lazy-mounting wrapper — shows a skeleton until the user scrolls the calendar
 * into view (300px rootMargin). Only then mounts FareHarborCalendarReal.
 *
 * Failsafe: if IntersectionObserver is unavailable (very old browser), falls
 * back to eager mount — preserves prior behavior.
 */
export function FareHarborCalendar(props: FareHarborCalendarProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [inView, setInView] = useState(false)

    useEffect(() => {
        if (typeof IntersectionObserver === 'undefined') {
            // Old browser — fall back to eager mount (preserves the failsafe)
            setInView(true)
            return
        }
        const observer = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    if (e.isIntersecting) {
                        setInView(true)
                        observer.disconnect()
                        return
                    }
                }
            },
            { rootMargin: '300px' }, // start loading 300px before scrolled into view
        )
        if (containerRef.current) observer.observe(containerRef.current)
        return () => observer.disconnect()
    }, [])

    return (
        <div ref={containerRef} className="min-h-[400px]">
            {inView ? <FareHarborCalendarReal {...props} /> : <CalendarSkeleton />}
        </div>
    )
}

function CalendarSkeleton() {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto" aria-busy="true">
            {Array.from({ length: 8 }).map((_, i) => (
                <div
                    key={i}
                    className="bg-secondary/40 rounded-xl h-24 animate-pulse"
                    aria-hidden="true"
                />
            ))}
        </div>
    )
}

/**
 * Embeds a FareHarbor booking calendar.
 *
 * Uses FareHarbor's official script-tag embed:
 * https://fareharbor.com/embeds/script/calendar/<shortname>/?flow=<id>
 *
 * The script, on load, replaces the <div> rendered below with their calendar UI.
 */
function FareHarborCalendarReal({
    shortname = process.env.NEXT_PUBLIC_FAREHARBOR_SHORTNAME || 'alpacasibiza',
    flowId = process.env.NEXT_PUBLIC_FAREHARBOR_FLOW_ID,
    itemId,
    fullItems = true,
    fallback = 'simple',
    className = '',
}: FareHarborCalendarProps) {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const params = new URLSearchParams()
        params.set('fallback', fallback)
        if (fullItems) params.set('full-items', 'yes')
        if (flowId) params.set('flow', flowId)
        if (itemId) params.set('items', itemId)

        const src = `https://fareharbor.com/embeds/script/calendar/${shortname}/?${params.toString()}`

        const script = document.createElement('script')
        script.src = src
        script.async = true
        script.onerror = () => {
            if (!containerRef.current) return
            containerRef.current.innerHTML = ''
            const a = document.createElement('a')
            a.href = fallbackHref
            a.target = '_blank'
            a.rel = 'noopener noreferrer'
            a.className = 'inline-flex items-center justify-center rounded-md font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 py-2'
            a.textContent = 'View Available Dates & Book Now'
            containerRef.current.appendChild(a)
        }
        containerRef.current?.appendChild(script)

        return () => {
            if (script.parentNode) {
                script.parentNode.removeChild(script)
            }
        }
    }, [shortname, flowId, itemId, fullItems, fallback])

    const fallbackHref = `https://fareharbor.com/embeds/book/${shortname}/${
        flowId || itemId ? `?${new URLSearchParams({
            'full-items': fullItems ? 'yes' : '',
            ...(flowId ? { flow: flowId } : {}),
            ...(itemId ? { items: itemId } : {}),
        }).toString()}` : '?full-items=yes'
    }`

    return (
        <div ref={containerRef} className={`fareharbor-calendar-wrapper w-full ${className}`}>
            <noscript>
                <a
                    href={fallbackHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-md font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 py-2"
                >
                    View Available Dates &amp; Book Now
                </a>
            </noscript>
        </div>
    )
}
