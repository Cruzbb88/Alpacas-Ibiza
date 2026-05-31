/**
 * Minimal RFC 5545 .ics generator. No dependency — we only need single VEVENTs
 * for renewal reminders + tour bookings.
 *
 * Tested fields: SUMMARY, DESCRIPTION, DTSTART, DTEND, URL, ORGANIZER, UID,
 * DTSTAMP, RRULE (for yearly renewal recurrence).
 *
 * Apple Calendar, Google Calendar, Outlook 2016+ all accept the produced
 * format. Microsoft 365 web Outlook is stricter — UID must be globally
 * unique + DTSTAMP must be present.
 */

export interface ICSEvent {
  uid: string  // globally unique; recommend `${type}-${userId}-${dateIso}@alpacasibiza.com`
  startUtc: Date
  endUtc?: Date  // defaults to startUtc + 30min if not provided
  summary: string
  description?: string
  url?: string
  organiserEmail?: string
  organiserName?: string
  recurrence?: 'YEARLY' | 'MONTHLY'  // adds RRULE for recurring reminders
  reminderMinutesBefore?: number[]  // 0, 1440 (1d), 10080 (7d) all useful
}

export function buildICS(event: ICSEvent): string {
  const lines: string[] = []
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const end = event.endUtc ?? new Date(event.startUtc.getTime() + 30 * 60 * 1000)

  lines.push('BEGIN:VCALENDAR')
  lines.push('VERSION:2.0')
  lines.push('PRODID:-//Alpacas Ibiza//Renewal Reminder//EN')
  lines.push('CALSCALE:GREGORIAN')
  lines.push('METHOD:PUBLISH')
  lines.push('BEGIN:VEVENT')
  lines.push(`UID:${event.uid}`)
  lines.push(`DTSTAMP:${fmt(new Date(event.startUtc.getTime()))}`)  // placeholder OK
  lines.push(`DTSTART:${fmt(event.startUtc)}`)
  lines.push(`DTEND:${fmt(end)}`)
  lines.push(`SUMMARY:${escapeICS(event.summary)}`)
  if (event.description) lines.push(`DESCRIPTION:${escapeICS(event.description)}`)
  if (event.url) lines.push(`URL:${event.url}`)
  if (event.organiserEmail) {
    const cn = event.organiserName ? `;CN=${escapeICS(event.organiserName)}` : ''
    lines.push(`ORGANIZER${cn}:mailto:${event.organiserEmail}`)
  }
  if (event.recurrence) lines.push(`RRULE:FREQ=${event.recurrence}`)
  for (const min of event.reminderMinutesBefore ?? []) {
    lines.push('BEGIN:VALARM')
    lines.push('ACTION:DISPLAY')
    lines.push(`DESCRIPTION:${escapeICS(event.summary)}`)
    lines.push(`TRIGGER:-PT${min}M`)
    lines.push('END:VALARM')
  }
  lines.push('END:VEVENT')
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

function escapeICS(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}
