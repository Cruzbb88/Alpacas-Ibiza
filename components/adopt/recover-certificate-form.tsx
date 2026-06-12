'use client'

/**
 * RecoverCertificateForm — client component for the /[locale]/recover-certificate page.
 *
 * Anti-enumeration design:
 *   - POST /api/recover-certificate always returns { ok: true } 200.
 *   - The success message is IDENTICAL whether an email was found or not.
 *   - Client-side UI never reveals whether the submission matched a donor record.
 *
 * Honeypot: the hidden `bee_finds_nectar` field is present in the DOM but
 * invisible and not interactable by real users. Bots that fill every input
 * will populate it; the server silently ignores the request.
 */

import { useState } from 'react'

interface RecoverCertificateFormProps {
    emailLabel: string
    submitLabel: string
    successMessage: string
}

export function RecoverCertificateForm({
    emailLabel,
    submitLabel,
    successMessage,
}: RecoverCertificateFormProps) {
    const [email, setEmail] = useState('')
    const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setStatus('loading')

        // Collect the locale from the URL path (/en/, /nl/, etc.) — avoids
        // threading a prop through the server component just for analytics.
        const pathLocale = typeof window !== 'undefined'
            ? window.location.pathname.split('/')[1] ?? 'en'
            : 'en'

        // Read the honeypot value from the form data — the hidden field is
        // never touched by real users so it should always be empty.
        const formEl = e.currentTarget
        const honeypotEl = formEl.elements.namedItem('bee_finds_nectar') as HTMLInputElement | null
        const honeypot = honeypotEl?.value ?? ''

        try {
            const res = await fetch('/api/recover-certificate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    locale: pathLocale,
                    bee_finds_nectar: honeypot,
                }),
            })
            // Only treat a 503 (SDK/key missing) as an error.
            // All other responses (200 regardless of lookup result) → success.
            setStatus(res.ok ? 'sent' : 'error')
        } catch {
            setStatus('error')
        }
    }

    if (status === 'sent') {
        // Read locale from URL path so we can build a forward link without
        // threading a prop through the server component.
        const pathLocale =
            typeof window !== 'undefined'
                ? window.location.pathname.split('/')[1] ?? 'en'
                : 'en'

        return (
            <div role="status" aria-live="polite" className="mt-4 space-y-3">
                <p className="text-sm text-muted-foreground">{successMessage}</p>
                <a
                    href={`/${pathLocale}`}
                    className="inline-flex items-center text-sm font-medium text-primary underline hover:text-primary/80 transition-colors"
                >
                    Back to the farm →
                </a>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 max-w-sm">
            {/* Honeypot — off-screen, hidden from assistive tech and tab order */}
            <div
                aria-hidden="true"
                style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: 1, height: 1, overflow: 'hidden' }}
            >
                <label htmlFor="bee_finds_nectar">Leave this empty</label>
                <input
                    id="bee_finds_nectar"
                    name="bee_finds_nectar"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    defaultValue=""
                />
            </div>

            <div className="flex flex-col gap-1">
                <label htmlFor="rc-email" className="text-sm font-medium text-foreground">
                    {emailLabel}
                </label>
                <input
                    id="rc-email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={status === 'loading'}
                    className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                />
            </div>

            <button
                type="submit"
                disabled={status === 'loading'}
                className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
                {status === 'loading' ? 'Sending…' : submitLabel}
            </button>

            {status === 'error' && (
                <p className="text-destructive text-xs">
                    Something went wrong. Contact{' '}
                    <a href="mailto:info@alpacasibiza.com" className="underline">
                        info@alpacasibiza.com
                    </a>{' '}
                    if this persists.
                </p>
            )}
        </form>
    )
}
