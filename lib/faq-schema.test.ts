/**
 * Unit tests for faqPageSchema() helper in lib/structured-data.ts
 *
 * Covers:
 *  - Standard single-item shape
 *  - Empty items → still returns valid schema with empty mainEntity
 *  - HTML chars in answer → NOT auto-escaped (caller's responsibility; verify current behavior)
 *  - Multiple items
 *
 * Framework: node --test --experimental-strip-types (matches pnpm test script).
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { faqPageSchema } from './structured-data.ts'

describe('faqPageSchema()', () => {
    it('returns correct @context and @type', () => {
        const schema = faqPageSchema([{ question: 'Q?', answer: 'A.' }])
        assert.equal(schema['@context'], 'https://schema.org')
        assert.equal(schema['@type'], 'FAQPage')
    })

    it('maps a single item to mainEntity with Question + Answer shape', () => {
        const schema = faqPageSchema([{ question: 'How long?', answer: '2 hours.' }])
        assert.equal(schema.mainEntity.length, 1)
        const entity = schema.mainEntity[0]
        assert.equal(entity['@type'], 'Question')
        assert.equal(entity.name, 'How long?')
        assert.equal(entity.acceptedAnswer['@type'], 'Answer')
        assert.equal(entity.acceptedAnswer.text, '2 hours.')
    })

    it('maps multiple items preserving order', () => {
        const items = [
            { question: 'Q1', answer: 'A1' },
            { question: 'Q2', answer: 'A2' },
            { question: 'Q3', answer: 'A3' },
        ]
        const schema = faqPageSchema(items)
        assert.equal(schema.mainEntity.length, 3)
        for (let i = 0; i < items.length; i++) {
            assert.equal(schema.mainEntity[i].name, items[i].question)
            assert.equal(schema.mainEntity[i].acceptedAnswer.text, items[i].answer)
        }
    })

    it('empty items array → returns schema with empty mainEntity (caller guards render)', () => {
        // The helper itself does NOT throw on empty input — the FAQ component is
        // responsible for the "items.length === 0 → render nothing" failsafe.
        const schema = faqPageSchema([])
        assert.equal(schema['@type'], 'FAQPage')
        assert.deepEqual(schema.mainEntity, [])
    })

    it('HTML chars in answer are NOT auto-escaped (caller responsibility)', () => {
        // Verify that faqPageSchema passes HTML through as-is.
        // Pages that render answer text via React will escape it at render time.
        // The raw JSON-LD string should contain the literal < and > characters
        // (JSON.stringify does not escape them into HTML entities).
        const answer = '<strong>Bring sunscreen</strong> & water.'
        const schema = faqPageSchema([{ question: 'What to bring?', answer }])
        assert.equal(schema.mainEntity[0].acceptedAnswer.text, answer)
    })
})
