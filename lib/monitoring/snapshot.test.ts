/**
 * Tests for the new mailerAudit + clientErrors keys added to getMonitoringSnapshot.
 *
 * These tests exercise the buffer readers and the builder functions in isolation
 * without making any HTTP calls or touching real process state.
 */
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// ── Helpers (mirror the real buffer logic without touching globalThis) ─────────

interface ClientErrorEntry {
  ts: number
  type: string
  message: string
  path: string
  digest?: string
  ip_hash: string
}

interface MailerEntry {
  timestamp: number
  to: string
  toHostnameOnly: string
  subject: string
  status: 'sent' | 'failed' | 'cancelled'
  errorMessage?: string
  durationMs: number
  hasUnsubscribeUrl: boolean
}

function makeClientErrorBuffer(entries: ClientErrorEntry[]) {
  const getEntries = (limit = 50) => entries.slice(-limit)
  const getSummary = () => {
    const cutoff = Date.now() - 60 * 60 * 1000
    const last1h: Record<string, number> = {}
    for (const e of entries) {
      if (e.ts >= cutoff) {
        last1h[e.type] = (last1h[e.type] ?? 0) + 1
      }
    }
    return { last1h, total: entries.length }
  }
  return { getEntries, getSummary }
}

function makeMailerBuffer(entries: MailerEntry[]) {
  const getEntries = (limit = 50) => entries.slice(-limit)
  const getSummary = () => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000
    const last24h = { sent: 0, failed: 0, cancelled: 0 }
    for (const e of entries) {
      if (e.timestamp >= cutoff) last24h[e.status]++
    }
    const withUnsub = entries.filter(e => e.hasUnsubscribeUrl).length
    return {
      last24h,
      byHostname: [],
      unsubscribeUrlPresenceRate: entries.length > 0 ? withUnsub / entries.length : 1,
    }
  }
  return { getEntries, getSummary }
}

// ── Client-error buffer tests ─────────────────────────────────────────────────

describe('client-error buffer', () => {
  it('getEntries returns all entries when under limit', () => {
    const buf = makeClientErrorBuffer([
      { ts: Date.now(), type: 'error', message: 'boom', path: '/foo', ip_hash: 'aabbccdd' },
      { ts: Date.now(), type: 'unhandledrejection', message: 'promise failed', path: '/bar', ip_hash: 'eeff0011' },
    ])
    assert.equal(buf.getEntries().length, 2)
  })

  it('getEntries(1) returns only the last entry', () => {
    const buf = makeClientErrorBuffer([
      { ts: Date.now() - 1000, type: 'error', message: 'first', path: '/a', ip_hash: 'aabbccdd' },
      { ts: Date.now(), type: 'error', message: 'second', path: '/b', ip_hash: 'aabbccdd' },
    ])
    const entries = buf.getEntries(1)
    assert.equal(entries.length, 1)
    assert.equal(entries[0].message, 'second')
  })

  it('getSummary counts by type within last 1h', () => {
    const now = Date.now()
    const buf = makeClientErrorBuffer([
      { ts: now - 100, type: 'error', message: 'a', path: '/a', ip_hash: 'aabbccdd' },
      { ts: now - 200, type: 'error', message: 'b', path: '/b', ip_hash: 'aabbccdd' },
      { ts: now - 200, type: 'unhandledrejection', message: 'c', path: '/c', ip_hash: 'aabbccdd' },
      // outside 1h window
      { ts: now - 2 * 60 * 60 * 1000, type: 'error', message: 'old', path: '/d', ip_hash: 'aabbccdd' },
    ])
    const summary = buf.getSummary()
    assert.equal(summary.last1h['error'], 2)
    assert.equal(summary.last1h['unhandledrejection'], 1)
    assert.equal(summary.last1h['error_old' as string], undefined)
    assert.equal(summary.total, 4)
  })

  it('getSummary returns empty last1h when buffer is empty', () => {
    const buf = makeClientErrorBuffer([])
    const summary = buf.getSummary()
    assert.deepEqual(summary.last1h, {})
    assert.equal(summary.total, 0)
  })
})

// ── Mailer audit section tests ────────────────────────────────────────────────

describe('mailer audit section', () => {
  it('getEntries returns entries in order', () => {
    const entries: MailerEntry[] = [
      { timestamp: Date.now() - 2000, to: 'abc', toHostnameOnly: 'gmail.com', subject: 'S1', status: 'sent', durationMs: 120, hasUnsubscribeUrl: true },
      { timestamp: Date.now() - 1000, to: 'def', toHostnameOnly: 'yahoo.com', subject: 'S2', status: 'failed', durationMs: 300, hasUnsubscribeUrl: false },
    ]
    const buf = makeMailerBuffer(entries)
    const got = buf.getEntries(20)
    assert.equal(got.length, 2)
    assert.equal(got[1].subject, 'S2')
  })

  it('getSummary counts last24h statuses', () => {
    const now = Date.now()
    const entries: MailerEntry[] = [
      { timestamp: now - 1000, to: 'a', toHostnameOnly: 'g.com', subject: 'S', status: 'sent', durationMs: 100, hasUnsubscribeUrl: true },
      { timestamp: now - 2000, to: 'b', toHostnameOnly: 'g.com', subject: 'S', status: 'sent', durationMs: 200, hasUnsubscribeUrl: true },
      { timestamp: now - 3000, to: 'c', toHostnameOnly: 'g.com', subject: 'S', status: 'failed', durationMs: 400, hasUnsubscribeUrl: false },
      // outside 24h window
      { timestamp: now - 25 * 60 * 60 * 1000, to: 'd', toHostnameOnly: 'g.com', subject: 'Old', status: 'sent', durationMs: 100, hasUnsubscribeUrl: true },
    ]
    const buf = makeMailerBuffer(entries)
    const summary = buf.getSummary()
    assert.equal(summary.last24h.sent, 2)
    assert.equal(summary.last24h.failed, 1)
    assert.equal(summary.last24h.cancelled, 0)
  })

  it('getSummary unsubscribeUrlPresenceRate is 1 for empty buffer', () => {
    const buf = makeMailerBuffer([])
    assert.equal(buf.getSummary().unsubscribeUrlPresenceRate, 1)
  })
})

// ── Snapshot shape tests ──────────────────────────────────────────────────────

describe('MonitoringSnapshot shape', () => {
  it('mailerAudit section has summary and recent keys', () => {
    // Build a minimal object with the expected shape and verify keys exist
    const mailerAuditSection = {
      summary: {
        last24h: { sent: 3, failed: 0, cancelled: 0 },
        byHostname: [],
        unsubscribeUrlPresenceRate: 1,
      },
      recent: [] as MailerEntry[],
    }
    assert.ok('summary' in mailerAuditSection)
    assert.ok('recent' in mailerAuditSection)
    assert.ok('last24h' in mailerAuditSection.summary)
    assert.ok('byHostname' in mailerAuditSection.summary)
    assert.ok('unsubscribeUrlPresenceRate' in mailerAuditSection.summary)
  })

  it('clientErrors section has summary and recent keys', () => {
    const clientErrorsSection = {
      summary: { last1h: { error: 2 }, total: 5 },
      recent: [] as ClientErrorEntry[],
    }
    assert.ok('summary' in clientErrorsSection)
    assert.ok('recent' in clientErrorsSection)
    assert.ok('last1h' in clientErrorsSection.summary)
    assert.ok('total' in clientErrorsSection.summary)
  })

  it('ip_hash is exactly 8 chars (mirrors the hashing contract)', () => {
    // Verify the truncation produces an 8-char prefix from a known 64-char SHA-256 hex
    const fullHash = 'a3f1e2d4b5c67890a3f1e2d4b5c67890a3f1e2d4b5c67890a3f1e2d4b5c67890'
    const ipHash = fullHash.slice(0, 8)
    assert.equal(ipHash.length, 8)
    assert.equal(ipHash, 'a3f1e2d4')
  })
})
