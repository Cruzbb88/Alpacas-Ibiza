/**
 * Regression tests for vat-tracker.ts fixes shipped in commit 1561178.
 *
 * Pins two bugs that would silently break EU VAT-OSS compliance:
 *   1. Dec 31 → Jan 1 webhook retry must NOT double-count into both years'
 *      cross-border tallies (dedup key dropped year prefix).
 *   2. pruneOldYears must keep EXACTLY 7 calendar years per EU accounting
 *      retention rules (was keeping 8 — off-by-one).
 */
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { recordSale, getYearSnapshot, __resetVatTracker } from './vat-tracker.ts'

describe('vat-tracker — year-boundary dedup', () => {
  beforeEach(() => {
    __resetVatTracker()
  })

  it('a Dec 31 sale followed by a Jan 1 retry of the SAME payment is recorded once', () => {
    const dec31 = Date.UTC(2025, 11, 31, 23, 59, 50) // 10s before year boundary
    const jan1 = Date.UTC(2026, 0, 1, 0, 0, 5)       // 5s after year boundary
    const paymentId = 'tr_year_boundary_xyz'

    recordSale(dec31, 'DE', 7500, paymentId)
    recordSale(jan1, 'DE', 7500, paymentId) // identical attemptId — Mollie retry

    const snap2025 = getYearSnapshot(2025)
    const snap2026 = getYearSnapshot(2026)
    assert.equal(snap2025.crossBorderEurMinor, 7500, '2025 must hold the original sale')
    assert.equal(snap2026.crossBorderEurMinor, 0, '2026 must NOT double-count via the retry')
  })

  it('two genuinely distinct DE payments with different attemptIds both count', () => {
    recordSale(Date.UTC(2026, 0, 1), 'DE', 7500, 'tr_a')
    recordSale(Date.UTC(2026, 0, 1), 'DE', 7500, 'tr_b')

    assert.equal(getYearSnapshot(2026).crossBorderEurMinor, 15000)
  })

  it('domestic Spain sales never count toward cross-border total', () => {
    recordSale(Date.UTC(2026, 5, 1), 'ES', 90000, 'tr_es_yearly')
    const snap = getYearSnapshot(2026)
    assert.equal(snap.domesticEurMinor, 90000)
    assert.equal(snap.crossBorderEurMinor, 0)
  })

  it('non-EU sales are recorded per-country but excluded from both domestic and cross-border', () => {
    recordSale(Date.UTC(2026, 5, 1), 'US', 7500, 'tr_us')
    const snap = getYearSnapshot(2026)
    assert.equal(snap.crossBorderEurMinor, 0)
    assert.equal(snap.domesticEurMinor, 0)
    const usRow = snap.countries.find((c) => c.countryISO2 === 'US')
    assert.ok(usRow, 'US row should be present in countries[]')
    assert.equal(usRow!.totalEurMinor, 7500)
    assert.equal(usRow!.isEu, false)
  })
})

describe('vat-tracker — pruneOldYears (EU 7-year retention)', () => {
  beforeEach(() => {
    __resetVatTracker()
  })

  it('keeps exactly 7 most-recent years; drops the 8th', () => {
    // Record one sale in each of the years 2018..2026 (9 years inclusive).
    // After all sales land, only 2020..2026 (7 years) should survive prune.
    for (let year = 2018; year <= 2026; year++) {
      recordSale(Date.UTC(year, 5, 1), 'DE', 100, `tr_${year}`)
    }

    // 2020..2026 are the 7 most-recent. 2018 + 2019 should be gone.
    assert.equal(getYearSnapshot(2019).crossBorderEurMinor, 0, '2019 must be pruned (8th-oldest)')
    assert.equal(getYearSnapshot(2018).crossBorderEurMinor, 0, '2018 must be pruned (9th-oldest)')
    for (let year = 2020; year <= 2026; year++) {
      assert.equal(
        getYearSnapshot(year).crossBorderEurMinor,
        100,
        `${year} must survive prune (within 7-year window)`,
      )
    }
  })

  it('the exact-equal edge: when currentYear - RETENTION_YEARS + 1 = oldest kept', () => {
    // currentYear = 2026, RETENTION = 7, cutoff = 2020.
    // Year 2020 must SURVIVE (= cutoff), year 2019 must drop (< cutoff).
    recordSale(Date.UTC(2020, 5, 1), 'FR', 500, 'tr_2020_boundary')
    recordSale(Date.UTC(2019, 5, 1), 'FR', 500, 'tr_2019_boundary')
    // Trigger prune by recording in current year.
    recordSale(Date.UTC(2026, 5, 1), 'FR', 1, 'tr_2026_trigger')

    assert.equal(getYearSnapshot(2020).crossBorderEurMinor, 500, 'cutoff year must survive')
    assert.equal(getYearSnapshot(2019).crossBorderEurMinor, 0, 'below-cutoff year must prune')
  })
})

describe('vat-tracker — amount edge cases', () => {
  beforeEach(() => {
    __resetVatTracker()
  })

  it('zero-amount sales are recorded (count increments) without crashing', () => {
    recordSale(Date.UTC(2026, 5, 1), 'FR', 0, 'tr_zero')
    const snap = getYearSnapshot(2026)
    const fr = snap.countries.find((c) => c.countryISO2 === 'FR')
    assert.ok(fr)
    assert.equal(fr!.count, 1)
    assert.equal(fr!.totalEurMinor, 0)
  })

  it('snapshot for a year with no data returns full 10k EUR threshold remaining', () => {
    const snap = getYearSnapshot(2030)
    assert.equal(snap.crossBorderEurMinor, 0)
    assert.equal(snap.ossThresholdRemainingEurMinor, 1_000_000) // 10_000 EUR in cents
    assert.deepEqual(snap.countries, [])
  })
})
