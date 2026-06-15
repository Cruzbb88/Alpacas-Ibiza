import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { signBookingManageToken, verifyBookingManageToken } from './booking-manage-token.ts'

// The signing key is read at CALL time (inside sign/verify), not at import — so a
// static import is fine as long as the env is set before the it() blocks run.
before(() => { process.env.NEXTAUTH_SECRET = 'test-signing-secret-booking-manage' })

describe('booking-manage-token', () => {
  it('round-trips: a signed token verifies for the same bookingId', () => {
    const t = signBookingManageToken('bk_abc')
    const p = verifyBookingManageToken(t, 'bk_abc')
    assert.equal(p?.bookingId, 'bk_abc')
    assert.equal(p?.scope, 'booking-manage')
  })

  it('rejects a token presented for a DIFFERENT bookingId (no IDOR)', () => {
    const t = signBookingManageToken('bk_abc')
    assert.equal(verifyBookingManageToken(t, 'bk_other'), null)
  })

  it('rejects a tampered signature', () => {
    const t = signBookingManageToken('bk_abc')
    const tampered = t.slice(0, -2) + (t.endsWith('aa') ? 'bb' : 'aa')
    assert.equal(verifyBookingManageToken(tampered, 'bk_abc'), null)
  })

  it('rejects a tampered payload (different id, original sig)', () => {
    const t = signBookingManageToken('bk_abc')
    const sig = t.slice(t.lastIndexOf('.'))
    const forgedPayload = Buffer.from(JSON.stringify({
      bookingId: 'bk_evil', scope: 'booking-manage',
      expiresAt: new Date(Date.now() + 1e6).toISOString(), nonce: 'x',
    })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    assert.equal(verifyBookingManageToken(forgedPayload + sig, 'bk_evil'), null)
  })

  it('rejects an expired token', () => {
    const t = signBookingManageToken('bk_abc', -1000)
    assert.equal(verifyBookingManageToken(t, 'bk_abc'), null)
  })

  it('rejects an oversized token before HMAC compute (DoS guard)', () => {
    assert.equal(verifyBookingManageToken('a'.repeat(3000), 'bk_abc'), null)
  })

  it('rejects empty / malformed tokens', () => {
    assert.equal(verifyBookingManageToken('', 'bk_abc'), null)
    assert.equal(verifyBookingManageToken('no-dot-here', 'bk_abc'), null)
  })
})
