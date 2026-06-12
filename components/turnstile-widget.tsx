'use client'

import { useEffect, useRef, useState } from 'react'

interface TurnstileWidgetProps {
    /** Hidden input name — include in form submission. The server reads the token
     *  value generically (via verifyHumanToken), so the name is provider-agnostic. */
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
        grecaptcha?: {
            ready: (cb: () => void) => void
            execute: (siteKey: string, opts: { action: string }) => Promise<string>
        }
    }
}

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
// reCAPTCHA v3 token lifetime is 120s — refresh a little before expiry.
const RECAPTCHA_REFRESH_MS = 110_000

let turnstileInjected = false
let recaptchaInjected = false

function injectOnce(src: string, which: 'turnstile' | 'recaptcha'): Promise<void> {
    const already = which === 'turnstile' ? turnstileInjected : recaptchaInjected
    if (already) return Promise.resolve()
    if (which === 'turnstile') turnstileInjected = true
    else recaptchaInjected = true
    return new Promise((resolve) => {
        const s = document.createElement('script')
        s.src = src
        s.async = true
        s.defer = true
        s.onload = () => resolve()
        s.onerror = () => resolve() // fail-open: form still usable without captcha
        document.head.appendChild(s)
    })
}

/**
 * Human-verification widget — provider-aware (Cloudflare Turnstile OR Google
 * reCAPTCHA v3), mirroring the server's `CAPTCHA_PROVIDER` switch.
 *
 * Provider is auto-selected by which public site key is present, so the client
 * needs no separate flag:
 *   - NEXT_PUBLIC_RECAPTCHA_SITE_KEY set  → reCAPTCHA v3 (invisible; emits a token)
 *   - else NEXT_PUBLIC_TURNSTILE_SITE_KEY → Cloudflare Turnstile widget
 *   - neither                              → renders null (local-dev friendly)
 *
 * Set the server `CAPTCHA_PROVIDER` to the matching provider. Both paths write
 * the token into the hidden `fieldName` input AND call `onToken`, so existing
 * forms work unchanged.
 *
 * Script injection is deferred until first form interaction (focusin/pointerdown)
 * or a 4-second idle timeout — avoids loading ~17KB for users who never touch
 * the form.
 */
export function TurnstileWidget({
    fieldName = 'cf-turnstile-response',
    onToken,
    className = '',
}: TurnstileWidgetProps) {
    const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
    const turnstileKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    const provider: 'recaptcha' | 'turnstile' | 'none' = recaptchaKey
        ? 'recaptcha'
        : turnstileKey
          ? 'turnstile'
          : 'none'
    const siteKey = provider === 'recaptcha' ? recaptchaKey : turnstileKey

    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const [shouldLoad, setShouldLoad] = useState(false)

    // Defer script injection until first interaction OR 4s idle fallback.
    useEffect(() => {
        if (provider === 'none') return
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
    }, [provider])

    // Turnstile: inject script + render the explicit widget.
    useEffect(() => {
        if (provider !== 'turnstile' || !siteKey || !shouldLoad || !containerRef.current) return
        let widgetId: string | undefined
        void injectOnce(TURNSTILE_SRC, 'turnstile').then(() => {
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
    }, [provider, siteKey, shouldLoad, onToken])

    // reCAPTCHA v3: inject api.js?render=<key>, then execute to mint a token.
    // Invisible — Google renders its own badge. Refresh before the 120s expiry.
    useEffect(() => {
        if (provider !== 'recaptcha' || !siteKey || !shouldLoad) return
        let cancelled = false
        let timer: ReturnType<typeof setInterval> | undefined

        function runExecute() {
            const grecaptcha = window.grecaptcha
            if (!grecaptcha) return
            grecaptcha.ready(() => {
                grecaptcha
                    .execute(siteKey as string, { action: 'submit' })
                    .then((token) => {
                        if (cancelled) return
                        if (inputRef.current) inputRef.current.value = token
                        onToken?.(token)
                    })
                    .catch(() => {
                        /* fail-open: leave token empty, server decides */
                    })
            })
        }

        void injectOnce(
            `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`,
            'recaptcha',
        ).then(() => {
            if (cancelled) return
            runExecute()
            timer = setInterval(runExecute, RECAPTCHA_REFRESH_MS)
        })

        return () => {
            cancelled = true
            if (timer) clearInterval(timer)
        }
    }, [provider, siteKey, shouldLoad, onToken])

    if (provider === 'none') {
        return null
    }

    return (
        <div className={className}>
            <input ref={inputRef} type="hidden" name={fieldName} />
            {/* Turnstile renders into this container; reCAPTCHA v3 is invisible (own badge). */}
            <div ref={containerRef} aria-live="polite" />
        </div>
    )
}
