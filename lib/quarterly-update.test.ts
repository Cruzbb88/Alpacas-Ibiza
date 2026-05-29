/**
 * Pins the quarter-label derivation contract for /api/adopt-quarterly-update.
 *
 * The Vercel cron fires `0 9 1 1,4,7,10 *` — Jan 1 / Apr 1 / Jul 1 / Oct 1
 * at 09:00 UTC. Each of those four firings MUST land in the matching quarter
 * label, otherwise donors receive a "Q3 2026" email in October because the
 * runner's local timezone rolled the date over. Anchored to getUTCMonth().
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getQuarterLabel } from './quarterly-update.ts'
import { buildAdoptQuarterlyUpdateEmail } from './email-templates.ts'

describe('getQuarterLabel', () => {
    it('Jan 1 09:00 UTC → "Q1 YYYY"', () => {
        assert.equal(getQuarterLabel(new Date('2026-01-01T09:00:00Z')), 'Q1 2026')
    })

    it('Apr 1 09:00 UTC → "Q2 YYYY"', () => {
        assert.equal(getQuarterLabel(new Date('2026-04-01T09:00:00Z')), 'Q2 2026')
    })

    it('Jul 1 09:00 UTC → "Q3 YYYY"', () => {
        assert.equal(getQuarterLabel(new Date('2026-07-01T09:00:00Z')), 'Q3 2026')
    })

    it('Oct 1 09:00 UTC → "Q4 YYYY"', () => {
        assert.equal(getQuarterLabel(new Date('2026-10-01T09:00:00Z')), 'Q4 2026')
    })

    it('Dec 31 23:59 UTC → "Q4 YYYY" (no year roll-over)', () => {
        assert.equal(getQuarterLabel(new Date('2026-12-31T23:59:59Z')), 'Q4 2026')
    })

    it('Mar 31 23:59 UTC → still "Q1 YYYY" (right-edge of Q1)', () => {
        assert.equal(getQuarterLabel(new Date('2026-03-31T23:59:59Z')), 'Q1 2026')
    })

    it('uses the UTC year — Jan 1 00:30 UTC is Q1 of the NEW year', () => {
        // A runner one hour behind UTC would compute 2025-12-31 locally.
        // The contract is UTC-based, so this must be Q1 2026.
        assert.equal(getQuarterLabel(new Date('2026-01-01T00:30:00Z')), 'Q1 2026')
    })
})

describe('buildAdoptQuarterlyUpdateEmail', () => {
    it('subject contains the alpaca name when provided', () => {
        const { subject } = buildAdoptQuarterlyUpdateEmail({
            name: 'Cruz',
            alpacaName: 'Pebble',
            quarterLabel: 'Q2 2026',
            locale: 'en',
        })
        assert.match(subject, /Pebble/)
        assert.match(subject, /Q2 2026/)
    })

    it('subject falls back to "your alpaca" when alpacaName is null', () => {
        const { subject } = buildAdoptQuarterlyUpdateEmail({
            name: 'Cruz',
            alpacaName: null,
            quarterLabel: 'Q2 2026',
            locale: 'en',
        })
        assert.match(subject, /your alpaca/)
        assert.doesNotMatch(subject, /null/)
    })

    it('greeting renders the donor name when present', () => {
        const { html } = buildAdoptQuarterlyUpdateEmail({
            name: 'Cruz',
            alpacaName: 'Pebble',
            quarterLabel: 'Q2 2026',
            locale: 'en',
        })
        assert.match(html, /Hi Cruz,/)
    })

    it('greeting falls back to "Hi there" when name is missing', () => {
        const { html } = buildAdoptQuarterlyUpdateEmail({
            alpacaName: 'Pebble',
            quarterLabel: 'Q2 2026',
            locale: 'en',
        })
        assert.match(html, /Hi there,/)
        assert.doesNotMatch(html, /undefined/)
    })

    it('renders "your matched alpaca" copy when alpacaName is null', () => {
        const { html } = buildAdoptQuarterlyUpdateEmail({
            name: 'Cruz',
            alpacaName: null,
            quarterLabel: 'Q2 2026',
            locale: 'en',
        })
        assert.match(html, /your matched alpaca/i)
    })

    it('share-a-friend CTA points at /${locale}/gifts', () => {
        const { html } = buildAdoptQuarterlyUpdateEmail({
            name: 'Cruz',
            alpacaName: 'Pebble',
            quarterLabel: 'Q2 2026',
            locale: 'de',
        })
        assert.match(html, /\/de\/gifts/)
    })

    it('defaults to /en/gifts when locale is null', () => {
        const { html } = buildAdoptQuarterlyUpdateEmail({
            name: 'Cruz',
            alpacaName: 'Pebble',
            quarterLabel: 'Q2 2026',
            locale: null,
        })
        assert.match(html, /\/en\/gifts/)
    })

    it('escapes HTML in raw alpaca name to prevent XSS', () => {
        const { subject, html } = buildAdoptQuarterlyUpdateEmail({
            name: 'Cruz',
            alpacaName: '<script>alert(1)</script>',
            quarterLabel: 'Q2 2026',
            locale: 'en',
        })
        assert.doesNotMatch(subject, /<script>/)
        assert.doesNotMatch(html, /<script>alert/)
    })

    it('injects farmNewsHtml verbatim when supplied', () => {
        const { html } = buildAdoptQuarterlyUpdateEmail({
            name: 'Cruz',
            alpacaName: 'Pebble',
            quarterLabel: 'Q2 2026',
            locale: 'en',
            farmNewsHtml: '<p data-test="custom">Custom quarter copy</p>',
        })
        assert.match(html, /data-test="custom"/)
        assert.match(html, /Custom quarter copy/)
    })
})
