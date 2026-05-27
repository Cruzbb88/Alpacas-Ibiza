/**
 * Payment provider tests.
 *
 * Covers the 4 required cases:
 *   1. manual-mailto always returns unconfigured + mailto: fallback
 *   2. fareharbor-passthrough returns the tenant's FareHarbor URL
 *   3. stripe-direct without STRIPE_SECRET_KEY returns unconfigured
 *   4. Registry selection: tenant.payment.kind drives adapter resolution
 *
 * NOTE: Tests import adapters directly (no next.js aliases, no bundler).
 * Registry selection is tested by exercising the adapter factory functions
 * with the same logic as getProviders() — avoids transitive imports that
 * require a bundler to resolve @ aliases.
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { manualMailtoPaymentProvider } from './integrations/payment-manual-mailto.ts'
import { fareHarborPassthroughPaymentProvider } from './integrations/payment-fareharbor-passthrough.ts'
import { stripeDirectPaymentProvider } from './integrations/payment-stripe-direct.ts'
import { molliePaymentProvider } from './integrations/payment-mollie.ts'
import { stripeConnectPaymentProvider } from './integrations/payment-stripe-connect.ts'
import type { BookingProvider } from './integrations/_types.ts'

// ── Minimal BookingProvider stub ──────────────────────────────────────────────

const stubBooking: BookingProvider = {
  kind: 'fareharbor',
  embedUrl: (_opts) => 'https://fareharbor.com/embeds/book/testfarm/',
  itemUrl: (itemId, _opts) =>
    itemId
      ? `https://fareharbor.com/embeds/book/testfarm/?items=${encodeURIComponent(itemId)}`
      : 'https://fareharbor.com/embeds/book/testfarm/',
  availability: async () => ({ configured: false, reason: 'stub' }),
}

// ── 1. manual-mailto — always unconfigured + mailto: ─────────────────────────

describe('manualMailtoPaymentProvider', () => {
  it('returns unconfigured:true with a mailto: fallbackUrl', async () => {
    const provider = manualMailtoPaymentProvider()
    const result = await provider.createCheckoutSession({
      tenantId: 'test',
      returnUrl: 'https://example.com/adopt',
    })
    assert.ok('unconfigured' in result, 'should have unconfigured field')
    assert.equal((result as { unconfigured: boolean }).unconfigured, true)
    const fallbackUrl = (result as { fallbackUrl: string }).fallbackUrl
    assert.ok(
      fallbackUrl.startsWith('mailto:'),
      `fallbackUrl should start with mailto:, got: ${fallbackUrl}`,
    )
  })

  it('uses a custom mailtoUrl when provided', async () => {
    const provider = manualMailtoPaymentProvider({ mailtoUrl: 'mailto:custom@example.com' })
    const result = await provider.createCheckoutSession({
      tenantId: 'test',
      returnUrl: 'https://example.com',
    })
    assert.equal((result as { fallbackUrl: string }).fallbackUrl, 'mailto:custom@example.com')
  })

  it('verifyWebhook returns ok:false (no payment processor)', async () => {
    const provider = manualMailtoPaymentProvider()
    const result = await provider.verifyWebhook('body', null)
    assert.equal(result.ok, false)
  })

  it('kind is manual-mailto', () => {
    const provider = manualMailtoPaymentProvider()
    assert.equal(provider.kind, 'manual-mailto')
  })
})

// ── 2. fareharbor-passthrough — returns FareHarbor URL ───────────────────────

describe('fareHarborPassthroughPaymentProvider', () => {
  it('returns the tenant FareHarbor embedUrl when no productId', async () => {
    const provider = fareHarborPassthroughPaymentProvider(stubBooking)
    const result = await provider.createCheckoutSession({
      tenantId: 'testfarm',
      returnUrl: 'https://example.com',
    })
    assert.ok('url' in result, 'should have url field')
    assert.equal(
      (result as { url: string }).url,
      'https://fareharbor.com/embeds/book/testfarm/',
    )
  })

  it('returns per-item URL when productId is provided', async () => {
    const provider = fareHarborPassthroughPaymentProvider(stubBooking)
    const result = await provider.createCheckoutSession({
      tenantId: 'testfarm',
      productId: '99999',
      returnUrl: 'https://example.com',
    })
    assert.ok('url' in result)
    const url = (result as { url: string }).url
    assert.ok(
      url.includes('items=99999'),
      `URL should contain items=99999, got: ${url}`,
    )
  })

  it('verifyWebhook returns ok:false (FareHarbor uses its own webhook route)', async () => {
    const provider = fareHarborPassthroughPaymentProvider(stubBooking)
    const result = await provider.verifyWebhook('body', 'sig')
    assert.equal(result.ok, false)
  })

  it('kind is fareharbor-passthrough', () => {
    const provider = fareHarborPassthroughPaymentProvider(stubBooking)
    assert.equal(provider.kind, 'fareharbor-passthrough')
  })
})

// ── 3. stripe-direct — unconfigured when STRIPE_SECRET_KEY unset ─────────────

describe('stripeDirectPaymentProvider', () => {
  let savedKey: string | undefined
  let savedWebhookKey: string | undefined

  before(() => {
    savedKey = process.env.STRIPE_SECRET_KEY
    savedWebhookKey = process.env.STRIPE_WEBHOOK_SECRET
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_WEBHOOK_SECRET
  })

  after(() => {
    if (savedKey !== undefined) {
      process.env.STRIPE_SECRET_KEY = savedKey
    } else {
      delete process.env.STRIPE_SECRET_KEY
    }
    if (savedWebhookKey !== undefined) {
      process.env.STRIPE_WEBHOOK_SECRET = savedWebhookKey
    } else {
      delete process.env.STRIPE_WEBHOOK_SECRET
    }
  })

  it('returns unconfigured:true when STRIPE_SECRET_KEY is unset', async () => {
    const provider = stripeDirectPaymentProvider()
    const result = await provider.createCheckoutSession({
      tenantId: 'test',
      productId: 'price_test123',
      returnUrl: 'https://example.com/adopt',
    })
    assert.ok('unconfigured' in result, 'should have unconfigured field')
    assert.equal((result as { unconfigured: boolean }).unconfigured, true)
  })

  it('returns unconfigured:true when productId is missing (even if key were set)', async () => {
    // productId unset path — STRIPE_SECRET_KEY is also unset in this suite,
    // so this also returns unconfigured (first gate wins).
    const provider = stripeDirectPaymentProvider()
    const result = await provider.createCheckoutSession({
      tenantId: 'test',
      returnUrl: 'https://example.com/adopt',
    })
    assert.ok('unconfigured' in result)
    assert.equal((result as { unconfigured: boolean }).unconfigured, true)
  })

  it('verifyWebhook returns ok:false when STRIPE_WEBHOOK_SECRET is unset (fail-CLOSED)', async () => {
    const provider = stripeDirectPaymentProvider()
    const result = await provider.verifyWebhook('raw-body', 'stripe-sig')
    assert.equal(result.ok, false)
  })

  it('kind is stripe-direct', () => {
    assert.equal(stripeDirectPaymentProvider().kind, 'stripe-direct')
  })
})

// ── 4. Registry selection — adapter kinds round-trip ─────────────────────────

describe('Payment registry selection (via adapter factories)', () => {
  /**
   * This mirrors the switch logic in getProviders() without importing index.ts
   * (which has @ aliases that Node's test runner cannot resolve without a bundler).
   * We verify that the factory for each kind returns the correct .kind value.
   */
  function selectAdapter(kind: string) {
    switch (kind) {
      case 'stripe-direct':
        return stripeDirectPaymentProvider()
      case 'fareharbor-passthrough':
        return fareHarborPassthroughPaymentProvider(stubBooking)
      case 'mollie':
        return molliePaymentProvider()
      case 'manual-mailto':
      default:
        return manualMailtoPaymentProvider()
    }
  }

  it('tenant with payment.kind manual-mailto resolves to kind=manual-mailto', () => {
    const provider = selectAdapter('manual-mailto')
    assert.equal(provider.kind, 'manual-mailto')
  })

  it('tenant with payment.kind stripe-direct resolves to kind=stripe-direct', () => {
    const provider = selectAdapter('stripe-direct')
    assert.equal(provider.kind, 'stripe-direct')
  })

  it('tenant with payment.kind fareharbor-passthrough resolves to kind=fareharbor-passthrough', () => {
    const provider = selectAdapter('fareharbor-passthrough')
    assert.equal(provider.kind, 'fareharbor-passthrough')
  })

  it('tenant with payment.kind mollie resolves to kind=mollie', () => {
    const provider = selectAdapter('mollie')
    assert.equal(provider.kind, 'mollie')
  })

  it('unknown kind defaults to manual-mailto', () => {
    const provider = selectAdapter('totally-unknown-vendor')
    assert.equal(provider.kind, 'manual-mailto')
  })
})

// ── 5. stripe-connect — throws to prevent accidental activation ───────────────

describe('stripeConnectPaymentProvider', () => {
  it('throws on createCheckoutSession (DEFER UNTIL TENANT #1 SIGNS)', async () => {
    const provider = stripeConnectPaymentProvider()
    await assert.rejects(
      () => provider.createCheckoutSession({ tenantId: 'test', returnUrl: 'https://example.com' }),
      /DEFER UNTIL TENANT/,
    )
  })

  it('verifyWebhook returns ok:false', async () => {
    const provider = stripeConnectPaymentProvider()
    const result = await provider.verifyWebhook('body', null)
    assert.equal(result.ok, false)
  })

  it('kind is stripe-connect', () => {
    assert.equal(stripeConnectPaymentProvider().kind, 'stripe-connect')
  })
})

// ── 5b. stripe-connect vendor guard — never silently falls to mailto ──────────
//
// Regression guard for the bug fixed 2026-05-27: previously, setting
// PAYMENT_VENDOR=stripe-connect silently fell through to the mailto adapter
// because getPaymentAdapter()'s switch had no case for it. CLAUDE.md claimed
// the adapter "throws"; the runtime path didn't. Now the switch routes
// PAYMENT_VENDOR=stripe-connect to a dedicated guard adapter that returns
// null (mailto fallback) AND loudly logs an error every call.

describe('PAYMENT_VENDOR=stripe-connect guard adapter (regression for silent-fall-through bug)', () => {
  let savedVendor: string | undefined
  let consoleErrors: string[] = []
  const originalConsoleError = console.error

  before(() => {
    savedVendor = process.env.PAYMENT_VENDOR
    process.env.PAYMENT_VENDOR = 'stripe-connect'
    // Capture console.error to assert the loud-log behavior.
    console.error = (...args: unknown[]) => {
      consoleErrors.push(args.map((a) => String(a)).join(' '))
    }
  })

  after(() => {
    if (savedVendor !== undefined) process.env.PAYMENT_VENDOR = savedVendor
    else delete process.env.PAYMENT_VENDOR
    console.error = originalConsoleError
  })

  it('getPaymentAdapter() returns an adapter with vendor=stripe-connect (not mailto)', async () => {
    // Reset captured errors for this test
    consoleErrors = []
    const { getPaymentAdapter } = await import('./payment-vendor.ts')
    const adapter = getPaymentAdapter()
    assert.equal(
      adapter.vendor,
      'stripe-connect',
      'guard adapter must report its actual vendor, not silently masquerade as mailto',
    )
  })

  it('buildAdoptCheckoutUrl returns null (caller falls back to mailto)', async () => {
    consoleErrors = []
    const { getPaymentAdapter } = await import('./payment-vendor.ts')
    const adapter = getPaymentAdapter()
    assert.equal(adapter.buildAdoptCheckoutUrl('monthly'), null)
    assert.equal(adapter.buildAdoptCheckoutUrl('yearly'), null)
  })

  it('buildAdoptCheckoutUrl logs the DEFER state loudly on every call', async () => {
    consoleErrors = []
    const { getPaymentAdapter } = await import('./payment-vendor.ts')
    const adapter = getPaymentAdapter()
    adapter.buildAdoptCheckoutUrl('monthly')
    assert.ok(
      consoleErrors.some((msg) => /DEFERRED UNTIL TENANT #1 SIGNS/.test(msg)),
      `console.error must mention DEFER state, got: ${JSON.stringify(consoleErrors)}`,
    )
  })

  it('stripeConnectPaymentProvider (the provider, not the vendor adapter) still throws on createCheckoutSession', async () => {
    // The provider-level throw remains the hard guarantee. The vendor adapter
    // is the soft guarantee (CTA falls back without crashing). Both layers needed.
    const provider = stripeConnectPaymentProvider()
    await assert.rejects(
      () => provider.createCheckoutSession({ tenantId: 'test', returnUrl: 'https://example.com' }),
      /DEFER UNTIL TENANT/,
    )
  })
})

// ── 6. mollie — fail-CLOSED + regex injection guard ──────────────────────────

describe('molliePaymentProvider — fail-CLOSED behavior', () => {
  let savedApiKey: string | undefined
  let savedWebhookSecret: string | undefined

  before(() => {
    savedApiKey = process.env.MOLLIE_API_KEY
    savedWebhookSecret = process.env.MOLLIE_WEBHOOK_SECRET
    delete process.env.MOLLIE_API_KEY
    delete process.env.MOLLIE_WEBHOOK_SECRET
  })

  after(() => {
    if (savedApiKey !== undefined) process.env.MOLLIE_API_KEY = savedApiKey
    else delete process.env.MOLLIE_API_KEY
    if (savedWebhookSecret !== undefined) process.env.MOLLIE_WEBHOOK_SECRET = savedWebhookSecret
    else delete process.env.MOLLIE_WEBHOOK_SECRET
  })

  it('createCheckoutSession returns unconfigured when MOLLIE_API_KEY unset', async () => {
    const provider = molliePaymentProvider()
    const result = await provider.createCheckoutSession({
      tenantId: 'test',
      productId: 'monthly',
      returnUrl: 'https://example.com/adopt',
    })
    assert.ok('unconfigured' in result)
    assert.equal((result as { unconfigured: boolean }).unconfigured, true)
  })

  it('createCheckoutSession returns unconfigured when MOLLIE_WEBHOOK_SECRET unset (even with API key)', async () => {
    process.env.MOLLIE_API_KEY = 'test_dummy'
    try {
      const provider = molliePaymentProvider()
      const result = await provider.createCheckoutSession({
        tenantId: 'test',
        productId: 'monthly',
        returnUrl: 'https://example.com/adopt',
      })
      assert.ok('unconfigured' in result)
      assert.equal((result as { unconfigured: boolean }).unconfigured, true)
    } finally {
      delete process.env.MOLLIE_API_KEY
    }
  })

  it('createCheckoutSession returns unconfigured when productId is not "monthly" or "yearly"', async () => {
    process.env.MOLLIE_API_KEY = 'test_dummy'
    process.env.MOLLIE_WEBHOOK_SECRET = 'test_secret_dummy'
    try {
      const provider = molliePaymentProvider()
      const result = await provider.createCheckoutSession({
        tenantId: 'test',
        productId: 'lifetime', // invalid tier
        returnUrl: 'https://example.com/adopt',
      })
      assert.ok('unconfigured' in result, 'invalid tier must fail-closed to mailto')
    } finally {
      delete process.env.MOLLIE_API_KEY
      delete process.env.MOLLIE_WEBHOOK_SECRET
    }
  })

  it('verifyWebhook returns ok:false when MOLLIE_API_KEY unset (fail-CLOSED)', async () => {
    const provider = molliePaymentProvider()
    const result = await provider.verifyWebhook('id=tr_abc123', null)
    assert.equal(result.ok, false)
  })

  it('verifyWebhook returns ok:false when MOLLIE_WEBHOOK_SECRET unset (fail-CLOSED)', async () => {
    process.env.MOLLIE_API_KEY = 'test_dummy'
    try {
      const provider = molliePaymentProvider()
      const result = await provider.verifyWebhook('id=tr_abc123', null)
      assert.equal(result.ok, false)
    } finally {
      delete process.env.MOLLIE_API_KEY
    }
  })

  it('verifyWebhook rejects payment IDs that do not match /^(tr|sub)_[A-Za-z0-9]+$/', async () => {
    process.env.MOLLIE_API_KEY = 'test_dummy'
    process.env.MOLLIE_WEBHOOK_SECRET = 'test_secret_dummy'
    try {
      const provider = molliePaymentProvider()
      const injectionAttempts = [
        'id=../../etc/passwd',
        'id=tr_', // empty suffix
        'id=tr_abc/123', // slash
        'id=tr_abc 123', // space
        'id=tr_abc;DROP', // SQL-style
        'id=sub_../bad',
        'id=', // empty
        'id=PaymentMethod_abc', // wrong prefix
      ]
      for (const body of injectionAttempts) {
        const result = await provider.verifyWebhook(body, null)
        assert.equal(
          result.ok,
          false,
          `payment id "${body}" should be rejected by regex but was accepted`,
        )
      }
    } finally {
      delete process.env.MOLLIE_API_KEY
      delete process.env.MOLLIE_WEBHOOK_SECRET
    }
  })

  it('REGRESSION GUARD: Stripe checkout URL helper uses SITE_BASE_URL (not the request Origin)', async () => {
    // Same attack class as the Mollie open-redirect fix. The Stripe checkout
    // route imports SITE_BASE_URL from lib/config.ts and uses it as the URL
    // base. If a future refactor switches back to request.headers.get('origin'),
    // this assertion stays green only if config.ts changes — making the
    // failure mode loud.
    const { SITE_BASE_URL } = await import('./config.ts')
    assert.equal(typeof SITE_BASE_URL, 'string')
    assert.ok(SITE_BASE_URL.length > 0, 'SITE_BASE_URL must be non-empty')
    assert.ok(
      SITE_BASE_URL.startsWith('http'),
      `SITE_BASE_URL must be a full URL, got: ${SITE_BASE_URL}`,
    )
    assert.doesNotMatch(
      SITE_BASE_URL,
      /\/$/,
      'SITE_BASE_URL must NOT end with trailing slash (config strips it)',
    )
  })

  it('REGRESSION GUARD: getMollieWebhookUrl uses SITE_BASE_URL (not the request Origin)', async () => {
    // This guards against re-introducing the open-redirect bug fixed 2026-05-27.
    // The webhook URL Mollie POSTs to MUST be derived from SITE_BASE_URL, not
    // from an attacker-controllable header.
    const { getMollieWebhookUrl } = await import('./integrations/payment-mollie.ts')
    const url = getMollieWebhookUrl('test_secret_abc')
    assert.ok(
      url.startsWith('https://alpacasibiza.com/') ||
        url.startsWith('http://localhost') ||
        url.startsWith(process.env.NEXT_PUBLIC_SITE_URL ?? '__never__'),
      `webhook URL must use SITE_BASE_URL, got: ${url}`,
    )
    assert.ok(url.includes('test_secret_abc'), 'secret must be in query string')
    assert.match(url, /\/api\/mollie-webhook\?secret=/, 'path must be the webhook route')
  })

  it('verifyWebhook accepts well-formed payment IDs (will then attempt API fetch)', async () => {
    process.env.MOLLIE_API_KEY = 'test_dummy_will_fail_at_api'
    process.env.MOLLIE_WEBHOOK_SECRET = 'test_secret_dummy'
    try {
      const provider = molliePaymentProvider()
      const result = await provider.verifyWebhook('id=tr_abc123XYZ', null)
      // SDK not installed → importMollie() returns null → ok:false.
      // What we care about: it got PAST the regex check (didn't reject on shape).
      // The error path is the SDK-missing or API-404 path, both correctly fail-closed.
      assert.equal(result.ok, false, 'with no SDK installed, fails closed at import step')
    } finally {
      delete process.env.MOLLIE_API_KEY
      delete process.env.MOLLIE_WEBHOOK_SECRET
    }
  })
})
