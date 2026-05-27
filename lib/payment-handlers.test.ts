/**
 * Tests for handleStripeCheckoutCompleted — the pure event handler extracted
 * from app/api/stripe-webhook/route.ts so it can be tested without HTTP plumbing.
 *
 * Covers:
 *   - Welcome email send happens with correct args
 *   - Discount-codes email scheduled at exactly +5 min
 *   - Fail-quiet: welcome email throws → result reflects it but handler does not throw
 *   - Fail-quiet: discount-codes throws → welcome still counts as sent
 *   - Missing email → skipped, no sends, reason='missing-email'
 *   - Invalid tier → skipped, no sends, reason='invalid-tier'
 *   - escapedName escapes HTML
 *   - processor='Stripe' set on the welcome email html
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import {
  handleStripeCheckoutCompleted,
  handleMolliePaymentPaid,
  handleStripeInvoicePaymentFailed,
  type StripeCheckoutSessionLike,
  type MolliePaymentLike,
  type StripeInvoiceLike,
  type SendEmailFn,
} from './payment-handlers.ts'

// ── Test doubles ─────────────────────────────────────────────────────────────

type CapturedSend = {
  to?: string
  subject: string
  html: string
  scheduledAt?: string
}

function makeSendEmailSpy(overrides?: { throwOn?: 'welcome' | 'codes' | 'all' }): {
  sendEmail: SendEmailFn
  calls: CapturedSend[]
} {
  const calls: CapturedSend[] = []
  let callIndex = 0
  const sendEmail: SendEmailFn = async (opts) => {
    calls.push({
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      scheduledAt: opts.scheduledAt,
    })
    callIndex++
    if (overrides?.throwOn === 'all') throw new Error('test: send failed')
    if (overrides?.throwOn === 'welcome' && callIndex === 1) throw new Error('test: welcome send failed')
    if (overrides?.throwOn === 'codes' && callIndex === 2) throw new Error('test: codes send failed')
    return { id: `email_${callIndex}` }
  }
  return { sendEmail, calls }
}

function makeSession(overrides?: Partial<StripeCheckoutSessionLike>): StripeCheckoutSessionLike {
  return {
    id: 'cs_test_abc123',
    customer: 'cus_test_xyz',
    subscription: 'sub_test_qrs',
    amount_total: 7500,
    currency: 'eur',
    metadata: { tier: 'monthly' },
    customer_details: { email: 'donor@example.com', name: 'Test Donor' },
    ...overrides,
  }
}

// Fixed env vars so welcome / codes templates render predictably
let savedWeaving: string | undefined
let savedFarmshop: string | undefined

before(() => {
  savedWeaving = process.env.ADOPT_DISCOUNT_CODE_WEAVING_10
  savedFarmshop = process.env.ADOPT_DISCOUNT_CODE_FARMSHOP_15
  process.env.ADOPT_DISCOUNT_CODE_WEAVING_10 = 'TESTWEAVE10'
  process.env.ADOPT_DISCOUNT_CODE_FARMSHOP_15 = 'TESTFARM15'
})

after(() => {
  if (savedWeaving !== undefined) process.env.ADOPT_DISCOUNT_CODE_WEAVING_10 = savedWeaving
  else delete process.env.ADOPT_DISCOUNT_CODE_WEAVING_10
  if (savedFarmshop !== undefined) process.env.ADOPT_DISCOUNT_CODE_FARMSHOP_15 = savedFarmshop
  else delete process.env.ADOPT_DISCOUNT_CODE_FARMSHOP_15
})

// ── Happy path ────────────────────────────────────────────────────────────────

describe('handleStripeCheckoutCompleted — happy path (monthly)', () => {
  it('sends welcome email then schedules discount-codes email +5 min later', async () => {
    const fakeNow = 1700000000000 // fixed ms — deterministic scheduledAt
    const { sendEmail, calls } = makeSendEmailSpy()
    const result = await handleStripeCheckoutCompleted(makeSession(), {
      sendEmail,
      now: () => fakeNow,
    })

    assert.equal(result.welcomeSent, true)
    assert.equal(result.codesScheduled, true)
    assert.equal(result.reason, 'ok')
    assert.equal(calls.length, 2, 'should send exactly 2 emails')

    // Call 1: welcome (no scheduledAt)
    assert.equal(calls[0].to, 'donor@example.com')
    assert.equal(calls[0].scheduledAt, undefined, 'welcome email is not scheduled')
    assert.match(calls[0].subject, /Welcome to the herd.*adoption is active/i)
    assert.match(calls[0].html, /Stripe/, 'processor must appear in welcome HTML')
    assert.match(calls[0].html, /cs_test_abc123/, 'paymentRef must appear in welcome HTML')
    assert.match(calls[0].html, /Test Donor/, 'donor name must appear')

    // Call 2: discount-codes (scheduledAt = now + 5min)
    assert.equal(calls[1].to, 'donor@example.com')
    assert.equal(
      calls[1].scheduledAt,
      new Date(fakeNow + 5 * 60 * 1000).toISOString(),
      'codes email scheduledAt must be exactly now + 5min',
    )
    assert.match(calls[1].subject, /Your Adopt-a-Paca discount codes/i)
    assert.match(calls[1].html, /TESTWEAVE10/, 'real weaving code must appear in codes email')
    assert.match(calls[1].html, /TESTFARM15/, 'real farm-shop code must appear')
  })

  it('happy path for yearly tier sends the yearly variant subject', async () => {
    const { sendEmail, calls } = makeSendEmailSpy()
    const result = await handleStripeCheckoutCompleted(
      makeSession({ metadata: { tier: 'yearly' } }),
      { sendEmail },
    )
    assert.equal(result.reason, 'ok')
    assert.match(calls[0].subject, /yearly adoption is active/i)
    assert.match(calls[0].html, /€900 yearly/, 'yearly variant must mention €900')
  })
})

// ── Skipped paths (still return success-shaped result, no throw) ──────────────

describe('handleStripeCheckoutCompleted — skipped paths', () => {
  it('missing email → skip both sends, reason=missing-email', async () => {
    const { sendEmail, calls } = makeSendEmailSpy()
    const result = await handleStripeCheckoutCompleted(
      makeSession({ customer_details: { email: undefined, name: 'Foo' } }),
      { sendEmail },
    )
    assert.equal(result.welcomeSent, false)
    assert.equal(result.codesScheduled, false)
    assert.equal(result.reason, 'missing-email')
    assert.equal(calls.length, 0, 'no emails sent when donor email missing')
  })

  it('missing customer_details entirely → skip with reason=missing-email', async () => {
    const { sendEmail, calls } = makeSendEmailSpy()
    const result = await handleStripeCheckoutCompleted(
      makeSession({ customer_details: undefined }),
      { sendEmail },
    )
    assert.equal(result.reason, 'missing-email')
    assert.equal(calls.length, 0)
  })

  it('invalid tier (e.g. metadata.tier=lifetime) → skip, reason=invalid-tier', async () => {
    const { sendEmail, calls } = makeSendEmailSpy()
    const result = await handleStripeCheckoutCompleted(
      makeSession({ metadata: { tier: 'lifetime' } }),
      { sendEmail },
    )
    assert.equal(result.reason, 'invalid-tier')
    assert.equal(calls.length, 0, 'invalid tier must not trigger any send')
  })

  it('missing metadata entirely → skip, reason=invalid-tier', async () => {
    const { sendEmail, calls } = makeSendEmailSpy()
    const result = await handleStripeCheckoutCompleted(
      makeSession({ metadata: null }),
      { sendEmail },
    )
    assert.equal(result.reason, 'invalid-tier')
    assert.equal(calls.length, 0)
  })
})

// ── Fail-quiet paths — handler MUST NOT throw ────────────────────────────────

describe('handleStripeCheckoutCompleted — fail-quiet on send errors', () => {
  it('welcome email throws → reason=welcome-send-failed; codes STILL attempted in parallel', async () => {
    // Parallel sends mean codes is fired even if welcome rejects. The handler
    // reports welcome-send-failed as the dominant reason (welcome is more
    // critical than codes). Handler MUST NOT throw — Stripe retry would spam donor.
    const { sendEmail, calls } = makeSendEmailSpy({ throwOn: 'welcome' })
    let threw = false
    let result
    try {
      result = await handleStripeCheckoutCompleted(makeSession(), { sendEmail })
    } catch {
      threw = true
    }
    assert.equal(threw, false, 'handler MUST NOT throw — would cause Stripe to retry-spam donor')
    assert.ok(result)
    assert.equal(result.welcomeSent, false)
    assert.equal(result.codesScheduled, true, 'codes still scheduled despite welcome failure (parallel sends)')
    assert.equal(result.reason, 'welcome-send-failed')
    assert.equal(calls.length, 2, 'both fire in parallel regardless of welcome outcome')
  })

  it('discount-codes throws but welcome succeeded → reason=codes-send-failed, welcomeSent=true', async () => {
    const { sendEmail, calls } = makeSendEmailSpy({ throwOn: 'codes' })
    let threw = false
    let result
    try {
      result = await handleStripeCheckoutCompleted(makeSession(), { sendEmail })
    } catch {
      threw = true
    }
    assert.equal(threw, false)
    assert.ok(result)
    assert.equal(result.welcomeSent, true)
    assert.equal(result.codesScheduled, false)
    assert.equal(result.reason, 'codes-send-failed')
    assert.equal(calls.length, 2, 'both attempted in parallel; codes failed')
    assert.ok(result.codesScheduledAt, 'scheduledAt set on the codes attempt')
  })

  it('both emails throw → handler still does not throw', async () => {
    const { sendEmail } = makeSendEmailSpy({ throwOn: 'all' })
    let threw = false
    try {
      await handleStripeCheckoutCompleted(makeSession(), { sendEmail })
    } catch {
      threw = true
    }
    assert.equal(threw, false, 'handler must absorb all email failures')
  })
})

// ── Security & content guarantees ────────────────────────────────────────────

describe('handleStripeCheckoutCompleted — XSS + content guarantees', () => {
  it('escapes donor name in welcome email (XSS guard)', async () => {
    const { sendEmail, calls } = makeSendEmailSpy()
    await handleStripeCheckoutCompleted(
      makeSession({
        customer_details: {
          email: 'attacker@evil.com',
          name: '<script>alert("xss")</script>',
        },
      }),
      { sendEmail },
    )
    assert.doesNotMatch(
      calls[0].html,
      /<script>alert/,
      'raw script tag must NOT appear in welcome HTML',
    )
    assert.match(calls[0].html, /&lt;script&gt;/, 'name must be HTML-escaped')
  })

  it('falls back to "Hi there" when name missing (no "Hi undefined" leak)', async () => {
    const { sendEmail, calls } = makeSendEmailSpy()
    await handleStripeCheckoutCompleted(
      makeSession({
        customer_details: { email: 'donor@example.com', name: undefined },
      }),
      { sendEmail },
    )
    assert.match(calls[0].html, /Hi there/, 'should greet "Hi there" when no name')
    assert.doesNotMatch(calls[0].html, /Hi undefined/, 'must never leak "Hi undefined"')
  })

  it('paymentRef (session.id) appears in welcome email for support traceability', async () => {
    const { sendEmail, calls } = makeSendEmailSpy()
    await handleStripeCheckoutCompleted(
      makeSession({ id: 'cs_live_unique_id_XYZ' }),
      { sendEmail },
    )
    assert.match(calls[0].html, /cs_live_unique_id_XYZ/, 'session.id must appear as paymentRef')
  })
})

// ── Configurable delay ──────────────────────────────────────────────────────

describe('handleStripeCheckoutCompleted — discountCodesDelayMs override', () => {
  it('honors custom delay (useful for staging tests)', async () => {
    const fakeNow = 1700000000000
    const { sendEmail, calls } = makeSendEmailSpy()
    await handleStripeCheckoutCompleted(makeSession(), {
      sendEmail,
      now: () => fakeNow,
      discountCodesDelayMs: 1000, // 1 sec for fast tests
    })
    assert.equal(
      calls[1].scheduledAt,
      new Date(fakeNow + 1000).toISOString(),
      'custom delay should be used instead of default 5min',
    )
  })

  it('default delay is exactly 5 minutes', async () => {
    const fakeNow = 1700000000000
    const { sendEmail, calls } = makeSendEmailSpy()
    await handleStripeCheckoutCompleted(makeSession(), {
      sendEmail,
      now: () => fakeNow,
    })
    const expectedDelayMs = 5 * 60 * 1000
    const actualMs = new Date(calls[1].scheduledAt!).getTime() - fakeNow
    assert.equal(actualMs, expectedDelayMs, 'default delay must be exactly 5 minutes')
  })
})

// ── handleMolliePaymentPaid tests ────────────────────────────────────────────

function makeMolliePayment(overrides?: Partial<MolliePaymentLike>): MolliePaymentLike {
  return {
    id: 'tr_test_abc',
    status: 'paid',
    sequenceType: 'first',
    customerId: 'cst_test_xyz',
    metadata: { product: 'adopt-a-paca', tier: 'monthly', tenantId: 'alpacasibiza' },
    billingEmail: null,
    ...overrides,
  }
}

describe('handleMolliePaymentPaid — monthly first-of-mandate', () => {
  it('creates subscription + sends welcome email in parallel; flow=monthly-first reason=ok', async () => {
    const { sendEmail, calls } = makeSendEmailSpy()
    let subCreated = false
    let customerFetched = false

    const result = await handleMolliePaymentPaid(makeMolliePayment(), {
      sendEmail,
      fetchCustomer: async () => {
        customerFetched = true
        return { email: 'donor@example.com', name: 'Test Donor' }
      },
      createSubscription: async () => {
        subCreated = true
      },
    })

    assert.equal(result.flow, 'monthly-first')
    assert.equal(result.subscriptionCreated, true)
    assert.equal(result.welcomeSent, true)
    assert.equal(result.reason, 'ok')
    assert.equal(subCreated, true)
    assert.equal(customerFetched, true)
    assert.equal(calls.length, 1, 'only one email send — the welcome')
    assert.match(calls[0].html, /Mollie/, 'processor must be Mollie')
    assert.match(calls[0].html, /tr_test_abc/, 'paymentRef must appear')
  })

  it('missing email from customer fetch → flow=monthly-first reason=missing-email', async () => {
    const { sendEmail, calls } = makeSendEmailSpy()
    const result = await handleMolliePaymentPaid(makeMolliePayment(), {
      sendEmail,
      fetchCustomer: async () => ({ email: null, name: null }),
      createSubscription: async () => {},
    })
    assert.equal(result.reason, 'missing-email')
    assert.equal(result.subscriptionCreated, true, 'sub still created even without email')
    assert.equal(result.welcomeSent, false)
    assert.equal(calls.length, 0)
  })

  it('createSubscription throws → handler rethrows so webhook returns 500 (Mollie retries)', async () => {
    const { sendEmail } = makeSendEmailSpy()
    await assert.rejects(
      () =>
        handleMolliePaymentPaid(makeMolliePayment(), {
          sendEmail,
          fetchCustomer: async () => ({ email: 'donor@example.com', name: null }),
          createSubscription: async () => {
            throw new Error('Mollie API 500')
          },
        }),
      /Mollie API 500/,
    )
  })

  it('welcome send throws → flow=monthly-first reason=welcome-send-failed (handler does NOT throw)', async () => {
    const { sendEmail } = makeSendEmailSpy({ throwOn: 'all' })
    let threw = false
    let result
    try {
      result = await handleMolliePaymentPaid(makeMolliePayment(), {
        sendEmail,
        fetchCustomer: async () => ({ email: 'donor@example.com', name: 'Test' }),
        createSubscription: async () => {},
      })
    } catch {
      threw = true
    }
    assert.equal(threw, false, 'handler MUST NOT throw on email failure — Mollie would retry-spam')
    assert.ok(result)
    assert.equal(result.subscriptionCreated, true)
    assert.equal(result.welcomeSent, false)
    assert.equal(result.reason, 'welcome-send-failed')
  })
})

describe('handleMolliePaymentPaid — yearly one-off', () => {
  it('uses billingEmail; flow=yearly-oneoff reason=ok; no subscription created', async () => {
    const { sendEmail, calls } = makeSendEmailSpy()
    let subCalled = false
    const result = await handleMolliePaymentPaid(
      makeMolliePayment({
        sequenceType: 'oneoff',
        customerId: undefined,
        metadata: { product: 'adopt-a-paca', tier: 'yearly' },
        billingEmail: 'yearly-donor@example.com',
      }),
      {
        sendEmail,
        fetchCustomer: async () => ({ email: null, name: null }),
        createSubscription: async () => {
          subCalled = true
        },
      },
    )
    assert.equal(result.flow, 'yearly-oneoff')
    assert.equal(result.subscriptionCreated, false)
    assert.equal(subCalled, false, 'no sub for yearly one-off')
    assert.equal(result.welcomeSent, true)
    assert.equal(result.reason, 'ok')
    assert.equal(calls[0].to, 'yearly-donor@example.com')
    assert.match(calls[0].html, /€900 yearly/, 'yearly copy must appear')
  })

  it('missing billingEmail → reason=missing-email; no welcome sent', async () => {
    const { sendEmail, calls } = makeSendEmailSpy()
    const result = await handleMolliePaymentPaid(
      makeMolliePayment({
        sequenceType: 'oneoff',
        customerId: undefined,
        metadata: { product: 'adopt-a-paca', tier: 'yearly' },
        billingEmail: null,
      }),
      {
        sendEmail,
        fetchCustomer: async () => ({ email: null, name: null }),
        createSubscription: async () => {},
      },
    )
    assert.equal(result.flow, 'yearly-oneoff')
    assert.equal(result.reason, 'missing-email')
    assert.equal(calls.length, 0)
  })
})

describe('handleMolliePaymentPaid — recurring renewal + unmatched', () => {
  it('sequenceType=recurring → flow=recurring-renewal, no email, no sub', async () => {
    const { sendEmail, calls } = makeSendEmailSpy()
    let subCalled = false
    const result = await handleMolliePaymentPaid(
      makeMolliePayment({
        sequenceType: 'recurring',
        metadata: { product: 'adopt-a-paca', tier: 'monthly' },
      }),
      {
        sendEmail,
        fetchCustomer: async () => ({ email: 'donor@example.com', name: 'X' }),
        createSubscription: async () => {
          subCalled = true
        },
      },
    )
    assert.equal(result.flow, 'recurring-renewal')
    assert.equal(result.welcomeSent, false, 'renewals do NOT send welcome (would duplicate)')
    assert.equal(subCalled, false, 'sub already exists on renewals')
    assert.equal(calls.length, 0)
    assert.equal(result.reason, 'ok')
  })

  it('unrecognized metadata.product → flow=unmatched', async () => {
    const { sendEmail } = makeSendEmailSpy()
    const result = await handleMolliePaymentPaid(
      makeMolliePayment({
        metadata: { product: 'gift-card', tier: 'monthly' },
      }),
      {
        sendEmail,
        fetchCustomer: async () => ({ email: 'x@y.com', name: null }),
        createSubscription: async () => {},
      },
    )
    assert.equal(result.flow, 'unmatched')
    assert.equal(result.reason, 'unmatched')
  })
})

// ── handleStripeInvoicePaymentFailed tests ────────────────────────────────

function makeInvoice(overrides?: Partial<StripeInvoiceLike>): StripeInvoiceLike {
  return {
    id: 'in_test_xyz',
    subscription: 'sub_test_abc',
    customer: 'cus_test_qrs',
    customer_email: 'donor@example.com',
    customer_name: 'Test Donor',
    amount_due: 7500,
    currency: 'eur',
    attempt_count: 2,
    next_payment_attempt: 1700000000,
    hosted_invoice_url: 'https://invoice.stripe.com/i/abc',
    ...overrides,
  }
}

describe('handleStripeInvoicePaymentFailed — happy path with owner email', () => {
  it('sends donor + owner email, both fail-quiet in parallel', async () => {
    const { sendEmail, calls } = makeSendEmailSpy()
    const result = await handleStripeInvoicePaymentFailed(makeInvoice(), {
      sendEmail,
      ownerEmail: 'owner@alpacasibiza.com',
    })
    assert.equal(result.reason, 'ok')
    assert.equal(result.donorNotified, true)
    assert.equal(result.ownerNotified, true)
    assert.equal(calls.length, 2)
    assert.equal(calls[0].to, 'donor@example.com')
    assert.equal(calls[1].to, 'owner@alpacasibiza.com')
    assert.match(calls[0].subject, /Action needed/)
    assert.match(calls[1].subject, /\[Adopt-a-Paca\] Payment failed/)
    assert.match(calls[0].html, /Test Donor/, 'donor name interpolated')
    assert.match(calls[0].html, /invoice\.stripe\.com/, 'hosted invoice URL appears')
    assert.match(calls[1].html, /in_test_xyz/, 'owner sees invoice id')
    assert.match(calls[1].html, /75\.00/, 'owner sees amount in EUR')
  })
})

describe('handleStripeInvoicePaymentFailed — donor email missing', () => {
  it('reason=missing-donor-email; nothing sent', async () => {
    const { sendEmail, calls } = makeSendEmailSpy()
    const result = await handleStripeInvoicePaymentFailed(
      makeInvoice({ customer_email: null }),
      { sendEmail, ownerEmail: 'owner@alpacasibiza.com' },
    )
    assert.equal(result.reason, 'missing-donor-email')
    assert.equal(result.donorNotified, false)
    assert.equal(result.ownerNotified, false)
    assert.equal(calls.length, 0)
  })
})

describe('handleStripeInvoicePaymentFailed — XSS guard + owner-email absent', () => {
  it('donor name with <script> is HTML-escaped', async () => {
    const { sendEmail, calls } = makeSendEmailSpy()
    await handleStripeInvoicePaymentFailed(
      makeInvoice({ customer_name: '<script>alert(1)</script>' }),
      { sendEmail, ownerEmail: 'owner@alpacasibiza.com' },
    )
    assert.doesNotMatch(calls[0].html, /<script>alert/, 'raw script must NOT appear')
    assert.match(calls[0].html, /&lt;script&gt;/)
  })

  it('falls back to "Hi there" when customer_name missing', async () => {
    const { sendEmail, calls } = makeSendEmailSpy()
    await handleStripeInvoicePaymentFailed(
      makeInvoice({ customer_name: null }),
      { sendEmail, ownerEmail: 'owner@alpacasibiza.com' },
    )
    assert.match(calls[0].html, /Hi there/)
    assert.doesNotMatch(calls[0].html, /Hi undefined/)
  })

  it('no ownerEmail → only donor send attempted; reason=ok if donor send succeeds', async () => {
    const { sendEmail, calls } = makeSendEmailSpy()
    const result = await handleStripeInvoicePaymentFailed(makeInvoice(), { sendEmail })
    assert.equal(result.reason, 'ok')
    assert.equal(result.donorNotified, true)
    assert.equal(result.ownerNotified, false)
    assert.equal(calls.length, 1, 'only donor send, no owner email')
  })
})

describe('handleStripeInvoicePaymentFailed — fail-quiet on send error', () => {
  it('send throws → handler does NOT throw; reason=send-failed', async () => {
    const { sendEmail } = makeSendEmailSpy({ throwOn: 'all' })
    let threw = false
    let result
    try {
      result = await handleStripeInvoicePaymentFailed(makeInvoice(), {
        sendEmail,
        ownerEmail: 'owner@alpacasibiza.com',
      })
    } catch {
      threw = true
    }
    assert.equal(threw, false, 'handler MUST NOT throw on email failure')
    assert.ok(result)
    assert.equal(result.reason, 'send-failed')
    assert.equal(result.donorNotified, false)
    assert.equal(result.ownerNotified, false)
  })
})
