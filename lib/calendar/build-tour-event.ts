/**
 * Build a calendar event for a FareHarbor tour booking.
 *
 * No route yet — wired in when the FareHarbor webhook delivers booking
 * confirmation events. This library piece is decoupled from the route so the
 * next cycle can wire it without touching this function.
 */

import type { ICSEvent } from './ics'

export interface TourBookingEventOpts {
  /** Attendee name (for UID generation — not included in the event itself). */
  name: string
  tourTitle: string
  startUtc: Date
  durationMin: number
}

export function buildTourBookingEvent(opts: TourBookingEventOpts): ICSEvent {
  const { name, tourTitle, startUtc, durationMin } = opts
  const endUtc = new Date(startUtc.getTime() + durationMin * 60 * 1000)

  // UID: deterministic on name + tour + start so duplicate webhooks produce the
  // same event rather than creating duplicates in the calendar.
  const dateIso = startUtc.toISOString().slice(0, 10)
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '')
  const uid = `tour-${slug}-${dateIso}@alpacasibiza.com`

  return {
    uid,
    startUtc,
    endUtc,
    summary: `${tourTitle} — Alpacas Ibiza`,
    description: `Your tour "${tourTitle}" at Es Currals alpaca farm, Ibiza. We look forward to seeing you!`,
    url: 'https://alpacasibiza.com',
    organiserEmail: 'info@alpacasibiza.com',
    organiserName: 'Alpacas Ibiza',
    // 1-day-before + 2-hour-before reminders for tour bookings.
    reminderMinutesBefore: [1440, 120],
  }
}
