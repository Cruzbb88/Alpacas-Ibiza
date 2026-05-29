import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { trackEvent, EVENT_CATEGORY } from './analytics-events.ts'

// ── Window stub ─────────────────────────────────────────────────────────────
type GtagCall = { command: string; eventName: string; params: Record<string, unknown> }
type DataLayerEntry = Record<string, unknown>

function makeGtag(): { calls: GtagCall[]; fn: (...args: unknown[]) => void } {
  const calls: GtagCall[] = []
  const fn = ((command: string, eventName: string, params: Record<string, unknown>) => {
    calls.push({ command, eventName, params })
  }) as (...args: unknown[]) => void
  return { calls, fn }
}

function makeDataLayer(): { entries: DataLayerEntry[]; push: (e: DataLayerEntry) => void } {
  const entries: DataLayerEntry[] = []
  return {
    entries,
    push: (e: DataLayerEntry) => {
      entries.push(e)
    },
  }
}

// `window` is declared in lib.dom; cast to any to swap it for test stubs.
const G = globalThis as unknown as { window: unknown }

/**
 * Stub localStorage with consent='accepted' so the consent-gate in
 * trackEvent does not no-op these tests. The consent-gate reads
 * localStorage.getItem('ai_cookie_consent_v1') — tests verify the
 * gtag/dataLayer dispatch path, not the consent gate (which has its own
 * test surface via cookie-consent.tsx behaviour).
 */
function makeAcceptedConsentLocalStorage(): Storage {
  const map = new Map<string, string>()
  map.set('ai_cookie_consent_v1', 'accepted')
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => map.set(k, v),
    removeItem: (k: string) => { map.delete(k) },
    clear: () => map.clear(),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    get length() { return map.size },
  }
}

beforeEach(() => {
  G.window = undefined
})

// ── Server-safe no-op ───────────────────────────────────────────────────────

describe('trackEvent — server (no window)', () => {
  it('is a no-op when window is undefined', () => {
    G.window = undefined
    // Must not throw.
    trackEvent('adopt_page_viewed', { locale: 'en' })
  })
})

// ── gtag primary path ───────────────────────────────────────────────────────

describe('trackEvent — gtag available', () => {
  it('calls window.gtag with event name and params', () => {
    const { calls, fn } = makeGtag()
    G.window = { gtag: fn, localStorage: makeAcceptedConsentLocalStorage() }
    trackEvent('adopt_tier_selected', { tier: 'monthly', source: 'card' })
    assert.equal(calls.length, 1)
    assert.equal(calls[0].command, 'event')
    assert.equal(calls[0].eventName, 'adopt_tier_selected')
    assert.equal(calls[0].params.tier, 'monthly')
    assert.equal(calls[0].params.source, 'card')
  })

  it('adds event_category as a param', () => {
    const { calls, fn } = makeGtag()
    G.window = { gtag: fn, localStorage: makeAcceptedConsentLocalStorage() }
    trackEvent('adopt_checkout_started', {
      tier: 'yearly',
      alpaca_slug: 'paco',
      processor: 'mollie',
      is_gift: false,
    })
    assert.equal(calls[0].params.event_category, 'checkout')
  })

  it('preserves null alpaca_slug (does not stringify or drop)', () => {
    const { calls, fn } = makeGtag()
    G.window = { gtag: fn, localStorage: makeAcceptedConsentLocalStorage() }
    trackEvent('adopt_alpaca_picked', { alpaca_slug: null, position: -1 })
    assert.equal(calls[0].params.alpaca_slug, null)
    assert.equal(calls[0].params.position, -1)
  })

  it('prefers gtag over dataLayer when both are available', () => {
    const { calls, fn } = makeGtag()
    const dl = makeDataLayer()
    G.window = { gtag: fn, dataLayer: dl, localStorage: makeAcceptedConsentLocalStorage() }
    trackEvent('newsletter_signup_succeeded', { source: 'footer' })
    assert.equal(calls.length, 1)
    assert.equal(dl.entries.length, 0)
  })
})

// ── dataLayer fallback ──────────────────────────────────────────────────────

describe('trackEvent — dataLayer fallback', () => {
  it('falls back to window.dataLayer.push when gtag is missing', () => {
    const dl = makeDataLayer()
    G.window = { dataLayer: dl, localStorage: makeAcceptedConsentLocalStorage() }
    trackEvent('newsletter_signup_attempted', { source: 'footer' })
    assert.equal(dl.entries.length, 1)
    assert.equal(dl.entries[0].event, 'newsletter_signup_attempted')
    assert.equal(dl.entries[0].source, 'footer')
    assert.equal(dl.entries[0].event_category, 'engagement')
  })

  it('falls back when gtag is not a function', () => {
    const dl = makeDataLayer()
    G.window = { gtag: 'not-a-function', dataLayer: dl, localStorage: makeAcceptedConsentLocalStorage() }
    trackEvent('adopt_gift_toggled', { enabled: true })
    assert.equal(dl.entries.length, 1)
    assert.equal(dl.entries[0].event, 'adopt_gift_toggled')
    assert.equal(dl.entries[0].enabled, true)
  })
})

// ── Total absence of analytics ──────────────────────────────────────────────

describe('trackEvent — no analytics surface', () => {
  it('silently swallows when neither gtag nor dataLayer exists', () => {
    G.window = {}
    trackEvent('adopt_page_viewed', { locale: 'de' })
    // No throw, no observable side effect.
  })

  it('never throws when gtag itself throws', () => {
    G.window = {
      gtag: () => {
        throw new Error('boom')
      },
    }
    // Should not propagate the throw.
    trackEvent('adopt_checkout_succeeded', { tier: 'monthly' })
  })

  it('never throws when dataLayer.push throws', () => {
    G.window = {
      dataLayer: {
        push: () => {
          throw new Error('boom')
        },
      },
    }
    trackEvent('adopt_checkout_cancelled', { tier: 'yearly' })
  })
})

// ── Category mapping ────────────────────────────────────────────────────────

describe('EVENT_CATEGORY', () => {
  it('classifies every event into one of the four categories', () => {
    const allowed = new Set(['adopt_funnel', 'gift_funnel', 'checkout', 'engagement'])
    for (const [name, cat] of Object.entries(EVENT_CATEGORY)) {
      assert.ok(allowed.has(cat), `Unknown category ${cat} for ${name}`)
    }
  })

  it('puts adopt funnel events under adopt_funnel', () => {
    assert.equal(EVENT_CATEGORY.adopt_page_viewed, 'adopt_funnel')
    assert.equal(EVENT_CATEGORY.adopt_tier_selected, 'adopt_funnel')
    assert.equal(EVENT_CATEGORY.adopt_alpaca_picked, 'adopt_funnel')
  })

  it('puts checkout events under checkout', () => {
    assert.equal(EVENT_CATEGORY.adopt_checkout_started, 'checkout')
    assert.equal(EVENT_CATEGORY.adopt_checkout_succeeded, 'checkout')
    assert.equal(EVENT_CATEGORY.adopt_checkout_cancelled, 'checkout')
  })

  it('puts gift events under gift_funnel', () => {
    assert.equal(EVENT_CATEGORY.adopt_gift_toggled, 'gift_funnel')
    assert.equal(EVENT_CATEGORY.adopt_gift_fields_completed, 'gift_funnel')
  })

  it('puts newsletter events under engagement', () => {
    assert.equal(EVENT_CATEGORY.newsletter_signup_attempted, 'engagement')
    assert.equal(EVENT_CATEGORY.newsletter_signup_succeeded, 'engagement')
  })
})
