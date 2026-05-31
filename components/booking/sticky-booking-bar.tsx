'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { FAREHARBOR_BOOKING_URL } from '@/lib/config'

export function StickyBookingBar() {
    const [isVisible, setIsVisible] = useState(false)
    const tr = useTranslations()

    useEffect(() => {
        let ticking = false
        const handleScroll = () => {
            if (!ticking) {
                ticking = true
                requestAnimationFrame(() => {
                    if (window.scrollY > 100) {
                        setIsVisible(true)
                    } else {
                        setIsVisible(false)
                    }
                    ticking = false
                })
            }
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <div
            className={`fixed bottom-0 left-0 right-0 z-50 p-4 bg-primary transition-transform duration-300 md:hidden ${isVisible ? 'translate-y-0' : 'translate-y-full'
                }`}
        >
            <a
                href={FAREHARBOR_BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center bg-background text-primary hover:bg-background/90 font-bold text-lg h-12 rounded-full shadow-lg"
            >
                {tr('nav.bookTour')}
            </a>
        </div>
    )
}
