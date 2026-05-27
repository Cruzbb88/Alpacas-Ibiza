import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildIcs, googleCalendarUrl } from './ics.ts'

describe('buildIcs', () => {
  it('emits a valid VCALENDAR + VEVENT', () => {
    const ics = buildIcs({
      uid: '123@alpacasibiza.com',
      summary: 'Alpaca tour',
      description: 'See you at Es Currals',
      startIso: '2026-07-15T09:00:00Z',
      endIso: '2026-07-15T10:30:00Z',
      location: 'San Carlos, Ibiza',
      organizerEmail: 'info@alpacasibiza.com',
      organizerName: 'Alpacas Ibiza',
    })
    assert.match(ics, /^BEGIN:VCALENDAR\r\n/)
    assert.match(ics, /END:VCALENDAR$/)
    assert.match(ics, /DTSTART:20260715T090000Z/)
    assert.match(ics, /DTEND:20260715T103000Z/)
    assert.match(ics, /SUMMARY:Alpaca tour/)
  })

  it('escapes commas + semicolons in description (RFC 5545)', () => {
    const ics = buildIcs({
      uid: 'x', summary: 'x',
      description: 'a, b; c',
      startIso: '2026-01-01T00:00:00Z',
      location: 'x', organizerEmail: 'x', organizerName: 'x',
    })
    assert.match(ics, /DESCRIPTION:a\\, b\\; c/)
  })

  it('defaults to +1h when endIso is omitted', () => {
    const ics = buildIcs({
      uid: 'x', summary: 'x', description: 'x',
      startIso: '2026-01-01T12:00:00Z',
      location: 'x', organizerEmail: 'x', organizerName: 'x',
    })
    assert.match(ics, /DTSTART:20260101T120000Z/)
    assert.match(ics, /DTEND:20260101T130000Z/)
  })

  it('uses CRLF line endings per RFC 5545', () => {
    const ics = buildIcs({
      uid: 'x', summary: 'x', description: 'x',
      startIso: '2026-01-01T12:00:00Z',
      location: 'x', organizerEmail: 'x', organizerName: 'x',
    })
    assert.ok(ics.includes('\r\n'))
  })

  it('throws on invalid ISO date', () => {
    assert.throws(() => buildIcs({
      uid: 'x', summary: 'x', description: 'x',
      startIso: 'not a date',
      location: 'x', organizerEmail: 'x', organizerName: 'x',
    }))
  })
})

describe('googleCalendarUrl', () => {
  it('produces a calendar.google.com TEMPLATE URL', () => {
    const url = googleCalendarUrl({
      uid: 'x', summary: 'Yoga session', description: 'Hatha yoga',
      startIso: '2026-07-15T09:00:00Z',
      endIso: '2026-07-15T10:15:00Z',
      location: 'Es Currals', organizerEmail: 'x', organizerName: 'x',
    })
    assert.ok(url.startsWith('https://calendar.google.com/calendar/render?'))
    assert.match(url, /text=Yoga\+session/)
    assert.match(url, /dates=20260715T090000Z%2F20260715T101500Z/)
  })
})
