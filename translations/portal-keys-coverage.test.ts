/**
 * Portal key coverage test.
 *
 * /my-adoption (donor portal) is shipped in English-default and the non-EN
 * locales rely on placeholder `__UNTRANSLATED__:` sentinels until a human
 * translator fills them in. The risk is that a future PR adds a new
 * `portal.*` key to en.json and forgets to mirror it in de/it/es/nl/fr.
 *
 * This test guards against that by walking every leaf key under `portal.*`
 * in en.json and asserting it exists (as some string) in every other locale.
 * Catches missing keys at CI time before they ship to production.
 *
 * We deliberately DO NOT check translation quality (that's a translator's
 * job, not a CI job). `__UNTRANSLATED__:` sentinels count as present.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import en from './en.json' with { type: 'json' }
import de from './de.json' with { type: 'json' }
import it_ from './it.json' with { type: 'json' }
import es from './es.json' with { type: 'json' }
import nl from './nl.json' with { type: 'json' }
import fr from './fr.json' with { type: 'json' }

type Json = Record<string, unknown>

/** Collect every dot-path under `prefix` whose leaf is a string. */
function collectStringPaths(obj: unknown, prefix: string): string[] {
  if (obj == null || typeof obj !== 'object') return []
  const out: string[] = []
  for (const [k, v] of Object.entries(obj as Json)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'string') {
      out.push(path)
    } else if (v && typeof v === 'object') {
      out.push(...collectStringPaths(v, path))
    }
  }
  return out
}

/** Walk a dot-path against a JSON tree; returns the string at the leaf or undefined. */
function resolvePath(obj: unknown, path: string): string | undefined {
  let cur: unknown = obj
  for (const part of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Json)[part]
  }
  return typeof cur === 'string' ? cur : undefined
}

const enPortalKeys = collectStringPaths((en as Json).portal, 'portal')

const otherLocales: Array<[string, unknown]> = [
  ['de', de],
  ['it', it_],
  ['es', es],
  ['nl', nl],
  ['fr', fr],
]

describe('portal.* key coverage across locales', () => {
  it('en.json has at least the expected portal keys', () => {
    // Sanity check — if this drops to 0, the test is silently passing nothing.
    assert.ok(enPortalKeys.length >= 20, `expected ≥20 portal keys in en.json, got ${enPortalKeys.length}`)
  })

  for (const [locale, tree] of otherLocales) {
    it(`${locale}.json has every portal.* key present in en.json`, () => {
      const missing: string[] = []
      for (const key of enPortalKeys) {
        if (resolvePath(tree, key) === undefined) missing.push(key)
      }
      assert.equal(
        missing.length,
        0,
        `${locale}.json is missing portal keys: ${missing.join(', ')}`,
      )
    })
  }
})
