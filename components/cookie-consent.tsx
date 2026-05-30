'use client'

import { useEffect, useRef, useState } from 'react'
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
    const rejectRef = useRef<HTMLButtonElement>(null)
    const acceptRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        if (readConsent() === null) setVisible(true)
    }, [])

    // Focus the Reject button on mount so it is reachable first (safety-first).
    useEffect(() => {
        if (visible) rejectRef.current?.focus()
    }, [visible])

    // Tab focus-trap: cycle between Reject and Accept buttons only.
    function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
        if (e.key !== 'Tab') return
        const buttons = [rejectRef.current, acceptRef.current].filter(Boolean) as HTMLButtonElement[]
        if (buttons.length < 2) return
        const first = buttons[0]
        const last = buttons[buttons.length - 1]
        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault()
                last.focus()
            }
        } else {
            if (document.activeElement === last) {
                e.preventDefault()
                first.focus()
            }
        }
    }

    if (!visible) return null

    return (
        <div
            role="dialog"
            aria-label={tr('cookieConsent.ariaLabel') || 'Cookie consent'}
            aria-describedby="cookie-consent-message"
            className="fixed bottom-0 inset-x-0 z-[1000] p-4 md:p-5 bg-background border-t border-border shadow-2xl"
            onKeyDown={handleKeyDown}
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
                {/* AEPD 2024 equal-prominence requirement: both buttons must be
                    the same size, position, and visual weight. Reject uses
                    bg-secondary (filled, neutral) — same padding/font/rounded as
                    Accept so neither is visually subordinated. A plain border-only
                    Reject button would fail equal-prominence under AEPD 2024
                    guidance in force 2026. */}
                <div className="flex gap-2 shrink-0">
                    <button
                        ref={rejectRef}
                        type="button"
                        onClick={() => {
                            writeConsent('rejected')
                            setVisible(false)
                        }}
                        className="px-4 py-2 text-sm font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    >
                        {tr('cookieConsent.reject') || 'Reject non-essential'}
                    </button>
                    <button
                        ref={acceptRef}
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
