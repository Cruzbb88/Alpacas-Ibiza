/**
 * Unit tests for yogaWeeklyEventSchema() in lib/structured-data.ts
 *
 * Framework: node --test --experimental-strip-types (matches pnpm test script).
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { yogaWeeklyEventSchema, personSchema, websiteSearchSchema, touristTripSchema, weddingsServiceSchema, workshopHowToSchema, herdAttractionSchema } from './structured-data.ts'

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

describe('personSchema', () => {
    it('emits @type Person with name', () => {
        const p = personSchema({ name: 'San' }) as any
        assert.equal(p['@type'], 'Person')
        assert.equal(p.name, 'San')
    })

    it('omits jobTitle when role is null', () => {
        const p = personSchema({ name: 'San', role: null }) as any
        assert.equal(p.jobTitle, undefined)
    })

    it('includes jobTitle when role provided', () => {
        const p = personSchema({ name: 'San', role: 'Weaver' }) as any
        assert.equal(p.jobTitle, 'Weaver')
    })

    it('omits url when null (no broken Person.url)', () => {
        const p = personSchema({ name: 'San', url: null }) as any
        assert.equal(p.url, undefined)
    })
})

describe('websiteSearchSchema', () => {
    it('has @type WebSite + SearchAction', () => {
        const s = websiteSearchSchema() as any
        assert.equal(s['@type'], 'WebSite')
        assert.equal(s.potentialAction['@type'], 'SearchAction')
    })

    it('urlTemplate contains search_term_string placeholder', () => {
        const s = websiteSearchSchema() as any
        assert.match(s.potentialAction.target.urlTemplate, /\{search_term_string\}/)
    })

    it('query-input requires the term', () => {
        const s = websiteSearchSchema() as any
        assert.match(s.potentialAction['query-input'], /required/)
    })
})

describe('weddingsServiceSchema', () => {
    it('emits @type Service with areaServed Ibiza', () => {
        const s = weddingsServiceSchema() as any
        assert.equal(s['@type'], 'Service')
        assert.equal(s.areaServed.name, 'Ibiza, Spain')
    })

    it('omits offers (UNMAPPED pricing)', () => {
        const s = weddingsServiceSchema() as any
        assert.equal(s.offers, undefined)
    })
})

describe('workshopHowToSchema', () => {
    it('emits 2 steps for the 2-day workshop', () => {
        const s = workshopHowToSchema() as any
        assert.equal(s.step.length, 2)
        assert.match(s.step[0].name, /Day 1/)
        assert.match(s.step[1].name, /Day 2/)
    })

    it('totalTime is ISO 8601 P2D', () => {
        const s = workshopHowToSchema() as any
        assert.equal(s.totalTime, 'P2D')
    })

    it('omits tool/supply/estimatedCost (UNMAPPED)', () => {
        const s = workshopHowToSchema() as any
        assert.equal(s.tool, undefined)
        assert.equal(s.supply, undefined)
        assert.equal(s.estimatedCost, undefined)
    })
})

describe('herdAttractionSchema', () => {
    it('emits @type TouristAttraction', () => {
        const s = herdAttractionSchema() as any
        assert.equal(s['@type'], 'TouristAttraction')
    })

    it('isAccessibleForFree is false (appointment-based)', () => {
        const s = herdAttractionSchema() as any
        assert.equal(s.isAccessibleForFree, false)
        assert.equal(s.publicAccess, false)
    })

    it('lists all 14 named alpacas in description', () => {
        const s = herdAttractionSchema() as any
        for (const name of ['Barbarella', 'Avalon', 'Toots', 'Nelson']) {
            assert.match(s.description, new RegExp(name))
        }
    })
})

describe('touristTripSchema AggregateOffer fork', () => {
    it('emits Offer when no highPriceEur given', () => {
        const s = touristTripSchema() as any
        assert.equal(s.offers['@type'], 'Offer')
        assert.equal(s.offers.price, '30')
    })

    it('emits AggregateOffer when highPriceEur > lowPriceEur', () => {
        const s = touristTripSchema({ highPriceEur: 75 }) as any
        assert.equal(s.offers['@type'], 'AggregateOffer')
        assert.equal(s.offers.lowPrice, '30')
        assert.equal(s.offers.highPrice, '75')
    })

    it('emits Offer (not AggregateOffer) when highPriceEur === lowPriceEur', () => {
        const s = touristTripSchema({ highPriceEur: 30 }) as any
        assert.equal(s.offers['@type'], 'Offer')
    })

    it('honors custom lowPriceEur', () => {
        const s = touristTripSchema({ lowPriceEur: 25 }) as any
        assert.equal(s.offers.price, '25')
    })
})
