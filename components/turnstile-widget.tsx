'use client'

import { useEffect, useRef } from 'react'

interface TurnstileWidgetProps {
    /** Hidden input name — include in form submission */
    fieldName?: string
    onToken?: (token: string) => void
    className?: string
}

declare global {
    interface Window {
        turnstile?: {
            render: (
                el: HTMLElement,
                opts: {
                    sitekey: string
                    callback?: (token: string) => void
                    'error-callback'?: () => void
                    theme?: 'light' | 'dark' | 'auto'
                    size?: 'normal' | 'compact' | 'invisible'
                    appearance?: 'always' | 'execute' | 'interaction-only'
                }
            ) => string
            reset: (widgetId: string) => void
        }
    }
}

/**
 * Cloudflare Turnstile widget.
 * No-op if NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set (local dev friendly).
 * Injects a hidden `cf-turnstile-response` input so standard forms work.
 */
export function TurnstileWidget({
    fieldName = 'cf-turnstile-response',
    onToken,
    className = '',
}: TurnstileWidgetProps) {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (!siteKey || !containerRef.current) return

        let widgetId: string | undefined

        const render = () => {
            if (!window.turnstile || !containerRef.current) return
            widgetId = window.turnstile.render(containerRef.current, {
                sitekey: siteKey,
                appearance: 'interaction-only',
                callback: (token: string) => {
                    if (inputRef.current) inputRef.current.value = token
                    onToken?.(token)
                },
            })
        }

        if (window.turnstile) {
            render()
        } else {
            const s = document.createElement('script')
            s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
            s.async = true
            s.defer = true
            s.onload = render
            document.head.appendChild(s)
        }

        return () => {
            if (widgetId && window.turnstile) {
                try {
                    window.turnstile.reset(widgetId)
                } catch {}
            }
        }
    }, [siteKey, onToken])

    if (!siteKey) {
        return null
    }

    return (
        <div className={className}>
            <input ref={inputRef} type="hidden" name={fieldName} />
            <div ref={containerRef} />
        </div>
    )
}
