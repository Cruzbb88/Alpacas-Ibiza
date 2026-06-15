'use client'

import { useState } from 'react'
import { TurnstileWidget } from '@/components/turnstile-widget'
import { HoneypotField } from '@/components/honeypot-field'
import { InlineSpinner } from '@/components/inline-spinner'
import { trackEvent } from '@/lib/client-track'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Status = 'idle' | 'submitting' | 'success' | 'error'

interface FieldErrors {
    companyName?: string
    contactName?: string
    email?: string
    groupSize?: string
    message?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NAME_MIN = 2
const COMPANY_NAME_MAX = 200
const MESSAGE_MIN = 10
const MESSAGE_MAX = 2000

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validate(
    companyName: string,
    contactName: string,
    email: string,
    groupSize: string,
    message: string,
): FieldErrors {
    const errors: FieldErrors = {}
    if (!companyName.trim() || companyName.trim().length < NAME_MIN) {
        errors.companyName = 'Please enter your company name.'
    } else if (companyName.length > COMPANY_NAME_MAX) {
        errors.companyName = `Company name must be at most ${COMPANY_NAME_MAX} characters.`
    }
    if (!contactName.trim() || contactName.trim().length < NAME_MIN) {
        errors.contactName = 'Please enter your name.'
    }
    if (!email.trim() || !EMAIL_RE.test(email.trim())) {
        errors.email = 'Please enter a valid email address.'
    }
    const size = Number(groupSize)
    if (groupSize.trim() && (isNaN(size) || size < 1)) {
        errors.groupSize = 'Please enter a valid group size (minimum 1).'
    }
    if (message.trim().length > 0 && message.trim().length < MESSAGE_MIN) {
        errors.message = `Message must be at least ${MESSAGE_MIN} characters.`
    } else if (message.length > MESSAGE_MAX) {
        errors.message = `Message must be at most ${MESSAGE_MAX} characters.`
    }
    return errors
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CorporateEnquiryForm() {
    const [companyName, setCompanyName] = useState('')
    const [contactName, setContactName] = useState('')
    const [email, setEmail] = useState('')
    const [groupSize, setGroupSize] = useState('')
    const [preferredMonth, setPreferredMonth] = useState('')
    const [message, setMessage] = useState('')

    const [captchaToken, setCaptchaToken] = useState('')
    const [honeypot, setHoneypot] = useState('')
    const [status, setStatus] = useState<Status>('idle')
    const [serverError, setServerError] = useState('')
    const [errors, setErrors] = useState<FieldErrors>({})
    const [attemptedSubmit, setAttemptedSubmit] = useState(false)

    const inputBase =
        'w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors'
    const inputInvalid = 'border-red-500 focus:ring-red-500/30 focus:border-red-500'
    function cls(invalid: boolean) {
        return invalid ? `${inputBase} ${inputInvalid}` : inputBase
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setAttemptedSubmit(true)

        const v = validate(companyName, contactName, email, groupSize, message)
        setErrors(v)
        if (Object.keys(v).length > 0) return

        setStatus('submitting')
        setServerError('')

        // Build the subject line with company name so the owner's inbox shows
        // context immediately. Server-side sanitizeHeader() handles escaping and
        // truncation — no client-side escapeHtml to avoid double-encoding (e.g.
        // AT&T → AT&amp;amp;T) and length inflation before the MAX_SUBJ check.
        const subject = `Corporate enquiry — ${companyName.trim()}`

        // Compose a structured message body that maps all extra fields into the
        // single `message` field the /api/contact route accepts.
        const extraLines = [
            groupSize.trim() ? `Group size: ${groupSize.trim()}` : '',
            preferredMonth.trim() ? `Preferred month: ${preferredMonth.trim()}` : '',
        ]
            .filter(Boolean)
            .join('\n')

        const fullMessage = [extraLines, message.trim()].filter(Boolean).join('\n\n')

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: contactName.trim(),
                    email: email.trim(),
                    subject,
                    message: fullMessage || 'Corporate team building enquiry.',
                    'cf-turnstile-response': captchaToken,
                    company_url: honeypot,
                }),
            })

            if (res.ok) {
                setStatus('success')
                try {
                    trackEvent('corporate_enquiry_submitted', {
                        has_company_name: companyName.trim().length > 0,
                        has_group_size: groupSize.trim().length > 0,
                    })
                } catch {
                    // Never block the form on analytics failure.
                }
                return
            }

            let serverMsg = ''
            try {
                const body = await res.json()
                if (body && typeof body.error === 'string') serverMsg = body.error
            } catch {
                /* non-JSON */
            }
            setServerError(serverMsg || 'Something went wrong. Please try again.')
            setStatus('error')
        } catch {
            setServerError('Something went wrong. Please try again.')
            setStatus('error')
        }
    }

    if (status === 'success') {
        return (
            <div
                role="status"
                aria-live="polite"
                className="rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center"
            >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-9 w-9 text-primary"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M20 6 9 17l-5-5" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Message sent!</h3>
                <p className="text-muted-foreground">
                    {"We'll get back to you within 48 hours with a tailored corporate package."}
                </p>
            </div>
        )
    }

    const isSubmitting = status === 'submitting'
    // Disable submit until Turnstile resolves (unless the widget is not
    // configured — mirrors the pattern in contact-form.tsx).
    const canSubmit =
        !isSubmitting &&
        (captchaToken.length > 0 || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY === undefined)

    return (
        <form
            noValidate
            aria-label="Corporate team building enquiry form"
            onSubmit={handleSubmit}
            className="space-y-5"
        >
            <HoneypotField name="company_url" value={honeypot} onChange={setHoneypot} />

            {status === 'error' && serverError && (
                <div
                    role="alert"
                    className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
                >
                    {serverError}
                </div>
            )}

            {/* Company name + contact name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                    <label
                        htmlFor="corp-company-name"
                        className="block text-sm font-semibold text-foreground"
                    >
                        Company name
                        <span aria-label="required" className="text-accent ml-0.5">*</span>
                    </label>
                    <input
                        id="corp-company-name"
                        type="text"
                        autoComplete="organization"
                        required
                        maxLength={COMPANY_NAME_MAX}
                        disabled={isSubmitting}
                        value={companyName}
                        onChange={(e) => {
                            setCompanyName(e.target.value)
                            if (attemptedSubmit) setErrors((prev) => ({ ...prev, companyName: undefined }))
                        }}
                        aria-invalid={errors.companyName ? true : undefined}
                        aria-describedby={errors.companyName ? 'corp-company-name-error' : undefined}
                        className={cls(Boolean(errors.companyName))}
                        placeholder="Acme Corp"
                    />
                    {errors.companyName && (
                        <p id="corp-company-name-error" className="text-xs text-red-600">
                            {errors.companyName}
                        </p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <label
                        htmlFor="corp-contact-name"
                        className="block text-sm font-semibold text-foreground"
                    >
                        Your name
                        <span aria-label="required" className="text-accent ml-0.5">*</span>
                    </label>
                    <input
                        id="corp-contact-name"
                        type="text"
                        autoComplete="name"
                        required
                        disabled={isSubmitting}
                        value={contactName}
                        onChange={(e) => {
                            setContactName(e.target.value)
                            if (attemptedSubmit) setErrors((prev) => ({ ...prev, contactName: undefined }))
                        }}
                        aria-invalid={errors.contactName ? true : undefined}
                        aria-describedby={errors.contactName ? 'corp-contact-name-error' : undefined}
                        className={cls(Boolean(errors.contactName))}
                        placeholder="Jane Smith"
                    />
                    {errors.contactName && (
                        <p id="corp-contact-name-error" className="text-xs text-red-600">
                            {errors.contactName}
                        </p>
                    )}
                </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
                <label
                    htmlFor="corp-email"
                    className="block text-sm font-semibold text-foreground"
                >
                    Work email
                    <span aria-label="required" className="text-accent ml-0.5">*</span>
                </label>
                <input
                    id="corp-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    disabled={isSubmitting}
                    value={email}
                    onChange={(e) => {
                        setEmail(e.target.value)
                        if (attemptedSubmit) setErrors((prev) => ({ ...prev, email: undefined }))
                    }}
                    aria-invalid={errors.email ? true : undefined}
                    aria-describedby={errors.email ? 'corp-email-error' : undefined}
                    className={cls(Boolean(errors.email))}
                    placeholder="jane@company.com"
                />
                {errors.email && (
                    <p id="corp-email-error" className="text-xs text-red-600">
                        {errors.email}
                    </p>
                )}
            </div>

            {/* Group size + preferred month */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                    <label
                        htmlFor="corp-group-size"
                        className="block text-sm font-semibold text-foreground"
                    >
                        Group size
                        <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
                    </label>
                    <input
                        id="corp-group-size"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        disabled={isSubmitting}
                        value={groupSize}
                        onChange={(e) => {
                            setGroupSize(e.target.value)
                            if (attemptedSubmit) setErrors((prev) => ({ ...prev, groupSize: undefined }))
                        }}
                        aria-invalid={errors.groupSize ? true : undefined}
                        aria-describedby={errors.groupSize ? 'corp-group-size-error' : undefined}
                        className={cls(Boolean(errors.groupSize))}
                        placeholder="e.g. 20"
                    />
                    {errors.groupSize && (
                        <p id="corp-group-size-error" className="text-xs text-red-600">
                            {errors.groupSize}
                        </p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <label
                        htmlFor="corp-preferred-month"
                        className="block text-sm font-semibold text-foreground"
                    >
                        Preferred month
                        <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
                    </label>
                    <input
                        id="corp-preferred-month"
                        type="text"
                        disabled={isSubmitting}
                        value={preferredMonth}
                        onChange={(e) => setPreferredMonth(e.target.value)}
                        className={inputBase}
                        placeholder="e.g. September 2025"
                    />
                </div>
            </div>

            {/* Message */}
            <div className="space-y-1.5">
                <label
                    htmlFor="corp-message"
                    className="block text-sm font-semibold text-foreground"
                >
                    Message
                    <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
                </label>
                <textarea
                    id="corp-message"
                    rows={4}
                    disabled={isSubmitting}
                    value={message}
                    onChange={(e) => {
                        setMessage(e.target.value)
                        if (attemptedSubmit) setErrors((prev) => ({ ...prev, message: undefined }))
                    }}
                    aria-invalid={errors.message ? true : undefined}
                    aria-describedby={
                        [errors.message ? 'corp-message-error' : null, 'corp-message-count']
                            .filter(Boolean)
                            .join(' ') || undefined
                    }
                    className={`${cls(Boolean(errors.message))} resize-y`}
                    placeholder="Tell us about your team, goals, or any questions you have…"
                    maxLength={MESSAGE_MAX}
                />
                <div className="flex items-start justify-between gap-3">
                    {errors.message ? (
                        <p id="corp-message-error" className="text-xs text-red-600">
                            {errors.message}
                        </p>
                    ) : (
                        <span />
                    )}
                    <p
                        id="corp-message-count"
                        className="text-xs text-muted-foreground mt-1"
                        aria-live="polite"
                    >
                        {message.length}/{MESSAGE_MAX}
                    </p>
                </div>
            </div>

            <TurnstileWidget onToken={setCaptchaToken} className="pt-1" />

            <button
                type="submit"
                disabled={!canSubmit}
                className="w-full bg-accent text-accent-foreground font-semibold py-3 px-6 rounded-lg hover:bg-accent/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
                {isSubmitting ? (
                    <>
                        <InlineSpinner />
                        <span>Sending…</span>
                    </>
                ) : (
                    <span>Send enquiry</span>
                )}
            </button>
        </form>
    )
}
