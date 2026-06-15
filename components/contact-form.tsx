'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { TurnstileWidget } from '@/components/turnstile-widget'
import { HoneypotField } from '@/components/honeypot-field'
import { InlineSpinner } from '@/components/inline-spinner'
import { useFormDraft } from '@/lib/hooks/use-form-draft'

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The page at app/[locale]/contact/page.tsx passes the `labels` prop. We
 * extend it with optional fields (success/error/consent/subjects/etc.) — each
 * has an inline English fallback so existing call sites keep working without
 * any translation-file churn.
 */
export interface ContactFormLabels {
    name: string
    email: string
    subject: string
    message: string
    send: string
    sending: string
    success: string
    error: string

    // Optional polish — all have English fallbacks below.
    phone?: string
    consent?: string
    privacyLinkText?: string
    successTitle?: string
    successBody?: string
    sendAnother?: string
    errorGeneric?: string
    subjects?: Partial<Record<SubjectKey, string>>
    validation?: Partial<{
        nameRequired: string
        nameTooShort: string
        emailRequired: string
        emailInvalid: string
        messageRequired: string
        messageTooShort: string
        messageTooLong: string
        consentRequired: string
    }>
    /** Privacy policy locale prefix, e.g. "en" — defaults to "en". */
    locale?: string
}

interface ContactFormProps {
    labels: ContactFormLabels
    /**
     * Pre-fill the subject dropdown/field from a ?subject= URL query parameter.
     * Sanitised by the page (200-char cap, HTML stripped) before being passed in.
     * If the value doesn't match a known SubjectKey label it is used verbatim as
     * the initial subject state so any arbitrary string from the URL is honoured.
     * A saved localStorage draft takes precedence (the user's own prior typing wins).
     */
    defaultSubject?: string
}

/* -------------------------------------------------------------------------- */
/*  Subject reasons                                                           */
/* -------------------------------------------------------------------------- */

type SubjectKey = 'general' | 'tour' | 'commission' | 'event' | 'press' | 'other'

const SUBJECT_ORDER: SubjectKey[] = ['general', 'tour', 'commission', 'event', 'press', 'other']

const SUBJECT_DEFAULTS: Record<SubjectKey, string> = {
    general: 'General enquiry',
    tour: 'Tour question',
    commission: 'Commission request',
    event: 'Wedding / event',
    press: 'Press',
    other: 'Other',
}

/* -------------------------------------------------------------------------- */
/*  Validation                                                                */
/* -------------------------------------------------------------------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MESSAGE_MIN = 20
const MESSAGE_MAX = 2000
const NAME_MIN = 2

interface DraftShape extends Record<string, unknown> {
    name: string
    email: string
    subject: string
    phone: string
    message: string
    consent: boolean
}

const INITIAL_DRAFT: DraftShape = {
    name: '',
    email: '',
    subject: SUBJECT_DEFAULTS.general,
    phone: '',
    message: '',
    consent: false,
}

type FieldKey = 'name' | 'email' | 'message' | 'consent'

interface FieldErrors {
    name?: string
    email?: string
    message?: string
    consent?: string
}

function validate(
    form: DraftShape,
    v: NonNullable<ContactFormLabels['validation']>,
): FieldErrors {
    const errors: FieldErrors = {}
    const name = form.name.trim()
    if (!name) errors.name = v.nameRequired || 'Please enter your name.'
    else if (name.length < NAME_MIN) errors.name = v.nameTooShort || 'Name must be at least 2 characters.'

    const email = form.email.trim()
    if (!email) errors.email = v.emailRequired || 'Please enter your email.'
    else if (!EMAIL_RE.test(email)) errors.email = v.emailInvalid || 'Please enter a valid email address.'

    const message = form.message.trim()
    if (!message) errors.message = v.messageRequired || 'Please write a short message.'
    else if (message.length < MESSAGE_MIN)
        errors.message = v.messageTooShort || `Message must be at least ${MESSAGE_MIN} characters.`
    else if (message.length > MESSAGE_MAX)
        errors.message = v.messageTooLong || `Message must be at most ${MESSAGE_MAX} characters.`

    if (!form.consent) errors.consent = v.consentRequired || 'Please agree to the privacy policy.'

    return errors
}

/* -------------------------------------------------------------------------- */
/*  Styling helpers                                                           */
/* -------------------------------------------------------------------------- */

const INPUT_BASE =
    'w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors'
const INPUT_INVALID = 'border-red-500 focus:ring-red-500/30 focus:border-red-500'

function inputCls(invalid: boolean) {
    return invalid ? `${INPUT_BASE} ${INPUT_INVALID}` : INPUT_BASE
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

type Status = 'idle' | 'submitting' | 'success' | 'error'

export function ContactForm({ labels, defaultSubject }: ContactFormProps) {
    const [status, setStatus] = useState<Status>('idle')
    const [serverError, setServerError] = useState<string>('')
    const [submitted, setSubmitted] = useState({
        name: '',
        email: '',
    })

    const initialDraft: DraftShape = defaultSubject
        ? { ...INITIAL_DRAFT, subject: defaultSubject }
        : INITIAL_DRAFT
    const { draft: form, patch, clear } = useFormDraft<DraftShape>('contact', initialDraft)

    // A2: URL-supplied defaultSubject must win over any stale localStorage draft.
    // useFormDraft hydrates from localStorage on mount, which overwrites initialDraft.
    // This effect re-asserts the URL value after hydration whenever defaultSubject changes.
    useEffect(() => {
        if (defaultSubject) {
            patch({ subject: defaultSubject })
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [defaultSubject])

    const [captchaToken, setCaptchaToken] = useState<string>('')
    const [turnstileKey, setTurnstileKey] = useState(0) // bump to force-reset Turnstile after error
    const [honeypot, setHoneypot] = useState('')

    const [errors, setErrors] = useState<FieldErrors>({})
    const [touched, setTouched] = useState<Record<FieldKey, boolean>>({
        name: false,
        email: false,
        message: false,
        consent: false,
    })
    const [attemptedSubmit, setAttemptedSubmit] = useState(false)

    const errorBannerRef = useRef<HTMLDivElement>(null)
    const successHeadingRef = useRef<HTMLHeadingElement>(null)

    const validation = labels.validation || {}
    const subjects = labels.subjects || {}
    const localePrefix = labels.locale || 'en'

    // Re-validate on every keystroke once user has attempted submit so error
    // text updates as they fix issues, but don't bombard users on first focus.
    const liveErrors = useMemo(() => {
        if (!attemptedSubmit) return {}
        return validate(form, validation)
    }, [form, attemptedSubmit, validation])

    useEffect(() => {
        if (attemptedSubmit) setErrors(liveErrors)
    }, [liveErrors, attemptedSubmit])

    // Focus management: when transitioning to success, move focus to the
    // success heading so screen readers announce it.
    useEffect(() => {
        if (status === 'success') {
            successHeadingRef.current?.focus()
        }
    }, [status])

    // When entering error state, focus the banner so it's announced.
    useEffect(() => {
        if (status === 'error') {
            errorBannerRef.current?.focus()
        }
    }, [status, serverError])

    const messageLen = form.message.length
    const messageCountInvalid =
        touched.message && (messageLen > MESSAGE_MAX || (messageLen > 0 && messageLen < MESSAGE_MIN))

    /* ------------------------------------------------------------------ */
    /*  Handlers                                                          */
    /* ------------------------------------------------------------------ */

    function markTouched(field: FieldKey) {
        if (!attemptedSubmit) return // don't validate-on-blur before first submit
        setTouched((t) => ({ ...t, [field]: true }))
        setErrors(validate(form, validation))
    }

    function resetToIdle() {
        setStatus('idle')
        setServerError('')
        setErrors({})
        setTouched({ name: false, email: false, message: false, consent: false })
        setAttemptedSubmit(false)
        setCaptchaToken('')
        setHoneypot('')
        setTurnstileKey((k) => k + 1)
        clear()
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setAttemptedSubmit(true)
        setTouched({ name: true, email: true, message: true, consent: true })

        const v = validate(form, validation)
        setErrors(v)
        if (Object.keys(v).length > 0) {
            return
        }

        setStatus('submitting')
        setServerError('')

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name.trim(),
                    email: form.email.trim(),
                    subject: form.subject,
                    phone: form.phone.trim(),
                    message: form.message.trim(),
                    'cf-turnstile-response': captchaToken,
                    // Server expects `company_url` (lib/honeypot detectHoneypot key
                    // is hardcoded per route — see app/api/contact/route.ts).
                    company_url: honeypot,
                }),
            })

            if (res.ok) {
                setSubmitted({ name: form.name.trim(), email: form.email.trim() })
                setStatus('success')
                clear()
                return
            }

            // Try to extract a useful error message from the JSON body.
            let serverMsg = ''
            try {
                const body = await res.json()
                if (body && typeof body.error === 'string') serverMsg = body.error
            } catch {
                /* non-JSON body */
            }
            setServerError(serverMsg || labels.errorGeneric || labels.error || 'Something went wrong. Please try again.')
            setStatus('error')
            setCaptchaToken('')
            setTurnstileKey((k) => k + 1)
        } catch {
            setServerError(labels.errorGeneric || labels.error || 'Something went wrong. Please try again.')
            setStatus('error')
            setCaptchaToken('')
            setTurnstileKey((k) => k + 1)
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Success card                                                      */
    /* ------------------------------------------------------------------ */

    if (status === 'success') {
        return (
            <div
                className="max-w-2xl mx-auto rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center"
                role="status"
                aria-live="polite"
            >
                <style>{`
                    @keyframes contact-success-pop {
                        0% { transform: scale(0); opacity: 0; }
                        60% { transform: scale(1.15); opacity: 1; }
                        100% { transform: scale(1); opacity: 1; }
                    }
                    @keyframes contact-success-stroke {
                        0% { stroke-dashoffset: 48; }
                        100% { stroke-dashoffset: 0; }
                    }
                `}</style>
                <div
                    className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/15"
                    style={{ animation: 'contact-success-pop 480ms cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
                >
                    <svg
                        viewBox="0 0 52 52"
                        className="h-12 w-12 text-primary"
                        aria-hidden="true"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path
                            d="M14 27 L23 36 L40 18"
                            style={{
                                strokeDasharray: 48,
                                strokeDashoffset: 48,
                                animation: 'contact-success-stroke 420ms ease-out 320ms forwards',
                            }}
                        />
                    </svg>
                </div>

                <h3
                    ref={successHeadingRef}
                    tabIndex={-1}
                    className="text-xl font-bold text-foreground focus:outline-none"
                >
                    {labels.successTitle || labels.success || 'Message sent!'}
                </h3>
                <p className="mt-2 text-muted-foreground">
                    {labels.successBody || "We'll reply within 48 hours."}
                </p>

                <dl className="mt-5 inline-flex flex-col gap-1 text-left text-sm text-foreground/80">
                    <div className="flex gap-2">
                        <dt className="font-semibold">{labels.name}:</dt>
                        <dd>{submitted.name}</dd>
                    </div>
                    <div className="flex gap-2">
                        <dt className="font-semibold">{labels.email}:</dt>
                        <dd className="break-all">{submitted.email}</dd>
                    </div>
                </dl>

                <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
                    <button
                        type="button"
                        onClick={resetToIdle}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
                    >
                        {labels.sendAnother || 'Send another message'}
                    </button>
                    <a
                        href={`/${localePrefix}/tours`}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        Explore tours →
                    </a>
                </div>
            </div>
        )
    }

    /* ------------------------------------------------------------------ */
    /*  Form                                                              */
    /* ------------------------------------------------------------------ */

    const isSubmitting = status === 'submitting'
    const requiredMark = (
        <span aria-label="required" className="text-accent ml-0.5">
            *
        </span>
    )

    return (
        <form
            noValidate
            aria-label="Contact form"
            onSubmit={handleSubmit}
            className="max-w-2xl mx-auto space-y-5"
        >
            <HoneypotField name="company_url" value={honeypot} onChange={setHoneypot} />

            {/* Server error banner */}
            {status === 'error' && (
                <div
                    ref={errorBannerRef}
                    role="alert"
                    tabIndex={-1}
                    className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                >
                    {serverError}
                </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
                <label htmlFor="contact-name" className="block text-sm font-semibold text-foreground">
                    {labels.name}
                    {requiredMark}
                </label>
                <input
                    id="contact-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    disabled={isSubmitting}
                    value={form.name}
                    onChange={(e) => patch({ name: e.target.value })}
                    onBlur={() => markTouched('name')}
                    aria-invalid={errors.name ? true : undefined}
                    aria-describedby={errors.name ? 'contact-name-error' : undefined}
                    className={inputCls(Boolean(errors.name))}
                />
                {errors.name && (
                    <p id="contact-name-error" className="text-xs text-red-600">
                        {errors.name}
                    </p>
                )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
                <label htmlFor="contact-email" className="block text-sm font-semibold text-foreground">
                    {labels.email}
                    {requiredMark}
                </label>
                <input
                    id="contact-email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    disabled={isSubmitting}
                    value={form.email}
                    onChange={(e) => patch({ email: e.target.value })}
                    onBlur={() => markTouched('email')}
                    aria-invalid={errors.email ? true : undefined}
                    aria-describedby={errors.email ? 'contact-email-error' : undefined}
                    className={inputCls(Boolean(errors.email))}
                />
                {errors.email && (
                    <p id="contact-email-error" className="text-xs text-red-600">
                        {errors.email}
                    </p>
                )}
            </div>

            {/* Subject dropdown */}
            <div className="space-y-1.5">
                <label htmlFor="contact-subject" className="block text-sm font-semibold text-foreground">
                    {labels.subject}
                </label>
                <select
                    id="contact-subject"
                    name="subject"
                    disabled={isSubmitting}
                    value={form.subject}
                    onChange={(e) => patch({ subject: e.target.value })}
                    className={`${INPUT_BASE} appearance-none bg-no-repeat pr-10`}
                    style={{
                        backgroundImage:
                            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23666'><path fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.4a.75.75 0 01-1.08 0l-4.25-4.4a.75.75 0 01.02-1.06z' clip-rule='evenodd'/></svg>\")",
                        backgroundPosition: 'right 0.75rem center',
                        backgroundSize: '1.25rem',
                    }}
                >
                    {SUBJECT_ORDER.map((key) => {
                        const label = subjects[key] || SUBJECT_DEFAULTS[key]
                        return (
                            <option key={key} value={label}>
                                {label}
                            </option>
                        )
                    })}
                </select>
            </div>

            {/* Phone (optional) */}
            <div className="space-y-1.5">
                <label htmlFor="contact-phone" className="block text-sm font-semibold text-foreground">
                    {labels.phone || 'Phone'}
                </label>
                <input
                    id="contact-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    disabled={isSubmitting}
                    value={form.phone}
                    onChange={(e) => patch({ phone: e.target.value })}
                    className={INPUT_BASE}
                />
            </div>

            {/* Message */}
            <div className="space-y-1.5">
                <label htmlFor="contact-message" className="block text-sm font-semibold text-foreground">
                    {labels.message}
                    {requiredMark}
                </label>
                <textarea
                    id="contact-message"
                    name="message"
                    rows={6}
                    required
                    disabled={isSubmitting}
                    value={form.message}
                    onChange={(e) => patch({ message: e.target.value })}
                    onBlur={() => markTouched('message')}
                    aria-invalid={errors.message ? true : undefined}
                    aria-describedby={
                        [errors.message ? 'contact-message-error' : null, 'contact-message-count']
                            .filter(Boolean)
                            .join(' ') || undefined
                    }
                    className={`${inputCls(Boolean(errors.message))} resize-y`}
                />
                <div className="flex items-start justify-between gap-3">
                    {errors.message ? (
                        <p id="contact-message-error" className="text-xs text-red-600">
                            {errors.message}
                        </p>
                    ) : (
                        <span />
                    )}
                    <p
                        id="contact-message-count"
                        className={`text-xs mt-1 ${
                            messageCountInvalid ? 'text-red-600' : 'text-muted-foreground'
                        }`}
                        aria-live="polite"
                    >
                        {messageLen}/{MESSAGE_MAX}
                    </p>
                </div>
            </div>

            {/* Turnstile */}
            <TurnstileWidget key={turnstileKey} onToken={setCaptchaToken} className="pt-1" />

            {/* Consent */}
            <div className="space-y-1.5">
                <label htmlFor="contact-consent" className="flex items-start gap-3 text-sm text-foreground cursor-pointer">
                    <input
                        id="contact-consent"
                        name="consent"
                        type="checkbox"
                        required
                        disabled={isSubmitting}
                        checked={form.consent}
                        onChange={(e) => patch({ consent: e.target.checked })}
                        onBlur={() => markTouched('consent')}
                        aria-invalid={errors.consent ? true : undefined}
                        aria-describedby={errors.consent ? 'contact-consent-error' : undefined}
                        className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-2 focus:ring-accent focus:ring-offset-0"
                    />
                    <span>
                        {labels.consent || 'I agree to the'}{' '}
                        <a
                            href={`/${localePrefix}/privacy`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent underline hover:no-underline"
                        >
                            {labels.privacyLinkText || 'privacy policy'}
                        </a>
                        .{requiredMark}
                    </span>
                </label>
                {errors.consent && (
                    <p id="contact-consent-error" className="text-xs text-red-600">
                        {errors.consent}
                    </p>
                )}
            </div>

            {/* Submit */}
            <button
                type="submit"
                disabled={isSubmitting}
                data-analytics-event="contact_form_submit"
                className="w-full bg-accent text-accent-foreground font-semibold py-3 px-6 rounded-lg hover:bg-accent/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
                {isSubmitting ? (
                    <>
                        <InlineSpinner />
                        <span>{labels.sending}</span>
                    </>
                ) : (
                    <span>{labels.send}</span>
                )}
            </button>
        </form>
    )
}
