import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  seatsLeft,
  isHoldExpired,
  decideConfirm,
  decideCancel,
  type BookingRowView,
} from './store-logic.ts'

const T0 = new Date('2026-07-01T10:00:00Z')
const LATER = new Date('2026-07-01T10:30:00Z')

describe('seatsLeft', () => {
  it('nets out holds (bookedCount includes holds) and never goes negative', () => {
    assert.equal(seatsLeft({ capacity: 8, bookedCount: 3 }), 5)
    assert.equal(seatsLeft({ capacity: 8, bookedCount: 8 }), 0)
    assert.equal(seatsLeft({ capacity: 8, bookedCount: 9 }), 0) // clamp
  })
})

describe('isHoldExpired', () => {
  it('no expiry ⇒ never expired', () => {
    assert.equal(isHoldExpired(null, LATER), false)
  })
  it('expired only strictly after the deadline', () => {
    assert.equal(isHoldExpired(T0, LATER), true)
    assert.equal(isHoldExpired(LATER, T0), false)
    assert.equal(isHoldExpired(T0, T0), false) // exactly at deadline = not yet expired
  })
})

const pending = (over: Partial<BookingRowView> = {}): BookingRowView => ({
  status: 'pending',
  holdExpiresAt: new Date('2026-07-01T10:20:00Z'),
  paymentRef: null,
  ...over,
})

describe('decideConfirm (money-safety + idempotency — cb-006 F2/F5)', () => {
  it('pending + valid hold → confirm', () => {
    assert.deepEqual(decideConfirm(pending(), 'pay_1', T0), { action: 'confirm' })
  })
  it('pending + EXPIRED hold → refund (paid but seat may be resold)', () => {
    const late = new Date('2026-07-01T10:21:00Z')
    assert.deepEqual(decideConfirm(pending(), 'pay_1', late), { action: 'refund', reason: 'expired' })
  })
  it('already confirmed with SAME paymentRef → idempotent no-op', () => {
    assert.deepEqual(
      decideConfirm({ status: 'confirmed', holdExpiresAt: null, paymentRef: 'pay_1' }, 'pay_1', T0),
      { action: 'already_confirmed' },
    )
  })
  it('already confirmed with DIFFERENT paymentRef → refund (conflict)', () => {
    assert.deepEqual(
      decideConfirm({ status: 'confirmed', holdExpiresAt: null, paymentRef: 'pay_1' }, 'pay_2', T0),
      { action: 'refund', reason: 'conflict' },
    )
  })
  it('cancelled → refund (seat already released)', () => {
    assert.deepEqual(
      decideConfirm({ status: 'cancelled', holdExpiresAt: null, paymentRef: null }, 'pay_1', T0),
      { action: 'refund', reason: 'cancelled' },
    )
  })
})

describe('decideCancel (restore exactly once — cb-006 F5)', () => {
  it('pending → cancel + restore', () => {
    assert.deepEqual(decideCancel({ status: 'pending' }), { action: 'cancel_and_restore' })
  })
  it('confirmed → cancel + restore', () => {
    assert.deepEqual(decideCancel({ status: 'confirmed' }), { action: 'cancel_and_restore' })
  })
  it('already cancelled → no-op (never double-restore)', () => {
    assert.deepEqual(decideCancel({ status: 'cancelled' }), { action: 'noop' })
  })
})
