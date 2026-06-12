/**
 * /[locale]/tour-confirmation — Tour booking confirmation with calendar links.
 *
 * FareHarbor controls checkout; this page is the post-booking return target.
 * Set as your FareHarbor return URL: https://alpacasibiza.com/[locale]/tour-confirmation
 *
 * Accepts query params from FareHarbor (or a manual deep-link):
 *   - date      : ISO 8601 date or datetime (e.g. "2026-08-15" or "2026-08-15T10:00:00Z")
 *   - summary   : optional human-readable title (defaults to "Alpaca tour at Es Currals")
 *   - duration  : optional duration in minutes (defaults to 60)
 *   - bookingId : optional FareHarbor booking reference — used to construct a stable UID
 *
 * If no `date` param is present, the calendar section is hidden and only the
 * confirmation copy is shown (safe degradation for accidental direct visits).
 *
 * ICS download: served by /api/tour-ics with the same query params.
 * Google Calendar deeplink: built client-side via googleCalendarUrl() logic.
 *
 * Server component — no 'use client' needed for the download link.
 *
 * Colors via CSS tokens only — no hex codes. Owner controls palette via globals.css.
 * Google Calendar button uses a secondary-outlined style rather than Google blue
 * because no `--google-blue` token exists and the branding dep is not worth a new token.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n.config'
import { googleCalendarUrl, TOUR_ICS_DEFAULTS } from '@/lib/ics'
import { SITE_BASE_URL, ADOPT_PRICE_MONTHLY_EUR, ADOPT_PRICE_YEARLY_EUR } from '@/lib/config'

export const metadata: Metadata = {
  title: 'Tour confirmed — Alpacas Ibiza',
  robots: { index: false, follow: false },
}

const { summary: DEFAULT_SUMMARY, durationMin: DEFAULT_DURATION_MIN, location: LOCATION,
  organizerEmail: ORGANIZER_EMAIL, organizerName: ORGANIZER_NAME } = TOUR_ICS_DEFAULTS

function buildIcsDownloadUrl(params: URLSearchParams): string {
  return `/api/tour-ics?${params.toString()}`
}

export default async function TourConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { locale } = await params
  const sp = await searchParams
  const t = await getTranslations({ locale, namespace: 'tourConfirmation.crossSell' })

  const rawDate = typeof sp.date === 'string' ? sp.date.trim() : null
  const rawSummary = typeof sp.summary === 'string' ? sp.summary.trim() : null
  const rawDuration = typeof sp.duration === 'string' ? parseInt(sp.duration, 10) : null
  const bookingId = typeof sp.bookingId === 'string' ? sp.bookingId.replace(/[^A-Za-z0-9_-]/g, '') : null

  const summary = rawSummary || DEFAULT_SUMMARY
  const durationMin = (rawDuration && rawDuration > 0 && rawDuration <= 480) ? rawDuration : DEFAULT_DURATION_MIN

  // Validate date — only proceed if we have a parseable ISO date/datetime.
  let startIso: string | null = null
  let endIso: string | null = null
  let humanDate: string | null = null
  if (rawDate) {
    try {
      const start = new Date(rawDate)
      if (!isNaN(start.getTime())) {
        startIso = start.toISOString()
        endIso = new Date(start.getTime() + durationMin * 60 * 1000).toISOString()
        humanDate = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' })
      }
    } catch {
      // malformed date — skip calendar section
    }
  }

  // ICS download URL — passes params to /api/tour-ics
  const icsParams = new URLSearchParams()
  if (startIso) icsParams.set('date', startIso)
  if (summary !== DEFAULT_SUMMARY) icsParams.set('summary', summary)
  if (durationMin !== DEFAULT_DURATION_MIN) icsParams.set('duration', String(durationMin))
  if (bookingId) icsParams.set('bookingId', bookingId)

  // Google Calendar deep link — built via googleCalendarUrl() from lib/ics.ts
  const gcalUrl = startIso
    ? googleCalendarUrl({
        uid: bookingId ? `tour-${bookingId}@alpacasibiza.com` : `tour-${Date.now()}@alpacasibiza.com`,
        summary,
        description: `Your tour booking at Es Currals Alpacas Ibiza. Questions? Email ${ORGANIZER_EMAIL}`,
        startIso,
        endIso: endIso ?? undefined,
        location: LOCATION,
        organizerEmail: ORGANIZER_EMAIL,
        organizerName: ORGANIZER_NAME,
      })
    : null

  return (
    <main className="min-h-[60vh] py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Confirmation header */}
        <div className="text-center space-y-3">
          <div className="text-6xl" aria-hidden="true">🦙</div>
          <h1 className="text-3xl font-bold text-primary">
            You&apos;re all set!
          </h1>
          <p className="text-base text-foreground/70">
            Your alpaca farm experience at Es Currals is confirmed.
            {humanDate && (
              <> We look forward to seeing you on <strong className="text-foreground">{humanDate}</strong>.</>
            )}
          </p>
        </div>

        {/* Add-to-calendar section — only shown when a valid date was supplied */}
        {startIso && (
          <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6 space-y-4">
            <h2 className="text-base font-semibold text-primary">
              Add to your calendar
            </h2>
            <div className="flex flex-wrap gap-3">
              {/* ICS download — works for Apple Calendar, Outlook, and any RFC 5545 app */}
              <a
                href={buildIcsDownloadUrl(icsParams)}
                download="alpaca-tour.ics"
                className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                <span aria-hidden="true">📅</span>
                Download .ics
              </a>
              {/* Google Calendar deep link — secondary outlined style; no google-blue token exists */}
              {gcalUrl && (
                <a
                  href={gcalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card text-foreground px-5 py-2.5 text-sm font-semibold hover:bg-muted transition-colors"
                >
                  <span aria-hidden="true">📆</span>
                  Google Calendar
                </a>
              )}
            </div>
            <p className="text-xs text-foreground/50">
              .ics works with Apple Calendar, Outlook, and most calendar apps.
            </p>
          </section>
        )}

        {/* What to bring */}
        <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            What to bring
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-foreground/70 leading-relaxed">
            <li>Comfortable walking shoes (light trail surface)</li>
            <li>Weather-appropriate clothing — the farm is outdoors</li>
            <li>Sunscreen and a hat (summer visits)</li>
            <li>Camera or phone for photos</li>
            <li>Your confirmation email or booking reference</li>
          </ul>
        </section>

        {/* Next-step CTAs — directions and home */}
        <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            Getting to the farm
          </h2>
          <p className="text-sm text-foreground/70">
            We&apos;re at Es Currals, San Carlos, Ibiza. Find parking, directions, and accessibility info on our visit page.
          </p>
          <Link
            href={`/${locale}/visit`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline hover:text-primary/80 transition-colors"
          >
            Directions &amp; how to find us →
          </Link>
        </section>

        {/* What's next — cross-sell */}
        <section aria-label="What's next" className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">What&apos;s next?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Card 1: Adopt */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3 flex flex-col">
              <h3 className="text-base font-semibold text-foreground">{t('adoptHeading')}</h3>
              <p className="text-sm text-foreground/70 flex-1">{t('adoptBody')}</p>
              <p className="text-xs font-medium text-primary">
                €{ADOPT_PRICE_MONTHLY_EUR}/month or €{ADOPT_PRICE_YEARLY_EUR}/year
              </p>
              <Link
                href={`/${locale}/adopt`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors self-start"
              >
                {t('adoptCta')}
              </Link>
            </div>

            {/* Card 2: Meet the herd */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3 flex flex-col">
              <h3 className="text-base font-semibold text-foreground">{t('herdHeading')}</h3>
              <p className="text-sm text-foreground/70 flex-1">{t('herdBody')}</p>
              <Link
                href={`/${locale}/alpacas`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card text-foreground px-5 py-2.5 text-sm font-semibold hover:bg-muted transition-colors self-start"
              >
                {t('herdCta')}
              </Link>
            </div>

          </div>
        </section>

        {/* Navigation back */}
        <div className="text-center">
          <Link
            href={`/${locale}`}
            className="text-sm text-primary underline hover:text-primary/80 transition-colors"
          >
            Back to Alpacas Ibiza
          </Link>
        </div>

      </div>
    </main>
  )
}
