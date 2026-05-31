import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ALPACAS } from './data/alpacas.ts'
import { alpacasibizaContent } from './tenants/alpacasibiza-content.ts'

/**
 * Drift guard between the TWO alpaca data sources:
 *   - lib/data/alpacas.ts (ALPACAS)            → used by checkout routes to
 *     validate the ?alpaca= slug (findAlpacaName).
 *   - lib/tenants/alpacasibiza-content.ts      → used by the /alpacas pages to
 *     render portraits + bios (providers.content.listAnimals()).
 *
 * If these two ID sets diverge, a slug that renders on the herd page can fail
 * checkout validation (or vice versa) — a silent, user-visible mismatch. The
 * 2026-05-31 live-site scrape populated content.ts but not the roster, which is
 * exactly the kind of drift this test catches. Keep the ID sets identical.
 */
test('alpaca roster (checkout) and content (display) expose the same ID set', () => {
  const rosterIds = new Set(ALPACAS.map((a) => a.id))
  const contentIds = new Set(
    alpacasibizaContent.animals.map((a) => a.id),
  )

  const missingFromContent = [...rosterIds].filter((id) => !contentIds.has(id))
  const missingFromRoster = [...contentIds].filter((id) => !rosterIds.has(id))

  assert.deepEqual(
    missingFromContent,
    [],
    `roster has alpaca ids absent from content provider: ${missingFromContent.join(', ')}`,
  )
  assert.deepEqual(
    missingFromRoster,
    [],
    `content provider has alpaca ids absent from checkout roster: ${missingFromRoster.join(', ')}`,
  )
  assert.equal(rosterIds.size, contentIds.size, 'roster and content count must match')
})
