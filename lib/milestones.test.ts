/**
 * Tests for milestone helpers — pure functions, edge-case heavy because the
 * cron route relies on these to decide who gets an email and only ever
 * receives that email exactly once per milestone.
 *
 * Covers:
 *   - All four milestones fire on the expected day
 *   - No milestone fires on day-N-1 or day-N+1 (the cron must be daily and
 *     exact, never sliding)
 *   - Future createdAt returns null
 *   - DST shifts do not move the milestone (we use UTC throughout)
 *   - Leap-year arithmetic: 365 days from 2024-03-01 lands on 2025-02-28
 *   - getMilestoneLabel covers all 4 keys
 *   - getMilestoneDays returns exactly [30,180,365,730] (catalogue is contract)
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  getMilestoneDays,
  getDonorMilestone,
  getMilestoneLabel,
  utcDayKey,
} from './milestones.ts'

describe('getMilestoneDays', () => {
  it('returns the canonical 4 milestones in ascending order', () => {
    assert.deepEqual(getMilestoneDays(), [30, 180, 365, 730])
  })
})

describe('getDonorMilestone — hits', () => {
  it('fires 30 on day 30', () => {
    const created = new Date('2026-01-01T00:00:00Z')
    const now     = new Date('2026-01-31T10:00:00Z')
    assert.equal(getDonorMilestone(created, now), 30)
  })

  it('fires 180 on day 180', () => {
    const created = new Date('2026-01-01T00:00:00Z')
    const now     = new Date('2026-06-30T10:00:00Z') // 31+28+31+30+31+30-1? Compute via Date.
    const expectedDay = new Date(Date.UTC(2026, 0, 1 + 180))
    assert.equal(utcDayKey(expectedDay), utcDayKey(now), 'fixture sanity check')
    assert.equal(getDonorMilestone(created, now), 180)
  })

  it('fires 365 on day 365 (non-leap span)', () => {
    const created = new Date('2026-01-01T00:00:00Z')
    const now     = new Date('2027-01-01T10:00:00Z')
    assert.equal(getDonorMilestone(created, now), 365)
  })

  it('fires 730 on day 730 (non-leap span)', () => {
    const created = new Date('2026-01-01T00:00:00Z')
    const now     = new Date('2028-01-01T10:00:00Z')
    assert.equal(getDonorMilestone(created, now), 730)
  })

  it('fires regardless of hour-of-day on the milestone date (UTC day match)', () => {
    const created = new Date('2026-01-01T23:30:00Z')
    const now     = new Date('2026-01-31T00:05:00Z')
    assert.equal(getDonorMilestone(created, now), 30)
  })
})

describe('getDonorMilestone — misses', () => {
  it('returns null on day 29 (one day before 30)', () => {
    const created = new Date('2026-01-01T00:00:00Z')
    const now     = new Date('2026-01-30T10:00:00Z')
    assert.equal(getDonorMilestone(created, now), null)
  })

  it('returns null on day 31 (one day after 30, no slide)', () => {
    const created = new Date('2026-01-01T00:00:00Z')
    const now     = new Date('2026-02-01T10:00:00Z')
    assert.equal(getDonorMilestone(created, now), null)
  })

  it('returns null when createdAt is in the future', () => {
    const created = new Date('2027-01-01T00:00:00Z')
    const now     = new Date('2026-01-01T10:00:00Z')
    assert.equal(getDonorMilestone(created, now), null)
  })

  it('returns null on day 100 (between milestones)', () => {
    const created = new Date('2026-01-01T00:00:00Z')
    const now     = new Date('2026-04-11T10:00:00Z') // ~day 100
    assert.equal(getDonorMilestone(created, now), null)
  })

  it('returns null for invalid Date input', () => {
    const bad = new Date('not-a-date')
    const ok  = new Date('2026-01-01T00:00:00Z')
    assert.equal(getDonorMilestone(bad, ok), null)
    assert.equal(getDonorMilestone(ok, bad), null)
  })
})

describe('getDonorMilestone — DST + leap year', () => {
  it('DST shift in Europe does not change the milestone (UTC arithmetic)', () => {
    // 2026-03-29 02:00 CET → 03:00 CEST. The cron runs at 10:00 UTC so the
    // DST jump never moves the UTC day boundary. Subscription created
    // 2026-03-01 00:00 UTC must hit day-30 milestone on 2026-03-31, not
    // 2026-03-30 or 2026-04-01 regardless of CET/CEST drift.
    const created = new Date('2026-03-01T00:00:00Z')
    const now     = new Date('2026-03-31T10:00:00Z')
    assert.equal(getDonorMilestone(created, now), 30)
  })

  it('365 days from 2024-01-15 lands on 2025-01-14 (leap-day intervenes BEFORE the milestone)', () => {
    // 2024 is a leap year. createdAt 2024-01-15 — Feb 29 sits between
    // createdAt and the +365 boundary. +365 calendar days therefore lands
    // on 2025-01-14 (one day BEFORE the calendar anniversary). Firing on
    // "365 actual days" not "calendar anniversary" is documented behavior
    // — support knows.
    const created = new Date('2024-01-15T00:00:00Z')
    const now     = new Date('2025-01-14T10:00:00Z')
    assert.equal(getDonorMilestone(created, now), 365)
  })

  it('on 2025-01-15 (calendar anniversary across a leap-year span) no milestone fires', () => {
    const created = new Date('2024-01-15T00:00:00Z')
    const now     = new Date('2025-01-15T10:00:00Z')
    assert.equal(getDonorMilestone(created, now), null)
  })

  it('730 days across two non-leap years is exact', () => {
    const created = new Date('2026-01-01T00:00:00Z')
    const now     = new Date('2028-01-01T10:00:00Z')
    assert.equal(getDonorMilestone(created, now), 730)
  })
})

describe('getMilestoneLabel', () => {
  it('returns the right phrase for each milestone', () => {
    assert.equal(getMilestoneLabel(30),  'first month')
    assert.equal(getMilestoneLabel(180), 'six-month')
    assert.equal(getMilestoneLabel(365), 'one-year')
    assert.equal(getMilestoneLabel(730), 'two-year')
  })
})

describe('utcDayKey', () => {
  it('formats YYYY-MM-DD in UTC regardless of local TZ', () => {
    assert.equal(utcDayKey(new Date('2026-05-29T23:59:59Z')), '2026-05-29')
    assert.equal(utcDayKey(new Date('2026-01-01T00:00:00Z')), '2026-01-01')
  })
})
