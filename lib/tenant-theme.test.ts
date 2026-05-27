/**
 * Tests for lib/tenants/theme.ts — buildCssVars + helpers.
 */
import { describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import { buildCssVars, hexToHslTriple, isValidHex } from './tenants/theme.ts'

// ── isValidHex ────────────────────────────────────────────────────────────────

describe('isValidHex', () => {
  it('accepts a standard 6-digit hex', () => {
    assert.equal(isValidHex('#556B2F'), true)
  })

  it('accepts a 3-digit hex', () => {
    assert.equal(isValidHex('#abc'), true)
  })

  it('accepts uppercase hex', () => {
    assert.equal(isValidHex('#FF0000'), true)
  })

  it('accepts 8-digit hex (with alpha)', () => {
    assert.equal(isValidHex('#FF000080'), true)
  })

  it('rejects missing #', () => {
    assert.equal(isValidHex('556B2F'), false)
  })

  it('rejects empty string', () => {
    assert.equal(isValidHex(''), false)
  })

  it('rejects non-hex chars', () => {
    assert.equal(isValidHex('#GGGGGG'), false)
  })

  it('rejects 2-digit hex (too short)', () => {
    assert.equal(isValidHex('#ab'), false)
  })
})

// ── hexToHslTriple ────────────────────────────────────────────────────────────

describe('hexToHslTriple', () => {
  it('converts red #ff0000 → "0 100% 50%"', () => {
    assert.equal(hexToHslTriple('#ff0000'), '0 100% 50%')
  })

  it('converts green #00ff00 → "120 100% 50%"', () => {
    assert.equal(hexToHslTriple('#00ff00'), '120 100% 50%')
  })

  it('converts blue #0000ff → "240 100% 50%"', () => {
    assert.equal(hexToHslTriple('#0000ff'), '240 100% 50%')
  })

  it('converts white #ffffff → "0 0% 100%"', () => {
    assert.equal(hexToHslTriple('#ffffff'), '0 0% 100%')
  })

  it('converts black #000000 → "0 0% 0%"', () => {
    assert.equal(hexToHslTriple('#000000'), '0 0% 0%')
  })

  it('accepts 3-digit hex #abc (expands to #aabbcc)', () => {
    // #aabbcc → r=170 g=187 b=204 → hsl(210, 25%, 73%) approx
    const result = hexToHslTriple('#abc')
    assert.ok(result.includes('%'), `Expected HSL triple, got: ${result}`)
    // Confirm it's 3 space-separated segments
    const parts = result.split(' ')
    assert.equal(parts.length, 3)
  })

  it('converts alpacasibiza primary #556B2F to hue ~82', () => {
    const triple = hexToHslTriple('#556B2F')
    const hue = parseInt(triple.split(' ')[0], 10)
    // #556B2F is olive-green; hue should be in the green range (75–90)
    assert.ok(hue >= 75 && hue <= 90, `Hue ${hue} not in expected olive-green range`)
  })

  it('converts vineyard primary #722F37 to a red/rose hue', () => {
    const triple = hexToHslTriple('#722F37')
    const hue = parseInt(triple.split(' ')[0], 10)
    // Burgundy — hue should be ~350 (near red)
    assert.ok(hue >= 340 || hue <= 10, `Hue ${hue} not in expected burgundy range`)
  })
})

// ── buildCssVars ──────────────────────────────────────────────────────────────

describe('buildCssVars', () => {
  it('returns an object with --primary, --secondary, --ring keys for valid hex', () => {
    const result = buildCssVars({
      primary: '#ff0000',
      secondary: '#00ff00',
      themeColor: '#0000ff',
    })
    assert.ok('--primary' in result, '--primary missing')
    assert.ok('--secondary' in result, '--secondary missing')
    assert.ok('--ring' in result, '--ring missing')
  })

  it('sets --primary to HSL triple for #ff0000', () => {
    const result = buildCssVars({
      primary: '#ff0000',
      secondary: '#ffffff',
      themeColor: '#000000',
    })
    const primary = (result as Record<string, string>)['--primary']
    assert.equal(primary, '0 100% 50%')
  })

  it('converts all three valid hex values to HSL triples', () => {
    const result = buildCssVars({
      primary: '#ff0000',
      secondary: '#00ff00',
      themeColor: '#0000ff',
    }) as Record<string, string>

    assert.equal(result['--primary'],   '0 100% 50%')
    assert.equal(result['--secondary'], '120 100% 50%')
    assert.equal(result['--ring'],      '240 100% 50%')
  })

  it('accepts 3-digit hex #abc for all slots', () => {
    const result = buildCssVars({
      primary: '#abc',
      secondary: '#def',
      themeColor: '#123',
    }) as Record<string, string>

    // All slots should be set (non-empty HSL triples)
    for (const key of ['--primary', '--secondary', '--ring']) {
      const val = result[key]
      assert.ok(typeof val === 'string' && val.includes('%'), `${key} should be HSL triple, got: ${val}`)
    }
  })

  it('falls back to alpacasibiza default for an invalid primary hex', () => {
    // Suppress console.warn for this test
    const originalWarn = console.warn
    const warnings: string[] = []
    console.warn = (...args: unknown[]) => { warnings.push(String(args[0])) }

    try {
      const result = buildCssVars({
        primary: 'not-a-hex',
        secondary: '#F5F5DC',
        themeColor: '#6da855',
      }) as Record<string, string>

      // Should fall back to alpacasibiza default primary (olive)
      const hue = parseInt(result['--primary'].split(' ')[0], 10)
      assert.ok(hue >= 75 && hue <= 90, `Expected olive hue fallback, got hue ${hue}`)

      // Should have warned
      assert.ok(warnings.length > 0, 'Expected console.warn to be called')
      assert.ok(warnings[0].includes('not-a-hex'), `Warn message should mention the bad value: ${warnings[0]}`)
    } finally {
      console.warn = originalWarn
    }
  })

  it('only falls back the invalid slot, leaves valid slots unchanged', () => {
    const originalWarn = console.warn
    console.warn = () => {}

    try {
      const result = buildCssVars({
        primary: 'INVALID',
        secondary: '#00ff00', // valid
        themeColor: '#0000ff', // valid
      }) as Record<string, string>

      // secondary and ring should be exact conversions of the valid inputs
      assert.equal(result['--secondary'], '120 100% 50%')
      assert.equal(result['--ring'],      '240 100% 50%')
    } finally {
      console.warn = originalWarn
    }
  })

  it('emits console.warn for invalid hex', () => {
    const warnings: string[] = []
    const originalWarn = console.warn
    console.warn = (...args: unknown[]) => { warnings.push(String(args[0])) }

    try {
      buildCssVars({
        primary: 'bad',
        secondary: 'also-bad',
        themeColor: '#valid-not',
      })
      assert.ok(warnings.length >= 3, `Expected 3 warnings for 3 invalid slots, got ${warnings.length}`)
    } finally {
      console.warn = originalWarn
    }
  })
})
