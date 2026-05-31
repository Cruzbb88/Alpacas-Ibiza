'use client'

/**
 * CancelFeedbackForm — client component for /[locale]/cancel-feedback.
 *
 * Renders a 4-option radio survey + optional textarea, POSTs to
 * /api/cancel-feedback, then shows a thank-you state with a re-adopt link.
 * Submission is fire-and-forget from the user's perspective — the API always
 * returns 200 so any transport error is silently swallowed and the thank-you
 * state is still shown.
 */

import { useState } from 'react'

type Reason = 'price' | 'forgot' | 'unused' | 'other'

interface CancelFeedbackFormProps {
  locale: string
  labels: Record<Reason, string>
  notesLabel: string
  submitLabel: string
  skipLabel: string
  thankYouMessage: string
  reAdoptLabel: string
}

export function CancelFeedbackForm({
  locale,
  labels,
  notesLabel,
  submitLabel,
  skipLabel,
  thankYouMessage,
  reAdoptLabel,
}: CancelFeedbackFormProps) {
  const [reason, setReason] = useState<Reason | null>(null)
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')

  // Extract ?sub= query param so we can forward customerId to the API.
  function getSubId(): string | undefined {
    if (typeof window === 'undefined') return undefined
    return new URLSearchParams(window.location.search).get('sub') ?? undefined
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!reason) return

    setStatus('loading')
    try {
      await fetch('/api/cancel-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          notes: notes.trim() || undefined,
          customerId: getSubId(),
        }),
      })
    } catch {
      // Fail-quiet — survey is best-effort; we still show the thank-you.
    }
    setStatus('done')
  }

  if (status === 'done') {
    return (
      <div role="status" aria-live="polite" className="flex flex-col gap-6">
        <p className="text-foreground/80">{thankYouMessage}</p>
        <a
          href={`/${locale}/adopt`}
          className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {reAdoptLabel}
        </a>
      </div>
    )
  }

  const reasons: Reason[] = ['price', 'forgot', 'unused', 'other']

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Radio buttons */}
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Reason for cancelling</legend>
        {reasons.map((r) => (
          <label
            key={r}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <input
              type="radio"
              name="reason"
              value={r}
              checked={reason === r}
              onChange={() => setReason(r)}
              disabled={status === 'loading'}
              className="h-4 w-4 accent-primary"
            />
            <span className="text-sm text-foreground group-hover:text-foreground/80">
              {labels[r]}
            </span>
          </label>
        ))}
      </fieldset>

      {/* Optional free-text */}
      <div className="flex flex-col gap-1">
        <label htmlFor="cf-notes" className="text-sm font-medium text-foreground">
          {notesLabel}
        </label>
        <textarea
          id="cf-notes"
          name="notes"
          rows={3}
          maxLength={1000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={status === 'loading'}
          className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="submit"
          disabled={!reason || status === 'loading'}
          className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {status === 'loading' ? 'Sending…' : submitLabel}
        </button>
        <a
          href={`/${locale}/adopt`}
          className="inline-flex items-center justify-center rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          {skipLabel}
        </a>
      </div>
    </form>
  )
}
