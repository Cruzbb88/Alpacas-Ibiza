/**
 * RFC 5545 (iCalendar) generator — minimal subset for booking confirmations.
 *
 * Produces a VEVENT with: DTSTAMP, DTSTART, DTEND, SUMMARY, DESCRIPTION,
 * LOCATION, UID, ORGANIZER. No timezone DB needed — uses UTC throughout
 * (DTSTART:20260615T090000Z form).
 *
 * Pure function. No deps.
 */

export interface IcsEventInput {
  /** Stable unique ID for the event — use booking pk + "@alpacasibiza.com" */
  uid: string
  /** Event title — e.g. "Alpaca tour at Es Currals" */
  summary: string
  description: string
  /** ISO 8601 timestamps. End optional — defaults to start + 1h. */
  startIso: string
  endIso?: string
  /** Free-form physical location. */
  location: string
  /** Email used in ORGANIZER field. */
  organizerEmail: string
  organizerName: string
}

function escapeIcs(s: string): string {
  // RFC 5545 §3.3.11: backslash-escape these chars + collapse newlines to \n
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
}

function toIcsDate(iso: string): string {
  // 2026-06-15T09:00:00.000Z → 20260615T090000Z
  const d = new Date(iso)
  if (isNaN(d.getTime())) throw new Error(`invalid ISO date: ${iso}`)
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) + 'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) + 'Z'
  )
}

export function buildIcs(input: IcsEventInput): string {
  const start = new Date(input.startIso)
  const end = input.endIso
    ? new Date(input.endIso)
    : new Date(start.getTime() + 60 * 60 * 1000)  // default +1h

  const dtstamp = toIcsDate(new Date().toISOString())
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Alpacas Ibiza//Booking Reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcs(input.uid)}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${toIcsDate(start.toISOString())}`,
    `DTEND:${toIcsDate(end.toISOString())}`,
    `SUMMARY:${escapeIcs(input.summary)}`,
    `DESCRIPTION:${escapeIcs(input.description)}`,
    `LOCATION:${escapeIcs(input.location)}`,
    `ORGANIZER;CN=${escapeIcs(input.organizerName)}:mailto:${escapeIcs(input.organizerEmail)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')  // RFC 5545 line ending
}

/**
 * Shared defaults for tour booking ICS events — used by /api/tour-ics and
 * /[locale]/tour-confirmation to avoid drift between the API and the page.
 */
export const TOUR_ICS_DEFAULTS = {
  summary: 'Alpaca tour at Es Currals',
  durationMin: 60,
  location: 'Es Currals, San Carlos, Ibiza, Spain',
  organizerEmail: 'info@alpacasibiza.com',
  organizerName: 'Alpacas Ibiza',
} as const

/**
 * Google Calendar "Add to Calendar" deep link — works in every browser as a fallback.
 * Use when an attachment can't be sent (e.g. plain-text email).
 */
export function googleCalendarUrl(input: IcsEventInput): string {
  const params = new URLSearchParams()
  params.set('action', 'TEMPLATE')
  params.set('text', input.summary)
  params.set('details', input.description)
  params.set('location', input.location)
  const endIso = input.endIso ?? new Date(new Date(input.startIso).getTime() + 60 * 60 * 1000).toISOString()
  params.set('dates', `${toIcsDate(input.startIso)}/${toIcsDate(endIso)}`)
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
