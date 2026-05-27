'use client'

import { useEffect, useRef, useState } from 'react'

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

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

let scriptInjected = false // module-scope guard: only one <script> tag globally

function injectScriptOnce(): Promise<void> {
    if (scriptInjected) return Promise.resolve()
    scriptInjected = true
    return new Promise((resolve) => {
        const s = document.createElement('script')
        s.src = SCRIPT_SRC
        s.async = true
        s.defer = true
        s.onload = () => resolve()
        s.onerror = () => resolve() // fail-open: form still usable without captcha
        document.head.appendChild(s)
    })
}

/**
 * Cloudflare Turnstile widget.
 * No-op if NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set (local dev friendly).
 * Injects a hidden `cf-turnstile-response` input so standard forms work.
 *
 * Script injection is deferred until first form interaction (focusin/pointerdown)
 * or a 4-second idle timeout — whichever comes first. This avoids ~17KB on first
 * paint for users who never touch the form.
 */
export function TurnstileWidget({
    fieldName = 'cf-turnstile-response',
    onToken,
    className = '',
}: TurnstileWidgetProps) {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const [shouldLoad, setShouldLoad] = useState(false)

    // Defer script injection until first interaction OR 4s idle fallback.
    useEffect(() => {
        if (!siteKey) return
        const idle = window.setTimeout(() => setShouldLoad(true), 4000)
        const form = containerRef.current?.closest('form')
        function trigger() {
            setShouldLoad(true)
            cleanup()
        }
        function cleanup() {
            window.clearTimeout(idle)
            form?.removeEventListener('focusin', trigger)
            form?.removeEventListener('pointerdown', trigger)
        }
        form?.addEventListener('focusin', trigger, { once: true })
        form?.addEventListener('pointerdown', trigger, { once: true })
        return cleanup
    }, [siteKey])

    // Once shouldLoad flips, inject script + render widget.
    useEffect(() => {
        if (!siteKey || !shouldLoad || !containerRef.current) return
        let widgetId: string | undefined
        void injectScriptOnce().then(() => {
            if (!window.turnstile || !containerRef.current) return
            widgetId = window.turnstile.render(containerRef.current, {
                sitekey: siteKey,
                appearance: 'interaction-only',
                callback: (token: string) => {
                    if (inputRef.current) inputRef.current.value = token
                    onToken?.(token)
                },
            })
        })
        return () => {
            if (widgetId && window.turnstile) {
                try {
                    window.turnstile.reset(widgetId)
                } catch {
                    /* widget already torn down */
                }
            }
        }
    }, [siteKey, shouldLoad, onToken])

    if (!siteKey) {
        return null
    }

    return (
        <div className={className}>
            <input ref={inputRef} type="hidden" name={fieldName} />
            <div ref={containerRef} aria-live="polite" />
        </div>
    )
}
