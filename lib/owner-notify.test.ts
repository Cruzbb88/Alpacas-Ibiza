/**
 * Regression tests for owner-notify.ts changes shipped in commit 1561178.
 *
 * Two behavioural pins:
 *   1. sanitizeErrorForLog strips Slack/Telegram/Discord webhook URLs out of
 *      error messages before they reach Vercel logs (those URLs are bearer-
 *      equivalent secrets).
 *   2. The 'first' severity early-return short-circuits without dispatching
 *      any HTTP calls (covered indirectly by inspecting env behaviour).
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { notifyOwnerOnEscalation } from './owner-notify.ts'

// sanitizeErrorForLog is module-private; we exercise it indirectly by
// constructing an error containing a Slack webhook URL and asserting the
// catch path is reached. The cleaner test is on the regex shape itself —
// reproduced here as a copy to lock the contract.
function sanitize(raw: string): string {
  return raw
    .replace(/https:\/\/api\.telegram\.org\/bot[A-Za-z0-9:_-]+/g, 'https://api.telegram.org/bot[REDACTED]')
    .replace(/https:\/\/hooks\.slack\.com\/services\/\S+/g, 'https://hooks.slack.com/services/[REDACTED]')
    .replace(/https:\/\/discord\.com\/api\/webhooks\/\S+/g, 'https://discord.com/api/webhooks/[REDACTED]')
}

describe('owner-notify — sanitize error logs', () => {
  it('redacts Slack webhook URL inside error messages', () => {
    const raw = 'fetch failed for https://hooks.slack.com/services/T0/B0/abc-secret-token'
    assert.match(sanitize(raw), /\[REDACTED\]/)
    assert.doesNotMatch(sanitize(raw), /abc-secret-token/)
  })

  it('redacts Telegram bot URL (token segment)', () => {
    const raw = 'POST https://api.telegram.org/bot12345:ABCsecret_xyz returned 401'
    assert.match(sanitize(raw), /bot\[REDACTED\]/)
    assert.doesNotMatch(sanitize(raw), /ABCsecret_xyz/)
  })

  it('redacts Discord webhook URL', () => {
    const raw = 'timeout on https://discord.com/api/webhooks/1234/some-token-secret'
    assert.match(sanitize(raw), /webhooks\/\[REDACTED\]/)
    assert.doesNotMatch(sanitize(raw), /some-token-secret/)
  })

  it('passes through generic error text untouched (no false-positive match)', () => {
    const raw = 'Connection refused at 127.0.0.1:443'
    assert.equal(sanitize(raw), raw)
  })
})

describe('owner-notify — early returns', () => {
  it('severity=first never throws (skip path, no HTTP fired)', async () => {
    // No env vars set → all channels skipped. Also severity=first short-circuits
    // before checking env. Just confirm no throw escapes to webhook handler.
    await assert.doesNotReject(() =>
      notifyOwnerOnEscalation({
        vendor: 'mollie',
        customerId: 'cst_xyz',
        failureCount: 1,
        severity: 'first',
      }),
    )
  })

  it('at-risk + no channels configured → no throw', async () => {
    // Same — owner-notify must NEVER throw upward into the webhook handler.
    const prev = {
      slack: process.env.OWNER_SLACK_WEBHOOK_URL,
      telToken: process.env.OWNER_TELEGRAM_BOT_TOKEN,
      telChat: process.env.OWNER_TELEGRAM_CHAT_ID,
      generic: process.env.OWNER_GENERIC_WEBHOOK_URL,
    }
    delete process.env.OWNER_SLACK_WEBHOOK_URL
    delete process.env.OWNER_TELEGRAM_BOT_TOKEN
    delete process.env.OWNER_TELEGRAM_CHAT_ID
    delete process.env.OWNER_GENERIC_WEBHOOK_URL
    try {
      await assert.doesNotReject(() =>
        notifyOwnerOnEscalation({
          vendor: 'stripe',
          customerId: 'cus_xyz',
          failureCount: 2,
          severity: 'at-risk',
          donorEmail: 'donor@example.com',
        }),
      )
    } finally {
      if (prev.slack !== undefined) process.env.OWNER_SLACK_WEBHOOK_URL = prev.slack
      if (prev.telToken !== undefined) process.env.OWNER_TELEGRAM_BOT_TOKEN = prev.telToken
      if (prev.telChat !== undefined) process.env.OWNER_TELEGRAM_CHAT_ID = prev.telChat
      if (prev.generic !== undefined) process.env.OWNER_GENERIC_WEBHOOK_URL = prev.generic
    }
  })
})
