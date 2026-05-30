'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Calendar } from 'lucide-react'
import { useLocaleT, useLocale } from '@/lib/locale-context'
import { FAREHARBOR_BOOKING_URL } from '@/lib/config'
import { CancellationBadge } from '@/components/booking/cancellation-badge'

interface AvailableDate {
    date: string
    capacity: number
    startTime: string
}

export function BookingSection() {
    const [availableDates, setAvailableDates] = useState<AvailableDate[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const tr = useLocaleT()
    const locale = useLocale()

    useEffect(() => {
        fetch('/api/availability')
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    setError(data.message)
                } else {
                    setAvailableDates(data.dates || [])
                }
                setLoading(false)
            })
            .catch(err => {
                console.error('Failed to fetch availability:', err)
                setError('Unable to load availability')
                setLoading(false)
            })
    }, [])

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return {
            day: date.getDate(),
            month: date.toLocaleDateString(locale, { month: 'short' }).toUpperCase(),
            weekday: date.toLocaleDateString(locale, { weekday: 'short' })
        }
    }

    return (
        <div className="w-full">
            {/* Show available dates if API is working */}
            {!loading && !error && availableDates.length > 0 && (
                <div className="mb-8">
                    <div className="flex items-center justify-center gap-2 mb-6">
                        <Calendar className="h-5 w-5 text-primary" />
                        <h3 className="text-xl font-semibold text-foreground">
                            {tr('bookingSection.nextDates')}
                        </h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-8">
                        {availableDates.slice(0, 8).map((slot, idx) => {
                            const formatted = formatDate(slot.date)
                            return (
                                <div
                                    key={idx}
                                    className="bg-background border-2 border-primary/20 rounded-xl p-4 text-center hover:border-primary/40 transition-colors cursor-pointer"
                                >
                                    <div className="text-xs text-foreground/50 uppercase tracking-wide mb-1">
                                        {formatted.weekday}
                                    </div>
                                    <div className="text-3xl font-bold text-primary">{formatted.day}</div>
                                    <div className="text-sm text-foreground/60 uppercase tracking-wide">
                                        {formatted.month}
                                    </div>
                                    {slot.capacity <= 5 && (
                                        <div className="mt-2 text-xs text-orange-600 font-medium">
                                            {slot.capacity} {tr('bookingSection.spotsLeft')}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    <p className="text-xs text-center text-foreground/50 mb-6">
                        {tr('bookingSection.updatedNote')}
                    </p>
                </div>
            )}

            {/* Loading state */}
            {loading && (
                <div className="text-center py-8 text-foreground/60">
                    <div className="animate-pulse">{tr('bookingSection.loading')}</div>
                </div>
            )}

            {/* Main Booking CTA */}
            <div className="text-center">
                <a
                    href={FAREHARBOR_BOOKING_URL}
                    className="inline-flex items-center justify-center px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1"
                >
                    {availableDates.length > 0 ? tr('bookingSection.bookNow') : tr('bookingSection.viewAndBook')}
                    <ArrowRight className="ml-2 h-5 w-5" />
                </a>
                <div className="mt-3">
                    <CancellationBadge variant="full" />
                </div>
                <p className="mt-2 text-sm text-foreground/60">
                    {tr('bookingSection.poweredBy')}
                </p>

                {error && (
                    <p className="mt-2 text-xs text-foreground/40">
                        {tr('bookingSection.apiNote')}
                    </p>
                )}
            </div>
        </div>
    )
}
