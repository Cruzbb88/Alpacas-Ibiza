/**
 * Pins the contract for buildQuarterStarterDraft + helpers.
 *
 * The function powers the "Auto-suggest starter draft" button on
 * /admin/quarterly-update. Its output is injected verbatim into the email
 * template (farmNewsHtml param of buildAdoptQuarterlyUpdateEmail), so these
 * tests pin: (a) at least one alpaca is named, (b) the Q→season map is
 * correct, and (c) no <script> tag survives even when alpaca names
 * contain markup-ish characters.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { AnimalEntity } from './integrations/content-types.ts'
import {
  buildQuarterStarterDraft,
  quarterToSeason,
  pickMostRecentAnimal,
} from './quarterly-suggest.ts'

function mkAnimal(id: string, name: string): AnimalEntity {
  return { kind: 'animal', id, name, bio: null, image: null }
}

const SAMPLE_HERD: ReadonlyArray<AnimalEntity> = [
  mkAnimal('barbarella', 'Barbarella'),
  mkAnimal('avalon', 'Avalon'),
  mkAnimal('bardot', 'Bardot'),
]

describe('quarterToSeason', () => {
  it('Q1 → winter', () => {
    assert.equal(quarterToSeason('Q1 2026'), 'winter')
  })

  it('Q2 → spring', () => {
    assert.equal(quarterToSeason('Q2 2026'), 'spring')
  })

  it('Q3 → summer', () => {
    assert.equal(quarterToSeason('Q3 2026'), 'summer')
  })

  it('Q4 → autumn', () => {
    assert.equal(quarterToSeason('Q4 2026'), 'autumn')
  })

  it('malformed → null', () => {
    assert.equal(quarterToSeason('Quarter 1'), null)
    assert.equal(quarterToSeason(''), null)
    assert.equal(quarterToSeason('Q5 2026'), null)
  })
})

describe('pickMostRecentAnimal', () => {
  it('returns last entry as the newest-added heuristic', () => {
    const got = pickMostRecentAnimal(SAMPLE_HERD)
    assert.equal(got?.id, 'bardot')
  })

  it('empty roster → null', () => {
    assert.equal(pickMostRecentAnimal([]), null)
  })
})

describe('buildQuarterStarterDraft', () => {
  it('mentions at least one alpaca by name when herd is non-empty', () => {
    const html = buildQuarterStarterDraft({
      quarter: 'Q2 2026',
      animals: SAMPLE_HERD,
    })
    assert.match(html, /Barbarella/)
  })

  it('mentions every alpaca by name', () => {
    const html = buildQuarterStarterDraft({
      quarter: 'Q2 2026',
      animals: SAMPLE_HERD,
    })
    assert.match(html, /Barbarella/)
    assert.match(html, /Avalon/)
    assert.match(html, /Bardot/)
  })

  it('Q1 → contains "winter" copy', () => {
    const html = buildQuarterStarterDraft({
      quarter: 'Q1 2026',
      animals: SAMPLE_HERD,
    })
    assert.match(html, /winter/i)
  })

  it('Q3 → contains "summer" copy', () => {
    const html = buildQuarterStarterDraft({
      quarter: 'Q3 2026',
      animals: SAMPLE_HERD,
    })
    assert.match(html, /summer/i)
  })

  it('Q2 → contains "spring" copy', () => {
    const html = buildQuarterStarterDraft({
      quarter: 'Q2 2026',
      animals: SAMPLE_HERD,
    })
    assert.match(html, /spring/i)
  })

  it('Q4 → contains "autumn" copy', () => {
    const html = buildQuarterStarterDraft({
      quarter: 'Q4 2026',
      animals: SAMPLE_HERD,
    })
    assert.match(html, /autumn/i)
  })

  it('no <script> tag in output even when alpaca name contains <script>', () => {
    const sneaky: ReadonlyArray<AnimalEntity> = [
      mkAnimal('a', '<script>alert(1)</script>'),
      mkAnimal('b', 'Avalon'),
    ]
    const html = buildQuarterStarterDraft({
      quarter: 'Q2 2026',
      animals: sneaky,
    })
    // The literal opening / closing <script> tags must NOT survive — they
    // must be HTML-entity-encoded so a browser cannot execute the contents.
    assert.doesNotMatch(html, /<script\b/i)
    assert.doesNotMatch(html, /<\/script>/i)
    // Should still contain the escaped form so the owner sees the literal string
    assert.match(html, /&lt;script&gt;/)
  })

  it('no event handlers (on*=) survive on any HTML tag even when alpaca name contains onerror=', () => {
    const sneaky: ReadonlyArray<AnimalEntity> = [
      mkAnimal('a', '" onerror="alert(1)"'),
    ]
    const html = buildQuarterStarterDraft({
      quarter: 'Q2 2026',
      animals: sneaky,
    })
    // The literal " character must be escaped so the injected name can't
    // break out of any attribute context. Since the helper emits only fixed
    // tags (<p>) and escapes all dynamic content, there is no attribute to
    // break out of in the first place — but pin both invariants.
    assert.doesNotMatch(html, /"\s*onerror\s*=/i)
    // No raw double-quote characters around the injected name fragment.
    assert.match(html, /&quot;/)
  })

  it('returns 1 paragraph when herd is empty (intro only, no spotlight)', () => {
    const html = buildQuarterStarterDraft({
      quarter: 'Q2 2026',
      animals: [],
    })
    // No name lines, but the seasonal intro should still render.
    assert.match(html, /spring/i)
    // Should still be wrapped in <p>...</p>
    assert.match(html, /^<p>/)
    // No "newest member" spotlight when there are no animals
    assert.doesNotMatch(html, /newest member/i)
  })

  it('spotlights the last-entered alpaca as newest', () => {
    const html = buildQuarterStarterDraft({
      quarter: 'Q2 2026',
      animals: SAMPLE_HERD,
    })
    assert.match(html, /newest member of the herd/i)
    // "Bardot" should be mentioned in the spotlight paragraph
    assert.match(html, /Bardot/)
  })

  it('honors explicit mostRecentAnimal override', () => {
    const html = buildQuarterStarterDraft({
      quarter: 'Q2 2026',
      animals: SAMPLE_HERD,
      mostRecentAnimal: mkAnimal('avalon', 'Avalon'),
    })
    assert.match(html, /Avalon, the newest member/)
  })

  it('honors explicit season override (Southern Hemisphere style)', () => {
    const html = buildQuarterStarterDraft({
      quarter: 'Q1 2026',
      animals: SAMPLE_HERD,
      season: 'summer',
    })
    assert.match(html, /summer/i)
    assert.doesNotMatch(html, /winter/i)
  })

  it('falls back to no-date intro when quarter is malformed AND season unset', () => {
    const html = buildQuarterStarterDraft({
      quarter: 'not-a-quarter',
      animals: SAMPLE_HERD,
    })
    assert.match(html, /A new quarter on the farm/)
  })

  it('output is pure HTML — no <script>, no javascript:, no on*= handlers', () => {
    const html = buildQuarterStarterDraft({
      quarter: 'Q3 2026',
      animals: SAMPLE_HERD,
    })
    assert.doesNotMatch(html, /<script/i)
    assert.doesNotMatch(html, /javascript:/i)
    assert.doesNotMatch(html, /\son\w+\s*=/i)
  })

  it('skips animals with empty/whitespace names', () => {
    const mixed: ReadonlyArray<AnimalEntity> = [
      mkAnimal('a', 'Avalon'),
      mkAnimal('b', '   '),
      mkAnimal('c', 'Bardot'),
    ]
    const html = buildQuarterStarterDraft({
      quarter: 'Q2 2026',
      animals: mixed,
    })
    assert.match(html, /Avalon/)
    assert.match(html, /Bardot/)
    // Should not have a stray empty insert
    assert.doesNotMatch(html, /,\s*,/)
  })
})
