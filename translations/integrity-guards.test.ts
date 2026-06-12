/**
 * Translation integrity guards (regression tests for 2026-06-10 fixes).
 *
 * Two classes of bug shipped to all six locales and were repaired this session;
 * these tests stop them silently returning:
 *
 *  1. MOJIBAKE - every locale file was UTF-8 content double-encoded through
 *     cp1252 (accents and emoji became multi-char garbage). The byte-level
 *     signature is a UTF-8 lead byte (0xC2 / 0xC3 / 0xF0) immediately followed
 *     by a Latin-1 continuation byte (0x80-0xBF). Correct text never produces
 *     that pair: a natural accented word has the accented char followed by an
 *     ASCII letter, not a continuation byte. ~1,380 corrupted runs were
 *     repaired across the six files.
 *
 *  2. NON-STRING nav.* - `nav.yoga` was authored as an object `{title: ...}`
 *     among flat-string siblings, so `footer.tsx`'s `t('nav.yoga')` threw
 *     INSUFFICIENT_PATH on every page render. Every nav leaf must be a string.
 *
 * Detection uses numeric char codes so this source file contains no literal
 * high bytes. Translation quality is NOT checked here (a translator's job).
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

const LOCALES: ReadonlyArray<readonly [string, unknown]> = [
  ['en', en],
  ['de', de],
  ['es', es],
  ['fr', fr],
  ['it', it_],
  ['nl', nl],
]

/** Walk every string leaf, yielding [dotPath, value]. */
function collectStrings(obj: unknown, prefix = ''): Array<[string, string]> {
  if (obj == null || typeof obj !== 'object') return []
  const out: Array<[string, string]> = []
  for (const [k, v] of Object.entries(obj as Json)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'string') out.push([path, v])
    else if (v && typeof v === 'object') out.push(...collectStrings(v, path))
  }
  return out
}

/**
 * True if `s` contains a mojibake signature: a UTF-8 lead code point
 * (0xC2 Â, 0xC3 Ã, 0xF0 ð) followed by a Latin-1 continuation code point
 * (0x80-0xBF). Also catches the emoji prefix 0xF0 0x178 ("ð" + "Ÿ").
 */
function hasMojibake(s: string): boolean {
  for (let i = 0; i < s.length - 1; i++) {
    const a = s.charCodeAt(i)
    const b = s.charCodeAt(i + 1)
    const lead = a === 0xc2 || a === 0xc3 || a === 0xf0
    if (lead && b >= 0x80 && b <= 0xbf) return true
    if (a === 0xf0 && b === 0x178) return true
  }
  return false
}

describe('translation integrity', () => {
  for (const [name, data] of LOCALES) {
    it(`${name}.json has no mojibake`, () => {
      const offenders = collectStrings(data)
        .filter(([, v]) => hasMojibake(v))
        .slice(0, 10)
      assert.equal(
        offenders.length,
        0,
        `mojibake in ${name}.json: ${offenders.map(([p, v]) => `${p}=${JSON.stringify(v.slice(0, 40))}`).join('; ')}`,
      )
    })

    it(`${name}.json nav.* values are all strings`, () => {
      const nav = (data as Json).nav
      assert.ok(nav && typeof nav === 'object', `${name}.json has no nav object`)
      const nonString = Object.entries(nav as Json)
        .filter(([, v]) => typeof v !== 'string')
        .map(([k]) => k)
      assert.equal(
        nonString.length,
        0,
        `nav.* must be flat strings in ${name}.json; non-string keys: ${nonString.join(', ')}`,
      )
    })
  }
})
