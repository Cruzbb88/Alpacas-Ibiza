import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { handleBookingPaymentPaid, type ConfirmFn } from './confirm-payment.ts'
import type { ConfirmResult } from './store.ts'

const NOW = new Date('2026-07-01T10:00:00Z')
const EVENT = { bookingId: 'bk_1', paymentRef: 'pay_1' }

/** A confirm stub that always returns the given result. */
const confirmStub = (r: ConfirmResult): ConfirmFn => async () => r

/** A refund spy — records calls, returns the configured success flag. */
function refundSpy(ok: boolean) {
  const calls: string[] = []
  const fn = async (paymentRef: string) => {
    calls.push(paymentRef)
    return ok
  }
  return { fn, calls }
}

describe('handleBookingPaymentPaid — confirm path (money is kept)', () => {
  it('confirmed → status confirmed, NO refund issued', async () => {
    const refund = refundSpy(true)
    const out = await handleBookingPaymentPaid(
      EVENT, refund.fn, NOW, confirmStub({ ok: true, status: 'confirmed' }),
    )
    assert.deepEqual(out, { status: 'confirmed' })
    assert.equal(refund.calls.length, 0) // never refund a kept seat
  })

  it('already_confirmed (duplicate webhook) → idempotent, NO refund', async () => {
    const refund = refundSpy(true)
    const out = await handleBookingPaymentPaid(
      EVENT, refund.fn, NOW, confirmStub({ ok: true, status: 'already_confirmed' }),
    )
    assert.deepEqual(out, { status: 'already_confirmed' })
    assert.equal(refund.calls.length, 0)
  })
})

describe('handleBookingPaymentPaid — refund path (money is returned)', () => {
  for (const reason of ['expired', 'cancelled', 'conflict'] as const) {
    it(`refund:${reason} → refunds the payment exactly once`, async () => {
      const refund = refundSpy(true)
      const out = await handleBookingPaymentPaid(
        EVENT, refund.fn, NOW, confirmStub({ ok: false, refund: true, reason }),
      )
      assert.deepEqual(out, { status: 'refunded', reason, refundOk: true })
      assert.deepEqual(refund.calls, ['pay_1']) // exactly the paid ref, once
    })
  }

  it('refund vendor call fails → refundOk:false (owner-alert, still resolves)', async () => {
    const refund = refundSpy(false)
    const out = await handleBookingPaymentPaid(
      EVENT, refund.fn, NOW, confirmStub({ ok: false, refund: true, reason: 'conflict' }),
    )
    assert.deepEqual(out, { status: 'refunded', reason: 'conflict', refundOk: false })
  })

  it('refund fn THROWS → swallowed to refundOk:false (webhook can still 200)', async () => {
    const throwingRefund = async () => { throw new Error('vendor 500') }
    const out = await handleBookingPaymentPaid(
      EVENT, throwingRefund, NOW, confirmStub({ ok: false, refund: true, reason: 'expired' }),
    )
    assert.deepEqual(out, { status: 'refunded', reason: 'expired', refundOk: false })
  })
})

describe('handleBookingPaymentPaid — infrastructure misses (never refund)', () => {
  it('no_db → status no_db, NO refund (we did not take the seat)', async () => {
    const refund = refundSpy(true)
    const out = await handleBookingPaymentPaid(
      EVENT, refund.fn, NOW, confirmStub({ ok: false, refund: false, reason: 'no_db' }),
    )
    assert.deepEqual(out, { status: 'no_db' })
    assert.equal(refund.calls.length, 0)
  })

  it('not_found → status not_found, NO automatic refund', async () => {
    const refund = refundSpy(true)
    const out = await handleBookingPaymentPaid(
      EVENT, refund.fn, NOW, confirmStub({ ok: false, refund: false, reason: 'not_found' }),
    )
    assert.deepEqual(out, { status: 'not_found' })
    assert.equal(refund.calls.length, 0)
  })
})
