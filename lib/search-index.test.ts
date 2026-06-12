/**
 * Tests for lib/data/search-index.ts — scoring, type routing, edge cases.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { scoreEntry, searchAll, buildSearchIndex, type SearchEntry } from './data/search-index.ts'
import { JOURNAL_POSTS } from './data/journal-posts.ts'

// ── scoreEntry ────────────────────────────────────────────────────────────────

describe('scoreEntry — exact title match', () => {
  it('scores 100 for exact title', () => {
    const entry: SearchEntry = { path: '/tours', title: 'Tours', snippet: 'Visit us.', type: 'page' }
    assert.equal(scoreEntry(entry, 'tours'), 100)
  })
  it('is case-insensitive', () => {
    const entry: SearchEntry = { path: '/tours', title: 'Tours', snippet: '', type: 'page' }
    assert.equal(scoreEntry(entry, 'TOURS'), 100)
  })
})

describe('scoreEntry — startsWith match', () => {
  it('scores 50 for prefix match', () => {
    const entry: SearchEntry = { path: '/tours', title: 'Tours & Visits', snippet: '', type: 'page' }
    assert.equal(scoreEntry(entry, 'tours'), 50)
  })
})

describe('scoreEntry — includes match', () => {
  it('scores 25 for substring title match', () => {
    const entry: SearchEntry = { path: '/x', title: 'All About Tours', snippet: '', type: 'page' }
    assert.equal(scoreEntry(entry, 'tours'), 25)
  })
})

describe('scoreEntry — snippet match', () => {
  it('adds 10 for snippet includes', () => {
    const entry: SearchEntry = { path: '/x', title: 'Something', snippet: 'book a tour here', type: 'page' }
    // title doesn't match, snippet does → 10
    assert.equal(scoreEntry(entry, 'tour'), 10)
  })
})

describe('scoreEntry — tag exact token', () => {
  it('adds 15 for exact tag token', () => {
    const entry: SearchEntry = { path: '/x', title: 'Something', snippet: '', type: 'page', tags: ['yoga', 'wellness'] }
    // no title/snippet match, tag exact → 15
    assert.equal(scoreEntry(entry, 'yoga'), 15)
  })
})

describe('scoreEntry — zero for empty query', () => {
  it('returns 0 when query is empty', () => {
    const entry: SearchEntry = { path: '/tours', title: 'Tours', snippet: 'Visit', type: 'page', tags: ['tour'] }
    assert.equal(scoreEntry(entry, ''), 0)
    assert.equal(scoreEntry(entry, '   '), 0)
  })
})

describe('scoreEntry — zero for no match', () => {
  it('returns 0 for unrelated query', () => {
    const entry: SearchEntry = { path: '/tours', title: 'Tours', snippet: 'Visit us.', type: 'page', tags: ['tour'] }
    assert.equal(scoreEntry(entry, 'zzznomatch'), 0)
  })
})

// ── searchAll — type routing ──────────────────────────────────────────────────

describe('searchAll — type routing', () => {
  it('finds alpaca entry for "Avalon"', () => {
    const results = searchAll('Avalon')
    assert.ok(results.length > 0, 'should return results')
    const first = results[0]
    assert.equal(first.type, 'alpaca')
    assert.equal(first.title, 'Avalon')
  })

  it('finds alpaca entry for "Toots"', () => {
    const results = searchAll('Toots')
    assert.ok(results.length > 0)
    assert.equal(results[0].type, 'alpaca')
    assert.equal(results[0].title, 'Toots')
  })

  it('returns page entry for "tour"', () => {
    const results = searchAll('tour')
    assert.ok(results.length > 0)
    // Tours page should be in the first 3 results
    const toursPage = results.find((r) => r.path === '/tours')
    assert.ok(toursPage, 'Tours page should appear')
    assert.equal(toursPage?.type, 'page')
  })

  it('returns journal entry for "spinning" only when post is live', () => {
    const results = searchAll('spinning')
    // All journal-posts.ts posts are draft — spinning entry should not appear in results
    const journalResult = results.find((r) => r.type === 'journal' && r.path.includes('spinning'))
    assert.equal(journalResult, undefined, 'draft journal post should not appear in search results')
  })
})

// ── searchAll — limit ─────────────────────────────────────────────────────────

describe('searchAll — limit', () => {
  it('respects default limit of 8', () => {
    const results = searchAll('a') // 'a' will match many entries
    assert.ok(results.length <= 8)
  })

  it('respects custom limit', () => {
    const results = searchAll('alpaca', 3)
    assert.ok(results.length <= 3)
  })

  it('returns empty array for empty query', () => {
    const results = searchAll('')
    assert.deepEqual(results, [])
  })
})

// ── buildSearchIndex ──────────────────────────────────────────────────────────

describe('buildSearchIndex', () => {
  it('includes pages and alpacas; journals only when live posts exist', () => {
    const index = buildSearchIndex()
    const types = new Set(index.map((e) => e.type))
    assert.ok(types.has('page'), 'should include pages')
    assert.ok(types.has('alpaca'), 'should include alpacas')
    // Journal entries only appear when there are live posts in journal-posts.ts
    const liveJournalPosts = JOURNAL_POSTS.filter((p) => p.status === 'live')
    if (liveJournalPosts.length > 0) {
      assert.ok(types.has('journal'), 'should include journals when live posts exist')
    }
  })

  it('includes 14 alpaca entries', () => {
    const index = buildSearchIndex()
    const alpacaCount = index.filter((e) => e.type === 'alpaca').length
    assert.equal(alpacaCount, 14)
  })

  it('includes journal entries with correct paths (only live posts)', () => {
    const index = buildSearchIndex()
    const journals = index.filter((e) => e.type === 'journal')
    const liveCount = JOURNAL_POSTS.filter((p) => p.status === 'live').length
    assert.equal(journals.length, liveCount, `should have exactly ${liveCount} journal entries (live only)`)
    assert.ok(journals.every((j) => j.path.startsWith('/journal/')))
  })

  it('alpaca paths include hash anchors', () => {
    const index = buildSearchIndex()
    const alpacas = index.filter((e) => e.type === 'alpaca')
    assert.ok(alpacas.every((a) => a.path.startsWith('/alpacas#')))
  })
})

// ── Combined score ordering ───────────────────────────────────────────────────

describe('searchAll — result ordering', () => {
  it('exact-title match ranks above snippet-only match', () => {
    const results = searchAll('yoga')
    // 'Alpaca Yoga' page has 'yoga' in title → should rank first
    assert.ok(results.length > 0)
    assert.equal(results[0].path, '/yoga')
  })
})
