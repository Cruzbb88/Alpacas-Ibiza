import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { formatSlotLocal, madridOffsetMinutes } from './format-slot.ts'

// A 10:00 local tour in SUMMER: Madrid is CEST (UTC+02:00), so 08:00Z.
const SUMMER_10H_UTC = new Date('2026-07-01T08:00:00Z')
// A 10:00 local tour in WINTER: Madrid is CET (UTC+01:00), so 09:00Z.
const WINTER_10H_UTC = new Date('2026-01-15T09:00:00Z')

describe('formatSlotLocal', () => {
  it('renders a SUMMER instant (08:00Z) as 10:00 Madrid wall-clock', () => {
    const slot = formatSlotLocal(SUMMER_10H_UTC)
    assert.equal(slot.time, '10:00')
  })

  it('renders a WINTER instant (09:00Z) as 10:00 Madrid wall-clock', () => {
    const slot = formatSlotLocal(WINTER_10H_UTC)
    assert.equal(slot.time, '10:00')
  })

  it('preserves the original UTC instant in iso (no offset math applied)', () => {
    const slot = formatSlotLocal(SUMMER_10H_UTC)
    assert.equal(slot.iso, '2026-07-01T08:00:00.000Z')
  })

  it('formats the date in Europe/Madrid for the en-GB default locale', () => {
    const slot = formatSlotLocal(SUMMER_10H_UTC)
    // 08:00Z on 1 Jul is still 1 Jul (10:00) in Madrid.
    // (en-GB renders "Wed, 1 Jul 2026" — weekday + day + month + year, comma is ICU-dependent.)
    assert.match(slot.date, /^Wed,? 1 Jul 2026$/)
  })

  it('honours an explicit locale for the date string', () => {
    const slot = formatSlotLocal(SUMMER_10H_UTC, { locale: 'es-ES' })
    // Spanish month abbreviation for July is "jul".
    assert.match(slot.date, /jul/i)
  })

  it('rolls the LOCAL date forward when the UTC instant is the prior evening', () => {
    // 23:30Z on 5 Jul is 01:30 on 6 Jul in Madrid (summer, +02:00).
    const slot = formatSlotLocal(new Date('2026-07-05T23:30:00Z'))
    assert.match(slot.date, /^Mon,? 6 Jul 2026$/)
    assert.equal(slot.time, '01:30')
  })
})

describe('madridOffsetMinutes (DST-aware, not hardcoded)', () => {
  it('returns +120 in summer (CEST, UTC+02:00)', () => {
    assert.equal(madridOffsetMinutes(SUMMER_10H_UTC), 120)
  })

  it('returns +60 in winter (CET, UTC+01:00)', () => {
    assert.equal(madridOffsetMinutes(WINTER_10H_UTC), 60)
  })
})

describe('DST correctness — the core cb-006 F4 check', () => {
  it('the SAME wall-clock local time (10:00) maps to DIFFERENT UTC instants across seasons', () => {
    const summer = formatSlotLocal(SUMMER_10H_UTC)
    const winter = formatSlotLocal(WINTER_10H_UTC)

    // Both display as 10:00 local on each side of the DST change...
    assert.equal(summer.time, '10:00')
    assert.equal(winter.time, '10:00')

    // ...yet the underlying UTC instants differ by exactly the 60-minute
    // DST gap (08:00Z summer vs 09:00Z winter). If this were hardcoded /
    // manual-offset code, both would map to the same UTC hour and this
    // would fail.
    assert.notEqual(summer.iso, winter.iso)
    assert.notEqual(
      madridOffsetMinutes(SUMMER_10H_UTC),
      madridOffsetMinutes(WINTER_10H_UTC),
    )
    assert.equal(
      madridOffsetMinutes(SUMMER_10H_UTC) -
        madridOffsetMinutes(WINTER_10H_UTC),
      60,
    )
  })
})
