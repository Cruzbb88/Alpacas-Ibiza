import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  setQuarterlyContent,
  getQuarterlyContent,
  markQuarterlySent,
  listQuarterlyContent,
  __resetQuarterlyContentStore,
} from './quarterly-content-store.ts'

describe('quarterly-content-store', () => {
  beforeEach(() => __resetQuarterlyContentStore())

  it('setQuarterlyContent saves and getQuarterlyContent reads it back', () => {
    const saved = setQuarterlyContent('Q1 2026', '<p>Hello adopters</p>')
    assert.equal(saved.quarter, 'Q1 2026')
    assert.equal(saved.newsHtml, '<p>Hello adopters</p>')
    assert.equal(saved.sentAt, null)
    assert.ok(saved.updatedAt)

    const fetched = getQuarterlyContent('Q1 2026')
    assert.deepEqual(fetched, saved)
  })

  it('overwriting an existing quarter preserves sentAt (re-edits do not unset)', () => {
    setQuarterlyContent('Q1 2026', '<p>v1</p>')
    markQuarterlySent('Q1 2026', new Date('2026-04-01T09:00:01Z'))
    const updated = setQuarterlyContent('Q1 2026', '<p>v2 with corrections</p>')

    assert.equal(updated.newsHtml, '<p>v2 with corrections</p>')
    assert.equal(updated.sentAt, '2026-04-01T09:00:01.000Z')
  })

  it('returns null for an unknown quarter', () => {
    assert.equal(getQuarterlyContent('Q9 9999'), null)
  })

  it('markQuarterlySent is a no-op when the quarter has no content', () => {
    markQuarterlySent('Q3 2099')
    assert.equal(getQuarterlyContent('Q3 2099'), null)
  })

  it('listQuarterlyContent returns newest first', () => {
    setQuarterlyContent('Q4 2025', '<p>old</p>')
    setQuarterlyContent('Q2 2026', '<p>middle</p>')
    setQuarterlyContent('Q1 2026', '<p>newer</p>')

    const list = listQuarterlyContent()
    assert.deepEqual(
      list.map((q) => q.quarter),
      ['Q4 2025', 'Q2 2026', 'Q1 2026'],
      'expected localeCompare descending so Q4 2025 sorts after Q2 2026',
    )
  })
})
