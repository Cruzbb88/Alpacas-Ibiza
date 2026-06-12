'use client'

/**
 * /[locale]/preferences
 *
 * Email preference centre — lets donors manage per-category email opt-outs
 * without unsubscribing from everything.
 *
 * Categories supported by /api/email-preferences:
 *   - birthday   (alpaca birthday cards)
 *   - quarterly  (quarterly update emails)
 *   - renewal    (adoption renewal reminders)
 *
 * The API supports POST /api/email-preferences { token, action, type }.
 * Action 'unsubscribe' opts out of a single category.
 * GET /api/email-preferences validates the token and returns an HTML page —
 * we don't use that here; instead this page is the branded UI.
 *
 * Token is read from the URL query param `?token=<...>&type=<...>` so links
 * in email footers land here pre-populated.
 *
 * "Unsubscribe from all" still routes to /api/newsletter/unsubscribe (existing).
 */

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLocale } from 'next-intl'

type EmailCategory = 'birthday' | 'quarterly' | 'renewal'
type CategoryState = 'idle' | 'loading' | 'done' | 'error'

interface CategoryInfo {
  id: EmailCategory
  label: string
  description: string
}

const CATEGORIES: CategoryInfo[] = [
  {
    id: 'birthday',
    label: 'Alpaca Birthday Cards',
    description: 'A personal note on your adopted alpaca\'s birthday each year.',
  },
  {
    id: 'quarterly',
    label: 'Quarterly Farm Updates',
    description: 'Seasonal news from Es Currals — new arrivals, shearing stories, and farm life.',
  },
  {
    id: 'renewal',
    label: 'Adoption Renewal Reminders',
    description: 'A friendly reminder before your adoption renews each year.',
  },
]

/**
 * "Unsubscribe from everything" button — POSTs to /api/email-preferences for
 * each category (the existing API contract: one POST per type), then redirects
 * to the static confirmation page on success. Fail-quiet per-category: if one
 * POST fails the others still fire and we redirect anyway.
 *
 * Fix 3: replaces the old static <a href="/newsletter/unsubscribed"> link which
 * was a dead link that never invoked the unsubscribe API.
 */
function UnsubscribeAllButton({ token, locale }: { token: string; locale: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleUnsubscribeAll() {
    setLoading(true)
    try {
      // POST to each category in parallel. Fail-quiet: individual failures are
      // swallowed — unsubscribe intent is partially or fully recorded.
      await Promise.allSettled(
        (['birthday', 'quarterly', 'renewal'] as EmailCategory[]).map((type) =>
          fetch('/api/email-preferences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, action: 'unsubscribe', type }),
          }),
        ),
      )
    } catch {
      // Swallow network errors — redirect to confirmation regardless
    }
    // Redirect to the static confirmation page after action
    router.push(`/${locale}/newsletter/unsubscribed`)
  }

  return (
    <button
      type="button"
      onClick={handleUnsubscribeAll}
      disabled={loading}
      className="text-xs text-primary underline hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Unsubscribing…' : 'Unsubscribe from everything'}
    </button>
  )
}

/**
 * Inner component that uses useSearchParams — must live inside a Suspense
 * boundary (Next.js 14+ requirement for client components using useSearchParams).
 */
function PreferencesPageInner() {
  const searchParams = useSearchParams()
  const locale = useLocale()

  const token = searchParams?.get('token') ?? ''
  // Pre-selected type from email link — highlight that category
  const preType = searchParams?.get('type') as EmailCategory | null

  const [states, setStates] = useState<Record<EmailCategory, CategoryState>>({
    birthday: 'idle',
    quarterly: 'idle',
    renewal: 'idle',
  })
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)

  // Validate token on mount using the ?validate=1 endpoint (Fix 5).
  // This path verifies the token without requiring action+type, so a token
  // issued for 'renewal' is not rejected when the URL has no ?type= param.
  // Also returns the token's type so we can highlight the correct category.
  useEffect(() => {
    if (!token) {
      setTokenValid(false)
      setTokenError('No access token provided. Use the link from your email.')
      return
    }

    const ctrl = new AbortController()
    fetch(`/api/email-preferences?token=${encodeURIComponent(token)}&validate=1`, {
      signal: ctrl.signal,
    })
      .then((res) => {
        if (res.status === 400 || res.status === 410) {
          return res.json().then((body: { error?: string }) => {
            setTokenValid(false)
            setTokenError(
              res.status === 410
                ? 'This link has expired. Please use the link from your most recent email.'
                : body?.error ?? 'Invalid access link.',
            )
          })
        }
        // 200 = token valid
        setTokenValid(true)
      })
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return
        // Network error — allow user to try anyway
        setTokenValid(true)
      })
    return () => ctrl.abort()
  }, [token])

  async function handleOptOut(type: EmailCategory) {
    setStates((prev) => ({ ...prev, [type]: 'loading' }))
    try {
      const res = await fetch('/api/email-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action: 'unsubscribe', type }),
      })
      if (res.ok) {
        setStates((prev) => ({ ...prev, [type]: 'done' }))
      } else {
        setStates((prev) => ({ ...prev, [type]: 'error' }))
      }
    } catch {
      setStates((prev) => ({ ...prev, [type]: 'error' }))
    }
  }

  // Loading state — token validation in flight
  if (tokenValid === null) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center px-4">
        <p className="text-foreground/60 text-sm">Validating your access link…</p>
      </main>
    )
  }

  // Invalid / expired token
  if (!tokenValid) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Link not valid</h1>
          <p className="text-foreground/70 text-sm">{tokenError}</p>
          <p className="text-foreground/60 text-xs">
            Links expire after 30 days. Check your most recent email from us for a
            fresh link, or{' '}
            <Link
              href={`/${locale}/contact`}
              className="text-primary underline hover:text-primary/80"
            >
              contact us
            </Link>{' '}
            if you need help.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[60vh] py-16 px-4">
      <div className="max-w-lg mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Email Preferences</h1>
          <p className="text-foreground/70 text-sm">
            Choose which emails you'd like to stop receiving. Each change takes
            effect immediately.
          </p>
        </div>

        <div className="space-y-4">
          {CATEGORIES.map((cat) => {
            const state = states[cat.id]
            const isHighlighted = preType === cat.id
            return (
              <div
                key={cat.id}
                className={
                  'rounded-2xl border p-5 space-y-3 transition-colors ' +
                  (isHighlighted
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border bg-card')
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <h2 className="font-semibold text-foreground">{cat.label}</h2>
                    <p className="text-xs text-foreground/60 leading-relaxed">
                      {cat.description}
                    </p>
                  </div>

                  {state === 'done' ? (
                    <span className="text-xs font-medium text-primary-foreground bg-primary/80 border border-primary/30 rounded-full px-3 py-1 whitespace-nowrap">
                      Opted out
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={state === 'loading'}
                      onClick={() => handleOptOut(cat.id)}
                      className="
                        inline-flex items-center justify-center
                        text-xs font-medium
                        px-3 py-1.5
                        rounded-full
                        border border-border
                        bg-background hover:bg-muted
                        text-foreground/80
                        transition-colors
                        disabled:opacity-50 disabled:cursor-not-allowed
                        whitespace-nowrap
                      "
                    >
                      {state === 'loading' ? 'Saving…' : 'Stop these emails'}
                    </button>
                  )}
                </div>

                {state === 'error' && (
                  <p className="text-xs text-destructive">
                    Something went wrong. Please try again or{' '}
                    <Link
                      href={`/${locale}/contact`}
                      className="underline hover:text-destructive/80"
                    >
                      contact us
                    </Link>
                    .
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <div className="pt-2 border-t border-border text-center space-y-2">
          <p className="text-xs text-foreground/50">
            Want to stop all emails?
          </p>
          <UnsubscribeAllButton token={token} locale={locale} />
        </div>

        <div className="pt-4 text-center">
          <Link
            href={`/${locale}`}
            className="text-sm text-primary underline hover:text-primary/80 transition-colors"
          >
            Done — back to the farm
          </Link>
        </div>
      </div>
    </main>
  )
}

/**
 * Default page export — wraps the inner component in a Suspense boundary.
 * Required by Next.js 14+ for any client component that calls useSearchParams().
 * The fallback shows the same "validating" state the inner component shows while
 * the token-validation fetch is in flight.
 */
export default function PreferencesPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[60vh] flex items-center justify-center px-4">
          <p className="text-foreground/60 text-sm">Loading preferences…</p>
        </main>
      }
    >
      <PreferencesPageInner />
    </Suspense>
  )
}
