/**
 * Unit tests for yogaWeeklyEventSchema() in lib/structured-data.ts
 *
 * Framework: node --test --experimental-strip-types (matches pnpm test script).
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { yogaWeeklyEventSchema } from './structured-data.ts'

describe('yogaWeeklyEventSchema', () => {
    it('startDate rolls forward to next Wednesday from a Tuesday', () => {
        // 2026-06-02 is a Tuesday (UTC). Next Wed = 2026-06-03.
        const result = yogaWeeklyEventSchema({ now: new Date('2026-06-02T12:00:00Z') }) as any
        assert.equal(result.startDate, '2026-06-03')
    })

    it('startDate rolls forward 7 days when called on Wednesday itself', () => {
        // 2026-06-03 is Wednesday. Should produce next-week Wed = 2026-06-10
        const result = yogaWeeklyEventSchema({ now: new Date('2026-06-03T12:00:00Z') }) as any
        assert.equal(result.startDate, '2026-06-10')
    })

    it('omits performer field (instructor UNMAPPED per Rule 5)', () => {
        const result = yogaWeeklyEventSchema({ now: new Date('2026-06-01T12:00:00Z') }) as any
        assert.equal(result.performer, undefined)
    })

    it('omits image field (no yoga-event image confirmed)', () => {
        const result = yogaWeeklyEventSchema({ now: new Date('2026-06-01T12:00:00Z') }) as any
        assert.equal(result.image, undefined)
    })

    it('includes offers with €30 price', () => {
        const result = yogaWeeklyEventSchema({ now: new Date('2026-06-01T12:00:00Z') }) as any
        assert.equal(result.offers.price, '30')
        assert.equal(result.offers.priceCurrency, 'EUR')
    })

    it('event location includes the Es Currals address', () => {
        const result = yogaWeeklyEventSchema({ now: new Date('2026-06-01T12:00:00Z') }) as any
        assert.equal(result.location.address.streetAddress, 'San Carlos')
        assert.equal(result.location.address.addressCountry, 'ES')
    })
})
