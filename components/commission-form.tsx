'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { TurnstileWidget } from '@/components/turnstile-widget'
import { HoneypotField } from '@/components/honeypot-field'
import { InlineSpinner } from '@/components/inline-spinner'
import { useFormDraft } from '@/lib/hooks/use-form-draft'
import { useTranslations } from 'next-intl'
import type { Locale } from '@/i18n.config'
import { formatPriceForLocale } from '@/lib/format-price'

/* ----------------------------------------------------------------------------
 * Types & constants
 * ------------------------------------------------------------------------- */

type Status = 'idle' | 'submitting' | 'success' | 'error'

type ProjectType =
    | 'wall_hanging'
    | 'cushion'
    | 'rug'
    | 'throw_blanket'
    | 'bespoke_garment'
    | 'other'

type Timeline = 'flexible' | '1_2_months' | '3_6_months' | 'specific'

interface ProjectTypeOption {
    readonly id: ProjectType
    readonly icon: string
    readonly fallback: string
    readonly key: string
}

const PROJECT_TYPES: ReadonlyArray<ProjectTypeOption> = [
    { id: 'wall_hanging', icon: '🖼️', fallback: 'Wall hanging', key: 'commission.form.projectType.wallHanging' },
    { id: 'cushion', icon: '🛋️', fallback: 'Cushion', key: 'commission.form.projectType.cushion' },
    { id: 'rug', icon: '🟫', fallback: 'Rug', key: 'commission.form.projectType.rug' },
    { id: 'throw_blanket', icon: '🛏️', fallback: 'Throw / Blanket', key: 'commission.form.projectType.throwBlanket' },
    { id: 'bespoke_garment', icon: '🧥', fallback: 'Bespoke garment', key: 'commission.form.projectType.bespokeGarment' },
    { id: 'other', icon: '✨', fallback: 'Other', key: 'commission.form.projectType.other' },
]

const TIMELINES: ReadonlyArray<{ id: Timeline; fallback: string; key: string }> = [
    { id: 'flexible', fallback: 'Flexible', key: 'commission.form.timeline.flexible' },
    { id: '1_2_months', fallback: '1-2 months', key: 'commission.form.timeline.oneTwoMonths' },
    { id: '3_6_months', fallback: '3-6 months', key: 'commission.form.timeline.threeSixMonths' },
    { id: 'specific', fallback: 'Specific date', key: 'commission.form.timeline.specific' },
]

const MAX_REFERENCES = 5
const MAX_MESSAGE = 2000
const MIN_MESSAGE = 20
const MAX_NOTES = 500
const MIN_NAME = 2

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_RE = /^https?:\/\/.+/

/* ----------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */

function bucketFor(value: number): { id: string; labelKey: string; fallback: string } {
    if (value < 500) return { id: 'under500', labelKey: 'commission.form.budget.bucketUnder500', fallback: '<€500' }
    if (value < 1500) return { id: '500_1500', labelKey: 'commission.form.budget.bucket500_1500', fallback: '€500-€1500' }
    if (value < 3000) return { id: '1500_3000', labelKey: 'commission.form.budget.bucket1500_3000', fallback: '€1500-€3000' }
    if (value < 5000) return { id: '3000_5000', labelKey: 'commission.form.budget.bucket3000_5000', fallback: '€3000-€5000' }
    return { id: '5000_plus', labelKey: 'commission.form.budget.bucket5000Plus', fallback: '€5000+' }
}

type FormDraft = {
    name: string
    email: string
    phone: string
    projectType: ProjectType | ''
    size: string
    notes: string
    budget: number
    timeline: Timeline | ''
    specificDate: string
    references: string[]
    message: string
    consent: boolean
} & Record<string, unknown>

const INITIAL_DRAFT: FormDraft = {
    name: '',
    email: '',
    phone: '',
    projectType: '',
    size: '',
    notes: '',
    budget: 1500,
    timeline: '',
    specificDate: '',
    references: [''],
    message: '',
    consent: false,
}

/* ----------------------------------------------------------------------------
 * Props
 * ------------------------------------------------------------------------- */

interface CommissionFormProps {
    /**
     * Preserved labels prop (existing call site at app/[locale]/shop/commission/page.tsx
     * passes this). Used as English fallbacks for the core submit/status strings.
     */
    labels: {
        name: string
        email: string
        description: string
        submit: string
        sending: string
        success: string
        error: string
    }
    /**
     * Optional locale for richer field-level translations via t(locale).
     * Defaults to 'en' so existing call sites that omit it keep working.
     */
    locale?: Locale
    /**
     * When a visitor arrives from a product page (?product=<slug>), the page
     * passes the slug here so the message textarea is pre-filled with a
     * "[Product: <slug>]" prefix, saving the customer a step.
     */
    defaultProductInterest?: string
}

/* ----------------------------------------------------------------------------
 * Component
 * ------------------------------------------------------------------------- */

export function CommissionForm({ labels, locale = 'en', defaultProductInterest }: CommissionFormProps) {
    const tr = useTranslations()
    const text = (key: Parameters<typeof tr>[0], fallback: string) => {
        const value = tr(key)
        return value && value !== key ? value : fallback
    }

    const inputId = useId()
    const successHeadingRef = useRef<HTMLHeadingElement | null>(null)

    const [status, setStatus] = useState<Status>('idle')
    const initialDraft: FormDraft = defaultProductInterest
        ? { ...INITIAL_DRAFT, message: `[Product: ${defaultProductInterest}] ` }
        : INITIAL_DRAFT
    const { draft, patch, clear } = useFormDraft<FormDraft>('commission', initialDraft)
    const [captchaToken, setCaptchaToken] = useState('')
    const [honeypot, setHoneypot] = useState('')
    const [errors, setErrors] = useState<Partial<Record<keyof FormDraft | 'references', string>>>({})
    const [errorMessage, setErrorMessage] = useState('')

    // When a product context is passed via ?product=, enforce the "[Product: ...]"
    // prefix after useFormDraft hydrates from localStorage on mount. Without this,
    // a stale draft message from a previous session overwrites the server-set prefix.
    useEffect(() => {
        if (defaultProductInterest && initialDraft.message) {
            patch({ message: initialDraft.message } as Partial<FormDraft>)
        }
        // Only run once on mount — initialDraft.message is stable for the lifetime
        // of this render (derived from defaultProductInterest which is a prop).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Move focus to success heading once we transition to success.
    useEffect(() => {
        if (status === 'success') {
            successHeadingRef.current?.focus()
        }
    }, [status])

    /* ----- validation ----- */

    function validate(d: FormDraft): Partial<Record<keyof FormDraft | 'references', string>> {
        const e: Partial<Record<keyof FormDraft | 'references', string>> = {}
        if (!d.name || d.name.trim().length < MIN_NAME) {
            e.name = text('commission.form.errors.name', 'Please enter your name (min 2 characters).')
        }
        if (!d.email || !EMAIL_RE.test(d.email)) {
            e.email = text('commission.form.errors.email', 'Please enter a valid email address.')
        }
        if (!d.projectType) {
            e.projectType = text('commission.form.errors.projectType', 'Please choose a project type.')
        }
        if (!d.timeline) {
            e.timeline = text('commission.form.errors.timeline', 'Please choose a timeline.')
        }
        if (d.timeline === 'specific' && !d.specificDate) {
            e.specificDate = text('commission.form.errors.specificDate', 'Please pick a date.')
        }
        if (d.notes && d.notes.length > MAX_NOTES) {
            e.notes = tr('commission.form.errors.notesMax', { max: MAX_NOTES })
        }
        if (!d.message || d.message.trim().length < MIN_MESSAGE) {
            e.message = tr('commission.form.errors.messageMin', { min: MIN_MESSAGE })
        } else if (d.message.length > MAX_MESSAGE) {
            e.message = tr('commission.form.errors.messageMax', { max: MAX_MESSAGE })
        }
        const badRefs = d.references.filter((r) => r.trim() !== '' && !URL_RE.test(r.trim()))
        if (badRefs.length > 0) {
            e.references = text('commission.form.errors.references', 'Reference links must start with http:// or https://.')
        }
        if (!d.consent) {
            e.consent = text('commission.form.errors.consent', 'Please agree to the privacy policy to continue.')
        }
        return e
    }

    /* ----- field updates ----- */

    function update<K extends keyof FormDraft>(key: K, value: FormDraft[K]) {
        patch({ [key]: value } as Partial<FormDraft>)
        if (errors[key]) {
            setErrors((prev) => {
                const next = { ...prev }
                delete next[key]
                return next
            })
        }
    }

    function updateReference(index: number, value: string) {
        const next = [...draft.references]
        next[index] = value
        patch({ references: next })
        if (errors.references) {
            setErrors((prev) => {
                const e = { ...prev }
                delete e.references
                return e
            })
        }
    }

    function addReference() {
        if (draft.references.length >= MAX_REFERENCES) return
        patch({ references: [...draft.references, ''] })
    }

    function removeReference(index: number) {
        const next = draft.references.filter((_, i) => i !== index)
        patch({ references: next.length > 0 ? next : [''] })
    }

    /* ----- submit ----- */

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setErrorMessage('')
        const v = validate(draft)
        setErrors(v)
        if (Object.keys(v).length > 0) return

        setStatus('submitting')
        try {
            const cleanReferences = draft.references.map((r) => r.trim()).filter((r) => r.length > 0)
            const selectedBucket = bucketFor(draft.budget)

            const body = {
                // Preserved API contract (route reads name/email/description):
                name: draft.name.trim(),
                email: draft.email.trim(),
                description: draft.message.trim(),
                // Turnstile + honeypot. Send under both names so the existing
                // server-side check on `phone_extension` still fires while the
                // visible honeypot in the DOM uses the spec-required name.
                'cf-turnstile-response': captchaToken,
                company_url: honeypot,
                phone_extension: honeypot,
                // Augmented structured fields — unknown keys are ignored by
                // the existing route, future-friendly for an API upgrade.
                phone: draft.phone.trim() || undefined,
                project_type: draft.projectType || undefined,
                approximate_size: draft.size.trim() || undefined,
                color_material_notes: draft.notes.trim() || undefined,
                budget_eur: draft.budget,
                budget_bucket: selectedBucket.id,
                timeline: draft.timeline || undefined,
                specific_date: draft.timeline === 'specific' ? draft.specificDate : undefined,
                reference_urls: cleanReferences,
                consent: draft.consent,
                locale,
            }

            const res = await fetch('/api/commission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })

            if (res.ok) {
                setStatus('success')
                clear()
            } else {
                setStatus('error')
                setErrorMessage(labels.error)
            }
        } catch {
            setStatus('error')
            setErrorMessage(labels.error)
        }
    }

    function resetForm() {
        clear()
        setStatus('idle')
        setErrors({})
        setErrorMessage('')
        setCaptchaToken('')
    }

    /* ----- success screen ----- */

    if (status === 'success') {
        return (
            <div
                className="max-w-3xl mx-auto text-center rounded-2xl border border-primary/30 bg-primary/5 p-10 md:p-12"
                role="status"
            >
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
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
                <h2
                    ref={successHeadingRef}
                    tabIndex={-1}
                    className="text-2xl font-bold text-foreground mb-3 outline-none"
                >
                    {text('commission.form.success.heading', 'Thanks!')}
                </h2>
                <p className="text-foreground/80 max-w-xl mx-auto">
                    {text(
                        'commission.form.success.body',
                        "We'll get back to you within 5 working days with a quote and timeline.",
                    )}
                </p>
                <button
                    type="button"
                    onClick={resetForm}
                    className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg border border-input bg-background px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                    {text('commission.form.success.again', 'Submit another inquiry')}
                </button>
            </div>
        )
    }

    /* ----- derived UI bits ----- */

    const bucket = bucketFor(draft.budget)
    const inputClass =
        'w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-colors aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:ring-red-500/30'
    const labelClass = 'block text-sm font-semibold text-foreground mb-1.5'
    const helperClass = 'text-xs text-muted-foreground mt-1'
    const errorClass = 'text-xs text-red-600 mt-1.5'

    /* ----- form ----- */

    return (
        <form
            noValidate
            aria-label={text('commission.form.aria.formLabel', 'Custom commission inquiry')}
            onSubmit={handleSubmit}
            className="max-w-3xl mx-auto space-y-6"
        >
            <HoneypotField name="company_url" value={honeypot} onChange={setHoneypot} />

            {/* Name */}
            <div>
                <label htmlFor={`${inputId}-name`} className={labelClass}>
                    {labels.name}
                    <span className="text-accent" aria-hidden="true"> *</span>
                </label>
                <input
                    id={`${inputId}-name`}
                    type="text"
                    name="name"
                    autoComplete="name"
                    required
                    value={draft.name}
                    onChange={(e) => update('name', e.target.value)}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? `${inputId}-name-err` : undefined}
                    className={inputClass}
                />
                {errors.name && (
                    <p id={`${inputId}-name-err`} className={errorClass}>
                        {errors.name}
                    </p>
                )}
            </div>

            {/* Email + Phone row */}
            <div className="grid gap-6 md:grid-cols-2">
                <div>
                    <label htmlFor={`${inputId}-email`} className={labelClass}>
                        {labels.email}
                        <span className="text-accent" aria-hidden="true"> *</span>
                    </label>
                    <input
                        id={`${inputId}-email`}
                        type="email"
                        name="email"
                        autoComplete="email"
                        inputMode="email"
                        required
                        value={draft.email}
                        onChange={(e) => update('email', e.target.value)}
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? `${inputId}-email-err` : undefined}
                        className={inputClass}
                    />
                    {errors.email && (
                        <p id={`${inputId}-email-err`} className={errorClass}>
                            {errors.email}
                        </p>
                    )}
                </div>
                <div>
                    <label htmlFor={`${inputId}-phone`} className={labelClass}>
                        {text('commission.form.phone', 'Phone')}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                            ({text('commission.form.optional', 'optional')})
                        </span>
                    </label>
                    <input
                        id={`${inputId}-phone`}
                        type="tel"
                        name="phone"
                        autoComplete="tel"
                        inputMode="tel"
                        value={draft.phone}
                        onChange={(e) => update('phone', e.target.value)}
                        className={inputClass}
                    />
                </div>
            </div>

            {/* Project type — visual radio cards */}
            <fieldset>
                <legend className={labelClass}>
                    {text('commission.form.projectTypeLegend', 'Project type')}
                    <span className="text-accent" aria-hidden="true"> *</span>
                </legend>
                <p className={helperClass}>
                    {text('commission.form.projectTypeHelper', 'Pick the closest match — we can refine in the conversation.')}
                </p>
                <div
                    className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3"
                    role="radiogroup"
                    aria-describedby={errors.projectType ? `${inputId}-projecttype-err` : undefined}
                >
                    {PROJECT_TYPES.map((opt) => {
                        const selected = draft.projectType === opt.id
                        return (
                            <label
                                key={opt.id}
                                htmlFor={`${inputId}-pt-${opt.id}`}
                                className={[
                                    'border rounded-xl p-4 cursor-pointer hover:border-accent transition-colors text-center select-none',
                                    'focus-within:ring-2 focus-within:ring-accent/40',
                                    selected
                                        ? 'border-accent bg-accent/5 ring-2 ring-accent/20'
                                        : 'border-input bg-background',
                                ].join(' ')}
                            >
                                <input
                                    id={`${inputId}-pt-${opt.id}`}
                                    type="radio"
                                    name="project_type"
                                    value={opt.id}
                                    checked={selected}
                                    onChange={() => update('projectType', opt.id)}
                                    className="sr-only"
                                />
                                <span className="block text-2xl mb-1.5" aria-hidden="true">
                                    {opt.icon}
                                </span>
                                <span className="block text-sm font-medium text-foreground">
                                    {text(opt.key, opt.fallback)}
                                </span>
                            </label>
                        )
                    })}
                </div>
                {errors.projectType && (
                    <p id={`${inputId}-projecttype-err`} className={errorClass}>
                        {errors.projectType}
                    </p>
                )}
            </fieldset>

            {/* Size */}
            <div>
                <label htmlFor={`${inputId}-size`} className={labelClass}>
                    {text('commission.form.size', 'Approximate size')}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                        ({text('commission.form.optional', 'optional')})
                    </span>
                </label>
                <input
                    id={`${inputId}-size`}
                    type="text"
                    name="approximate_size"
                    placeholder={text('commission.form.sizePlaceholder', 'e.g. 80×120 cm')}
                    value={draft.size}
                    onChange={(e) => update('size', e.target.value)}
                    className={inputClass}
                />
            </div>

            {/* Notes */}
            <div>
                <label htmlFor={`${inputId}-notes`} className={labelClass}>
                    {text('commission.form.notes', 'Color & material notes')}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                        ({text('commission.form.optional', 'optional')})
                    </span>
                </label>
                <textarea
                    id={`${inputId}-notes`}
                    name="color_material_notes"
                    rows={3}
                    maxLength={MAX_NOTES}
                    value={draft.notes}
                    onChange={(e) => update('notes', e.target.value)}
                    placeholder={text(
                        'commission.form.notesPlaceholder',
                        'Tones, yarns, mood — anything that helps us picture the piece.',
                    )}
                    aria-invalid={Boolean(errors.notes)}
                    aria-describedby={`${inputId}-notes-count${errors.notes ? ` ${inputId}-notes-err` : ''}`}
                    className={inputClass}
                />
                <div className="flex items-center justify-between">
                    {errors.notes ? (
                        <p id={`${inputId}-notes-err`} className={errorClass}>
                            {errors.notes}
                        </p>
                    ) : (
                        <span />
                    )}
                    <p id={`${inputId}-notes-count`} className="text-xs text-muted-foreground mt-1">
                        {draft.notes.length}/{MAX_NOTES}
                    </p>
                </div>
            </div>

            {/* Budget slider */}
            <div>
                <label htmlFor={`${inputId}-budget`} className={labelClass}>
                    {text('commission.form.budget.label', 'Budget')}
                </label>
                <p className={helperClass}>
                    {text(
                        'commission.form.budget.helper',
                        'A rough range helps us suggest sizes and materials that fit.',
                    )}
                </p>
                <div className="mt-3 flex items-baseline gap-3" aria-live="polite">
                    <strong className="text-2xl text-accent">{formatPriceForLocale(draft.budget, locale)}</strong>
                    <span className="text-sm text-muted-foreground">
                        {text(bucket.labelKey, bucket.fallback)}
                    </span>
                </div>
                <input
                    id={`${inputId}-budget`}
                    type="range"
                    name="budget_eur"
                    min={100}
                    max={5000}
                    step={50}
                    value={draft.budget}
                    onChange={(e) => update('budget', Number(e.target.value))}
                    aria-valuemin={100}
                    aria-valuemax={5000}
                    aria-valuenow={draft.budget}
                    aria-valuetext={`${formatPriceForLocale(draft.budget, locale)}, ${text(bucket.labelKey, bucket.fallback)}`}
                    className="mt-3 w-full accent-accent cursor-pointer"
                />
                <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                    <span>{formatPriceForLocale(100, locale)}</span>
                    <span>{formatPriceForLocale(1500, locale)}</span>
                    <span>{formatPriceForLocale(3000, locale)}</span>
                    <span>{formatPriceForLocale(5000, locale)}</span>
                </div>
            </div>

            {/* Timeline */}
            <fieldset>
                <legend className={labelClass}>
                    {text('commission.form.timeline.legend', 'Timeline')}
                    <span className="text-accent" aria-hidden="true"> *</span>
                </legend>
                <div
                    className="mt-2 flex flex-wrap gap-2"
                    role="radiogroup"
                    aria-describedby={errors.timeline ? `${inputId}-timeline-err` : undefined}
                >
                    {TIMELINES.map((opt) => {
                        const selected = draft.timeline === opt.id
                        return (
                            <label
                                key={opt.id}
                                htmlFor={`${inputId}-tl-${opt.id}`}
                                className={[
                                    'inline-flex items-center cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors select-none',
                                    'focus-within:ring-2 focus-within:ring-accent/40',
                                    selected
                                        ? 'border-accent bg-accent text-accent-foreground'
                                        : 'border-input bg-background text-foreground hover:border-accent/60',
                                ].join(' ')}
                            >
                                <input
                                    id={`${inputId}-tl-${opt.id}`}
                                    type="radio"
                                    name="timeline"
                                    value={opt.id}
                                    checked={selected}
                                    onChange={() => update('timeline', opt.id)}
                                    className="sr-only"
                                />
                                {text(opt.key, opt.fallback)}
                            </label>
                        )
                    })}
                </div>
                {errors.timeline && (
                    <p id={`${inputId}-timeline-err`} className={errorClass}>
                        {errors.timeline}
                    </p>
                )}

                {/* Reveal date input when "Specific date" selected */}
                <div
                    className={[
                        'overflow-hidden transition-all duration-300 ease-out',
                        draft.timeline === 'specific' ? 'max-h-32 opacity-100 mt-4' : 'max-h-0 opacity-0',
                    ].join(' ')}
                    aria-hidden={draft.timeline !== 'specific'}
                >
                    <label htmlFor={`${inputId}-date`} className={labelClass}>
                        {text('commission.form.timeline.specificDateLabel', 'Target date')}
                    </label>
                    <input
                        id={`${inputId}-date`}
                        type="date"
                        name="specific_date"
                        value={draft.specificDate}
                        onChange={(e) => update('specificDate', e.target.value)}
                        disabled={draft.timeline !== 'specific'}
                        aria-invalid={Boolean(errors.specificDate)}
                        aria-describedby={errors.specificDate ? `${inputId}-date-err` : undefined}
                        className={inputClass + ' max-w-xs'}
                    />
                    {errors.specificDate && (
                        <p id={`${inputId}-date-err`} className={errorClass}>
                            {errors.specificDate}
                        </p>
                    )}
                </div>
            </fieldset>

            {/* Reference URLs */}
            <div>
                <label className={labelClass}>
                    {text('commission.form.references.label', 'Reference images')}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                        ({text('commission.form.optional', 'optional')})
                    </span>
                </label>
                <p className={helperClass}>
                    {text(
                        'commission.form.references.helper',
                        'Paste links to images that inspire you — Pinterest, Instagram, Imgur, etc. Up to 5.',
                    )}
                </p>
                <div className="mt-3 space-y-2">
                    {draft.references.map((url, i) => (
                        <div key={i} className="flex gap-2">
                            <input
                                type="url"
                                inputMode="url"
                                value={url}
                                onChange={(e) => updateReference(i, e.target.value)}
                                placeholder="https://…"
                                aria-label={text('commission.form.references.itemAria', 'Reference link') + ` ${i + 1}`}
                                aria-invalid={Boolean(errors.references) && url.trim() !== '' && !URL_RE.test(url.trim())}
                                className={inputClass + ' flex-1'}
                            />
                            {draft.references.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeReference(i)}
                                    aria-label={text('commission.form.references.remove', 'Remove reference')}
                                    className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-input bg-background text-muted-foreground hover:border-red-400 hover:text-red-600 transition-colors"
                                >
                                    <span aria-hidden="true" className="text-lg leading-none">×</span>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                {errors.references && (
                    <p className={errorClass}>{errors.references}</p>
                )}
                {draft.references.length < MAX_REFERENCES && (
                    <button
                        type="button"
                        onClick={addReference}
                        className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent/80 transition-colors"
                    >
                        <span aria-hidden="true" className="text-base leading-none">+</span>
                        {text('commission.form.references.add', 'Add another reference')}
                    </button>
                )}
            </div>

            {/* Message */}
            <div>
                <label htmlFor={`${inputId}-message`} className={labelClass}>
                    {text('commission.form.message.label', 'Tell us about the piece')}
                    <span className="text-accent" aria-hidden="true"> *</span>
                </label>
                <p className={helperClass}>
                    {text(
                        'commission.form.message.helper',
                        'The story, the room, the recipient — anything that helps us weave the right piece for you.',
                    )}
                </p>
                <textarea
                    id={`${inputId}-message`}
                    name="description"
                    rows={6}
                    required
                    minLength={MIN_MESSAGE}
                    maxLength={MAX_MESSAGE}
                    value={draft.message}
                    onChange={(e) => update('message', e.target.value)}
                    aria-invalid={Boolean(errors.message)}
                    aria-describedby={`${inputId}-message-count${errors.message ? ` ${inputId}-message-err` : ''}`}
                    className={inputClass + ' mt-2'}
                />
                <div className="flex items-center justify-between">
                    {errors.message ? (
                        <p id={`${inputId}-message-err`} className={errorClass}>
                            {errors.message}
                        </p>
                    ) : (
                        <span />
                    )}
                    <p id={`${inputId}-message-count`} className="text-xs text-muted-foreground mt-1">
                        {draft.message.length}/{MAX_MESSAGE}
                    </p>
                </div>
            </div>

            {/* Consent */}
            <div>
                <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        name="consent"
                        checked={draft.consent}
                        onChange={(e) => update('consent', e.target.checked)}
                        aria-invalid={Boolean(errors.consent)}
                        aria-describedby={errors.consent ? `${inputId}-consent-err` : undefined}
                        className="mt-0.5 h-4 w-4 rounded border-input accent-accent focus:ring-2 focus:ring-accent/40"
                    />
                    <span className="text-sm text-foreground/80">
                        {text('commission.form.consent', 'I agree to the privacy policy')}
                        <span className="text-accent" aria-hidden="true"> *</span>
                    </span>
                </label>
                {errors.consent && (
                    <p id={`${inputId}-consent-err`} className={errorClass}>
                        {errors.consent}
                    </p>
                )}
            </div>

            <TurnstileWidget onToken={setCaptchaToken} className="pt-2" />

            {status === 'error' && errorMessage && (
                <div
                    role="alert"
                    className="rounded-lg border border-red-300 bg-red-50 text-red-800 px-4 py-3 text-sm"
                >
                    {errorMessage}
                </div>
            )}

            <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full bg-accent text-accent-foreground font-semibold py-3 px-6 rounded-lg hover:bg-accent/90 active:scale-[0.98] transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
                {status === 'submitting' ? (
                    <>
                        <InlineSpinner />
                        <span>{labels.sending}</span>
                    </>
                ) : (
                    <span>{labels.submit}</span>
                )}
            </button>
        </form>
    )
}
