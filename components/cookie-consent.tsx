'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { Locale } from '@/i18n.config'
import { t } from '@/lib/translations'

const STORAGE_KEY = 'ai_cookie_consent_v1'

type ConsentValue = 'accepted' | 'rejected' | null

function readConsent(): ConsentValue {
    if (typeof window === 'undefined') return null
    try {
        const v = window.localStorage.getItem(STORAGE_KEY)
        if (v === 'accepted' || v === 'rejected') return v
    } catch {}
    return null
}

function writeConsent(value: 'accepted' | 'rejected') {
    try {
        window.localStorage.setItem(STORAGE_KEY, value)
    } catch {}
    // Signal to GTM via dataLayer (so tags can gate on consent)
    const w = window as any
    w.dataLayer = w.dataLayer || []
    w.dataLayer.push({
        event: 'cookie_consent_update',
        cookie_consent: value,
    })
    // If rejected, disable GA/GTM cookie use via Consent Mode v2
    if (value === 'rejected') {
        w.dataLayer.push(['consent', 'update', {
            ad_storage: 'denied',
            analytics_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
        }])
    } else {
        w.dataLayer.push(['consent', 'update', {
            ad_storage: 'granted',
            analytics_storage: 'granted',
            ad_user_data: 'granted',
            ad_personalization: 'granted',
        }])
    }
}

export function CookieConsent() {
    const params = useParams()
    const locale = (params?.locale as Locale) || 'en'
    const tr = t(locale)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (readConsent() === null) setVisible(true)
    }, [])

    if (!visible) return null

    return (
        <div
            role="dialog"
            aria-live="polite"
            aria-label={tr('cookieConsent.ariaLabel') || 'Cookie consent'}
            aria-describedby="cookie-consent-message"
            className="fixed bottom-0 inset-x-0 z-[1000] p-4 md:p-5 bg-background border-t border-border shadow-2xl"
        >
            <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-4">
                <p id="cookie-consent-message" className="flex-1 text-sm text-foreground/80">
                    {tr('cookieConsent.message') ||
                        'We use cookies for analytics and to make the booking experience smoother. You can accept all or reject non-essential cookies. See our '}
                    <Link
                        href={`/${locale}/cookies`}
                        className="underline hover:no-underline"
                    >
                        {tr('cookieConsent.policyLink') || 'cookie policy'}
                    </Link>
                    .
                </p>
                <div className="flex gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => {
                            writeConsent('rejected')
                            setVisible(false)
                        }}
                        className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-secondary"
                    >
                        {tr('cookieConsent.reject') || 'Reject non-essential'}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            writeConsent('accepted')
                            setVisible(false)
                        }}
                        className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        {tr('cookieConsent.accept') || 'Accept all'}
                    </button>
                </div>
            </div>
        </div>
    )
}
