'use client'

import { useState } from 'react'
import { Gift, Mail, MessageSquare, Check } from 'lucide-react'
import type { Locale } from '@/i18n.config'
import { ConsentNotice } from '@/components/legal/consent-notice'

export type GiftType = 'tour' | 'adoption-monthly' | 'adoption-yearly' | 'shop-credit'

interface GiftFlowCopy {
  /** Section heading. */
  heading: string
  /** Section subheading. */
  subheading: string
  /** Step labels in the stepper indicator. */
  stepGift: string
  stepRecipient: string
  stepMessage: string
  stepReview: string
  /** Gift type card labels — keyed by GiftType. */
  giftTypes: Record<
    GiftType,
    { title: string; price: string; description: string }
  >
  /** "Continue" / "Back" / "Open checkout" button labels. */
  continueLabel: string
  backLabel: string
  checkoutLabel: string
  /** Form field labels. */
  recipientNameLabel: string
  recipientEmailLabel: string
  senderNameLabel: string
  messageLabel: string
  messagePlaceholder: string
  sendDateLabel: string
  sendDateTodayOption: string
  sendDateFutureOption: string
  /** Review screen text. */
  reviewTitle: string
  reviewGiftFor: string
  reviewFrom: string
  reviewSendDate: string
}

interface GiftFlowProps {
  copy: GiftFlowCopy
  /**
   * Active locale, threaded down so the final-step ConsentNotice can link
   * to the correct `/${locale}/terms` and `/${locale}/privacy` pages.
   * Optional for back-compat; defaults to 'en' if not supplied.
   */
  locale?: Locale
  /**
   * Optional override for the verb phrase used in the ConsentNotice on the
   * final step (e.g. "completing your gift"). Caller passes a translated
   * string; falls back to an English default if absent.
   */
  consentActionLabel?: string
  /**
   * Pre-computed checkout URL per gift type. Caller (a server component) builds
   * the map and passes it in — keeps the wizard fully serializable + lets the
   * page decide vendor routing (Stripe for adoption tiers, FareHarbor for
   * tours, mailto fallback for shop-credit until a Stripe SKU is created).
   *
   * The buyer's typed-in name / email / message / send date are not threaded
   * into the URL today (would leak PII into Stripe's success_url + browser
   * history). They reach the owner via the welcome email + dashboard order
   * notes instead.
   */
  checkoutHrefByType: Record<GiftType, string>
}

type Step = 0 | 1 | 2 | 3

/**
 * GiftFlow — 4-step wizard for purchasing an adoption or tour as a gift.
 *
 * Steps:
 *   0. Choose gift type   (Tour / Adoption monthly / Adoption yearly / Shop credit)
 *   1. Recipient + sender (name + email for each)
 *   2. Personal message + send date (today vs scheduled)
 *   3. Review + open checkout
 *
 * Self-contained client state. Caller provides the checkout-href builder so
 * the wizard stays agnostic of how each gift type routes (FareHarbor / Stripe
 * / Mollie / mailto fallback).
 */
export function GiftFlow({
  copy,
  checkoutHrefByType,
  locale = 'en',
  consentActionLabel,
}: GiftFlowProps) {
  const [step, setStep] = useState<Step>(0)
  const [giftType, setGiftType] = useState<GiftType>('tour')
  const [recipientName, setRecipientName] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [senderName, setSenderName] = useState('')
  const [message, setMessage] = useState('')
  const [sendDateMode, setSendDateMode] = useState<'today' | 'future'>('today')
  const [sendDateValue, setSendDateValue] = useState('')

  // Validation: each step has its own gate so the Continue button stays disabled
  // until requirements are met. Email format is a coarse check; the server-side
  // route does the strict validation.
  const canAdvanceFromStep1 =
    recipientName.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(recipientEmail.trim()) &&
    senderName.trim().length > 0
  const canAdvanceFromStep2 =
    (message.trim().length === 0 || message.trim().length >= 2) &&
    (sendDateMode === 'today' || sendDateValue.length > 0)

  // Build the final checkout URL by appending gift recipient fields as query
  // params. Only appended on step 3 (when the user clicks "Open checkout").
  // Truncate message to 500 chars (matches server-side cap).
  const baseHref = checkoutHrefByType[giftType]
  const checkoutHref: string = (() => {
    const params = new URLSearchParams({
      gift_recipient_name: recipientName.trim(),
      gift_recipient_email: recipientEmail.trim(),
      gift_sender_name: senderName.trim(),
      gift_message: message.slice(0, 500),
      ...(sendDateMode === 'future' && sendDateValue
        ? { gift_send_date: sendDateValue }
        : {}),
    })
    const separator = baseHref.includes('?') ? '&' : '?'
    return `${baseHref}${separator}${params.toString()}`
  })()

  // Today's date in YYYY-MM-DD using the buyer's LOCAL timezone for the
  // `min` attribute on the date picker. `toISOString()` returns UTC, which
  // would let a Sydney (+11) buyer select "yesterday" at 09:00 local on the
  // day-boundary, breaking the "schedule for future" UX. en-CA locale formats
  // dates as yyyy-mm-dd, which matches the `<input type="date">` value format.
  const todayIso = new Date().toLocaleDateString('en-CA')

  return (
    <section aria-labelledby="gift-flow-heading" className="w-full max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <span aria-hidden="true" className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
          <Gift className="h-6 w-6" />
        </span>
        <h2 id="gift-flow-heading" className="text-3xl md:text-4xl font-bold text-foreground mb-2">
          {copy.heading}
        </h2>
        <p className="text-foreground/70">{copy.subheading}</p>
      </div>

      {/* Stepper indicator */}
      <ol className="flex items-center justify-center gap-2 mb-10">
        {[copy.stepGift, copy.stepRecipient, copy.stepMessage, copy.stepReview].map((label, i) => {
          const isDone = i < step
          const isCurrent = i === step
          return (
            <li key={i} className="flex items-center gap-2">
              <span
                aria-current={isCurrent ? 'step' : undefined}
                className={
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ' +
                  (isDone
                    ? 'bg-primary text-primary-foreground'
                    : isCurrent
                      ? 'bg-primary/15 text-primary border-2 border-primary'
                      : 'bg-secondary text-foreground/40 border border-border')
                }
              >
                {isDone ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
              </span>
              <span
                className={
                  'hidden sm:inline text-xs font-medium ' +
                  (isCurrent ? 'text-foreground' : 'text-foreground/50')
                }
              >
                {label}
              </span>
              {i < 3 && (
                <span aria-hidden="true" className="hidden sm:inline w-6 h-px bg-border" />
              )}
            </li>
          )
        })}
      </ol>

      {/* Step 0 — gift type */}
      {step === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {(Object.keys(copy.giftTypes) as GiftType[]).map((type) => {
            const data = copy.giftTypes[type]
            const isSelected = giftType === type
            return (
              <button
                key={type}
                type="button"
                onClick={() => setGiftType(type)}
                aria-pressed={isSelected}
                className={
                  'text-left rounded-2xl border-2 p-5 transition-colors ' +
                  (isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:border-primary/40')
                }
              >
                <p className="text-xs uppercase tracking-wider text-foreground/50 mb-1">
                  {data.price}
                </p>
                <p className="text-base font-bold text-foreground mb-1">{data.title}</p>
                <p className="text-sm text-foreground/70">{data.description}</p>
              </button>
            )
          })}
        </div>
      )}

      {/* Step 1 — recipient + sender */}
      {step === 1 && (
        <div className="space-y-4 mb-8">
          <Field
            label={copy.recipientNameLabel}
            id="gift-recipient-name"
            value={recipientName}
            onChange={setRecipientName}
            autoComplete="name"
          />
          <Field
            label={copy.recipientEmailLabel}
            id="gift-recipient-email"
            type="email"
            value={recipientEmail}
            onChange={setRecipientEmail}
            autoComplete="email"
          />
          <Field
            label={copy.senderNameLabel}
            id="gift-sender-name"
            value={senderName}
            onChange={setSenderName}
            autoComplete="name"
          />
        </div>
      )}

      {/* Step 2 — message + send date */}
      {step === 2 && (
        <div className="space-y-5 mb-8">
          <div>
            <label
              htmlFor="gift-message"
              className="block text-sm font-medium text-foreground mb-2"
            >
              <MessageSquare className="inline h-4 w-4 mr-1 align-text-bottom" aria-hidden="true" />
              {copy.messageLabel}
            </label>
            <textarea
              id="gift-message"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={copy.messagePlaceholder}
              maxLength={500}
              className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
            />
            <p className="mt-1 text-xs text-foreground/50 text-right tabular-nums">
              {message.length} / 500
            </p>
          </div>

          <fieldset>
            <legend className="block text-sm font-medium text-foreground mb-2">
              <Mail className="inline h-4 w-4 mr-1 align-text-bottom" aria-hidden="true" />
              {copy.sendDateLabel}
            </legend>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="gift-send-date"
                  value="today"
                  checked={sendDateMode === 'today'}
                  onChange={() => setSendDateMode('today')}
                  className="text-primary focus:ring-primary/50"
                />
                <span className="text-sm text-foreground/85">{copy.sendDateTodayOption}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="gift-send-date"
                  value="future"
                  checked={sendDateMode === 'future'}
                  onChange={() => setSendDateMode('future')}
                  className="text-primary focus:ring-primary/50"
                />
                <span className="text-sm text-foreground/85">{copy.sendDateFutureOption}</span>
              </label>
              {sendDateMode === 'future' && (
                <input
                  type="date"
                  value={sendDateValue}
                  min={todayIso}
                  onChange={(e) => setSendDateValue(e.target.value)}
                  aria-label={copy.sendDateLabel}
                  className="mt-2 block rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              )}
            </div>
          </fieldset>
        </div>
      )}

      {/* Step 3 — review */}
      {step === 3 && (
        <>
          <div className="rounded-2xl border border-border bg-card p-6 mb-4">
            <p className="text-xs uppercase tracking-wider text-foreground/50 mb-1">
              {copy.reviewTitle}
            </p>
            <p className="text-xl font-bold text-foreground mb-4">
              {copy.giftTypes[giftType].title}
            </p>
            <dl className="text-sm space-y-2">
              <Row label={copy.reviewGiftFor}>
                {recipientName} ({recipientEmail})
              </Row>
              <Row label={copy.reviewFrom}>{senderName}</Row>
              <Row label={copy.reviewSendDate}>
                {sendDateMode === 'today' ? copy.sendDateTodayOption : sendDateValue}
              </Row>
              <Row label={copy.messageLabel}>
                <span className="italic text-foreground/80">&ldquo;{message}&rdquo;</span>
              </Row>
            </dl>
          </div>
          {/*
           * GDPR Art. 13 + CAN-SPAM § 5(a): final-step disclosure before the
           * buyer leaves for the processor (Stripe / FareHarbor / mailto).
           * Information only — the checkout click itself is the consent
           * action for this transactional flow.
           */}
          <div className="mb-8">
            <ConsentNotice
              locale={locale}
              actionLabel={consentActionLabel ?? 'completing your gift'}
            />
          </div>
        </>
      )}

      {/* Nav buttons */}
      <div className="flex justify-between items-center gap-3">
        <button
          type="button"
          onClick={() => setStep((s) => (s > 0 ? ((s - 1) as Step) : s))}
          disabled={step === 0}
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-foreground/70 hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {copy.backLabel}
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep((s) => ((s + 1) as Step))}
            disabled={
              (step === 1 && !canAdvanceFromStep1) || (step === 2 && !canAdvanceFromStep2)
            }
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {copy.continueLabel}
          </button>
        ) : (
          <a
            href={checkoutHref}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {copy.checkoutLabel}
          </a>
        )}
      </div>
    </section>
  )
}

function Field({
  label,
  id,
  value,
  onChange,
  type = 'text',
  autoComplete,
}: {
  label: string
  id: string
  value: string
  onChange: (next: string) => void
  type?: 'text' | 'email'
  autoComplete?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground mb-2">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3">
      <dt className="text-foreground/50 text-xs uppercase tracking-wider mt-0.5">{label}</dt>
      <dd className="text-foreground/85">{children}</dd>
    </div>
  )
}
