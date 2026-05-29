/**
 * Tests for the welcomeAdoptionEmailHtml + welcomeAdoptionSubject helpers.
 *
 * Covers:
 *   1. Subject differs between monthly and yearly tiers
 *   2. escapedName renders in the HTML when provided
 *   3. escapedName=undefined renders "Hi there" fallback (NOT "Hi undefined")
 *   4. processor name appears in the rendered HTML
 *   5. paymentRef appears in the rendered HTML when provided
 *   6. paymentRef absence still produces valid HTML (no "undefined")
 *   7. Monthly vs yearly copy differs visibly (€75/month vs €900/yearly)
 *
 * These guard against silent regressions that would leak "Hi undefined" or
 * confusing tier copy to live donors via Stripe/Mollie webhook welcome emails.
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import {
  welcomeAdoptionEmailHtml,
  welcomeAdoptionSubject,
  buildAdoptDiscountCodesEmail,
  donorPaymentFailedSubject,
} from './email-templates.ts'

describe('welcomeAdoptionSubject', () => {
  it('returns distinct, non-empty strings for monthly and yearly', () => {
    const m = welcomeAdoptionSubject('monthly')
    const y = welcomeAdoptionSubject('yearly')
    assert.ok(m.length > 0, 'monthly subject must be non-empty')
    assert.ok(y.length > 0, 'yearly subject must be non-empty')
    assert.notEqual(m, y, 'monthly and yearly subjects must differ')
  })

  it('mentions "adoption" or "herd" so donors recognise the email', () => {
    const m = welcomeAdoptionSubject('monthly')
    const y = welcomeAdoptionSubject('yearly')
    const recognisable = (s: string) =>
      /adopt/i.test(s) || /herd/i.test(s) || /alpaca/i.test(s)
    assert.ok(recognisable(m), `monthly subject lacks recognisable term: "${m}"`)
    assert.ok(recognisable(y), `yearly subject lacks recognisable term: "${y}"`)
  })
})

describe('welcomeAdoptionEmailHtml — name handling', () => {
  it('renders escapedName when provided', () => {
    const html = welcomeAdoptionEmailHtml({
      escapedName: 'Cruz',
      tier: 'monthly',
      processor: 'Stripe',
    })
    assert.match(html, /Hi Cruz/, 'should render "Hi Cruz"')
  })

  it('renders "Hi there" fallback when escapedName is undefined (NO "undefined" leak)', () => {
    const html = welcomeAdoptionEmailHtml({
      tier: 'monthly',
      processor: 'Stripe',
    })
    assert.match(html, /Hi there/, 'should render "Hi there" greeting')
    assert.doesNotMatch(
      html,
      /Hi undefined/,
      'must never render "Hi undefined" — donor-facing trust bug',
    )
    assert.doesNotMatch(
      html,
      /Hi null/,
      'must never render "Hi null" either',
    )
  })

  it('escapedName=empty string falls back to "Hi there" (not "Hi ")', () => {
    const html = welcomeAdoptionEmailHtml({
      escapedName: '',
      tier: 'monthly',
      processor: 'Stripe',
    })
    // Implementation uses truthy check on escapedName; '' is falsy so falls back.
    assert.match(html, /Hi there/, 'empty name should fall back to "Hi there"')
  })
})

describe('welcomeAdoptionEmailHtml — tier copy', () => {
  it('monthly variant mentions €75/month', () => {
    const html = welcomeAdoptionEmailHtml({
      tier: 'monthly',
      processor: 'Stripe',
    })
    assert.match(html, /€75/, 'monthly variant must mention €75 price')
    assert.match(html, /month/i, 'monthly variant must mention "month"')
  })

  it('yearly variant mentions €900 and 12 months', () => {
    const html = welcomeAdoptionEmailHtml({
      tier: 'yearly',
      processor: 'Stripe',
    })
    assert.match(html, /€900/, 'yearly variant must mention €900 price')
    assert.match(html, /12 months/i, 'yearly variant must mention 12 months coverage')
  })

  it('monthly and yearly variants produce different HTML', () => {
    const m = welcomeAdoptionEmailHtml({ tier: 'monthly', processor: 'Stripe' })
    const y = welcomeAdoptionEmailHtml({ tier: 'yearly', processor: 'Stripe' })
    assert.notEqual(m, y, 'monthly and yearly HTML must differ visibly')
  })
})

describe('welcomeAdoptionEmailHtml — processor + paymentRef', () => {
  it('processor name appears in the rendered HTML', () => {
    const stripeHtml = welcomeAdoptionEmailHtml({
      tier: 'monthly',
      processor: 'Stripe',
    })
    const mollieHtml = welcomeAdoptionEmailHtml({
      tier: 'monthly',
      processor: 'Mollie',
    })
    assert.match(stripeHtml, /Stripe/, 'Stripe processor name should appear')
    assert.match(mollieHtml, /Mollie/, 'Mollie processor name should appear')
  })

  it('paymentRef appears in HTML when provided', () => {
    const html = welcomeAdoptionEmailHtml({
      tier: 'monthly',
      processor: 'Stripe',
      paymentRef: 'cs_live_abc123',
    })
    assert.match(html, /cs_live_abc123/, 'payment reference should appear in email')
  })

  it('paymentRef absent does not leak "undefined" into the HTML', () => {
    const html = welcomeAdoptionEmailHtml({
      tier: 'yearly',
      processor: 'Mollie',
    })
    assert.doesNotMatch(html, /undefined/, 'must not leak "undefined" string')
    // It should still mention the processor as a fallback ref line.
    assert.match(html, /Mollie/, 'fallback line should still mention the processor')
  })
})

describe('welcomeAdoptionEmailHtml — content guarantees', () => {
  it('always includes the benefits list', () => {
    const html = welcomeAdoptionEmailHtml({
      tier: 'monthly',
      processor: 'Stripe',
    })
    // Spot-check the 5 confirmed benefit items in "what happens next"
    assert.match(html, /certificate/i, 'should mention adoption certificate')
    assert.match(html, /farm tours/i, 'should mention farm tours')
    assert.match(html, /gift bundle|calendar|planner/i, 'should mention gift bundle')
    assert.match(html, /photoshoot/i, 'should mention photoshoot')
    assert.match(html, /Alcaca/, 'should mention Alcaca fibre shipping')
  })

  it('mentions discount codes coming separately (avoid donor confusion)', () => {
    const html = welcomeAdoptionEmailHtml({
      tier: 'monthly',
      processor: 'Stripe',
    })
    assert.match(html, /10%/, 'should mention 10% Wishfulfilling Weaving discount')
    assert.match(html, /15%/, 'should mention 15% farm-shop discount')
  })
})

// ── buildAdoptDiscountCodesEmail tests ───────────────────────────────────────

describe('buildAdoptDiscountCodesEmail — codes-ready path', () => {
  let savedWeaving: string | undefined
  let savedFarmshop: string | undefined

  before(() => {
    savedWeaving = process.env.ADOPT_DISCOUNT_CODE_WEAVING_10
    savedFarmshop = process.env.ADOPT_DISCOUNT_CODE_FARMSHOP_15
    process.env.ADOPT_DISCOUNT_CODE_WEAVING_10 = 'WEAVE10HERD'
    process.env.ADOPT_DISCOUNT_CODE_FARMSHOP_15 = 'FARM15ADOPT'
  })

  after(() => {
    if (savedWeaving !== undefined) process.env.ADOPT_DISCOUNT_CODE_WEAVING_10 = savedWeaving
    else delete process.env.ADOPT_DISCOUNT_CODE_WEAVING_10
    if (savedFarmshop !== undefined) process.env.ADOPT_DISCOUNT_CODE_FARMSHOP_15 = savedFarmshop
    else delete process.env.ADOPT_DISCOUNT_CODE_FARMSHOP_15
  })

  it('renders both codes verbatim in the HTML', () => {
    const result = buildAdoptDiscountCodesEmail({ name: 'Cruz' })
    assert.match(result.html, /WEAVE10HERD/, 'weaving code must appear')
    assert.match(result.html, /FARM15ADOPT/, 'farm-shop code must appear')
  })

  it('codes-ready subject is "Your Adopt-a-Paca discount codes"', () => {
    const result = buildAdoptDiscountCodesEmail({ name: 'Cruz' })
    assert.match(
      result.subject,
      /Your Adopt-a-Paca discount codes/,
      `unexpected subject: ${result.subject}`,
    )
  })

  it('mentions 10% Wishfulfilling Weaving and 15% Farm Shop', () => {
    const result = buildAdoptDiscountCodesEmail({ name: 'Cruz' })
    assert.match(result.html, /10%[\s\S]*?Wishfulfilling Weaving/, 'mention weaving discount %')
    assert.match(result.html, /15%[\s\S]*?Farm Shop/, 'mention farm-shop discount %')
  })

  it('escapes name to prevent HTML injection (XSS guard)', () => {
    const result = buildAdoptDiscountCodesEmail({
      name: '<script>alert(1)</script>',
    })
    assert.doesNotMatch(
      result.html,
      /<script>alert/,
      'raw script tag must not appear in HTML',
    )
    assert.match(
      result.html,
      /&lt;script&gt;/,
      'name must be HTML-escaped',
    )
  })

  it('falls back to "Hi there" when name is empty', () => {
    const result = buildAdoptDiscountCodesEmail({ name: '' })
    assert.match(result.html, /Hi there/, 'empty name should fall back to "Hi there"')
    assert.doesNotMatch(result.html, /Hi undefined/, 'never leak undefined')
  })
})

describe('buildAdoptDiscountCodesEmail — codes-unset graceful degrade', () => {
  let savedWeaving: string | undefined
  let savedFarmshop: string | undefined

  before(() => {
    savedWeaving = process.env.ADOPT_DISCOUNT_CODE_WEAVING_10
    savedFarmshop = process.env.ADOPT_DISCOUNT_CODE_FARMSHOP_15
    delete process.env.ADOPT_DISCOUNT_CODE_WEAVING_10
    delete process.env.ADOPT_DISCOUNT_CODE_FARMSHOP_15
  })

  after(() => {
    if (savedWeaving !== undefined) process.env.ADOPT_DISCOUNT_CODE_WEAVING_10 = savedWeaving
    if (savedFarmshop !== undefined) process.env.ADOPT_DISCOUNT_CODE_FARMSHOP_15 = savedFarmshop
  })

  it('shows "arriving shortly" placeholder when both codes unset', () => {
    const result = buildAdoptDiscountCodesEmail({ name: 'Cruz' })
    assert.match(
      result.html,
      /arrive shortly|coming|finalising|48 hours/i,
      'should show graceful placeholder',
    )
  })

  it('does NOT invent or render fake codes when env vars unset (PRACTICES Rule 5)', () => {
    const result = buildAdoptDiscountCodesEmail({ name: 'Cruz' })
    // No <code> tag should appear since there are no real codes to render.
    assert.doesNotMatch(
      result.html,
      /<code/,
      'must not render a <code> element with invented codes',
    )
  })

  it('subject signals codes are pending', () => {
    const result = buildAdoptDiscountCodesEmail({ name: 'Cruz' })
    assert.match(
      result.subject,
      /Welcome|on the way|coming/i,
      `unexpected pending-subject: ${result.subject}`,
    )
  })

  it('still produces a valid send-shaped object with subject + html strings', () => {
    const result = buildAdoptDiscountCodesEmail({ name: 'Cruz' })
    assert.equal(typeof result.subject, 'string')
    assert.equal(typeof result.html, 'string')
    assert.ok(result.subject.length > 0, 'subject must be non-empty even when codes unset')
    assert.ok(result.html.length > 0, 'html must be non-empty even when codes unset')
  })
})

describe('buildAdoptDiscountCodesEmail — partial-set is treated as unset', () => {
  let savedWeaving: string | undefined
  let savedFarmshop: string | undefined

  before(() => {
    savedWeaving = process.env.ADOPT_DISCOUNT_CODE_WEAVING_10
    savedFarmshop = process.env.ADOPT_DISCOUNT_CODE_FARMSHOP_15
    process.env.ADOPT_DISCOUNT_CODE_WEAVING_10 = 'ONLYWEAVE'
    delete process.env.ADOPT_DISCOUNT_CODE_FARMSHOP_15
  })

  after(() => {
    if (savedWeaving !== undefined) process.env.ADOPT_DISCOUNT_CODE_WEAVING_10 = savedWeaving
    else delete process.env.ADOPT_DISCOUNT_CODE_WEAVING_10
    if (savedFarmshop !== undefined) process.env.ADOPT_DISCOUNT_CODE_FARMSHOP_15 = savedFarmshop
  })

  it('does NOT render the half-set code (both must be set or neither)', () => {
    const result = buildAdoptDiscountCodesEmail({ name: 'Cruz' })
    assert.doesNotMatch(
      result.html,
      /ONLYWEAVE/,
      'must not render a single code when the other is missing — donor confusion risk',
    )
    assert.match(
      result.html,
      /arrive shortly|coming|finalising|48 hours/i,
      'should fall to placeholder copy',
    )
  })
})

// ── Locale-switched subject lines ────────────────────────────────────────────

describe('welcomeAdoptionSubject — locale switching', () => {
  it('German welcome subject differs from English', () => {
    const en = welcomeAdoptionSubject('monthly', false, 'en')
    const de = welcomeAdoptionSubject('monthly', false, 'de')
    assert.notEqual(de, en, 'German subject must differ from English')
    assert.match(de, /Willkommen|Herde|Patenschaft/, 'German subject should contain a German keyword')
  })

  it('Spanish welcome subject differs from English', () => {
    const en = welcomeAdoptionSubject('yearly', false, 'en')
    const es = welcomeAdoptionSubject('yearly', false, 'es')
    assert.notEqual(es, en, 'Spanish subject must differ from English')
    assert.match(es, /Bienvenido|adopción|manada/, 'Spanish subject should contain a Spanish keyword')
  })

  it('unknown locale falls back to English', () => {
    const en = welcomeAdoptionSubject('monthly')
    const fallback = welcomeAdoptionSubject('monthly', false, 'jp')
    assert.equal(fallback, en, 'unknown locale should fall through to English default')
  })

  it('locale also applies to gift subjects (German + Spanish)', () => {
    const enGift = welcomeAdoptionSubject('yearly', true)
    const deGift = welcomeAdoptionSubject('yearly', true, 'de')
    const esGift = welcomeAdoptionSubject('yearly', true, 'es')
    assert.notEqual(deGift, enGift, 'German gift subject must differ from English')
    assert.notEqual(esGift, enGift, 'Spanish gift subject must differ from English')
    assert.match(deGift, /geschenkt/i, 'German gift subject should contain "geschenkt"')
    assert.match(esGift, /regalado/i, 'Spanish gift subject should contain "regalado"')
  })
})

describe('donorPaymentFailedSubject — locale switching', () => {
  it('German failure subject differs from English at each escalation bucket', () => {
    for (const count of [1, 2, 3]) {
      const en = donorPaymentFailedSubject(count, 'en')
      const de = donorPaymentFailedSubject(count, 'de')
      assert.notEqual(de, en, `German subject must differ from English at count=${count}`)
    }
  })

  it('Spanish failure subject differs from English at each escalation bucket', () => {
    for (const count of [1, 2, 3]) {
      const en = donorPaymentFailedSubject(count, 'en')
      const es = donorPaymentFailedSubject(count, 'es')
      assert.notEqual(es, en, `Spanish subject must differ from English at count=${count}`)
    }
  })

  it('first-fail / at-risk / action-required tones differ within a locale', () => {
    const first = donorPaymentFailedSubject(1, 'de')
    const atRisk = donorPaymentFailedSubject(2, 'de')
    const final = donorPaymentFailedSubject(3, 'de')
    assert.notEqual(first, atRisk, 'first-fail and at-risk must differ')
    assert.notEqual(atRisk, final, 'at-risk and action-required must differ')
    assert.notEqual(first, final, 'first-fail and action-required must differ')
  })

  it('unknown locale falls back to English', () => {
    const en = donorPaymentFailedSubject(1)
    const fallback = donorPaymentFailedSubject(1, 'jp')
    assert.equal(fallback, en, 'unknown locale should fall through to English default')
  })

  it('preserves the existing English "Action needed" copy (payment-handlers.test contract)', () => {
    const en = donorPaymentFailedSubject(1, 'en')
    assert.match(en, /Action needed/, 'English first-fail subject must still match payment-handlers test regex')
  })
})
