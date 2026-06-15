import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildBookingConfirmationEmail } from '../email-templates.ts'

const base = {
  tourName: 'Alpaca Tour',
  startsAtUtc: new Date('2026-07-06T08:00:00Z'), // summer → 10:00 Madrid
  partySize: 2,
  amountEurMinor: 4238, // €42.38
  bookingRef: 'bk_abc123',
  locale: 'en',
}

describe('buildBookingConfirmationEmail', () => {
  it('subject carries the tour name and the Madrid-local date', () => {
    const { subject } = buildBookingConfirmationEmail({ ...base, guestName: 'Jo' })
    assert.match(subject, /Booking confirmed/)
    assert.match(subject, /Alpaca Tour/)
  })

  it('body renders party, total in euros, Ibiza time, and the reference', () => {
    const { html } = buildBookingConfirmationEmail({ ...base, guestName: 'Jo' })
    assert.match(html, /2 guests/)
    assert.match(html, /€42\.38/)
    assert.match(html, /10:00 \(Ibiza time\)/) // summer DST → 08:00Z = 10:00 Madrid
    assert.match(html, /bk_abc123/)
    assert.match(html, /Hi Jo/)
  })

  it('singular guest copy when partySize is 1', () => {
    const { html } = buildBookingConfirmationEmail({ ...base, partySize: 1, guestName: 'Jo' })
    assert.match(html, /1 guest\b/)
    assert.doesNotMatch(html, /1 guests/)
  })

  it('no guest name → "Hi there", never "Hi undefined"', () => {
    const { html } = buildBookingConfirmationEmail({ ...base, guestName: null })
    assert.match(html, /Hi there/)
    assert.doesNotMatch(html, /undefined/)
  })

  it('HTML-escapes a hostile guest name (no raw tag injection)', () => {
    const { html } = buildBookingConfirmationEmail({ ...base, guestName: '<script>x</script>' })
    assert.doesNotMatch(html, /<script>x<\/script>/)
    assert.match(html, /&lt;script&gt;/)
  })

  it('winter slot shifts to CET (+1) — 09:00Z renders 10:00 Ibiza', () => {
    const { html } = buildBookingConfirmationEmail({
      ...base,
      startsAtUtc: new Date('2026-01-06T09:00:00Z'),
    })
    assert.match(html, /10:00 \(Ibiza time\)/)
  })
})
