/**
 * Owner real-time escalation notifications.
 *
 * Fires a fire-and-forget notification to configured channels (Slack, Telegram,
 * generic webhook) when the payment-failure tracker transitions a donor to
 * 'at-risk' or 'action-required'. Skips 'first' — that's noise; the owner
 * email from the payment handler already covers it.
 *
 * All channels are optional. Set any combination; unset channels are silently
 * skipped. Never throws — if it did, it would break the webhook handler's
 * fail-quiet contract and potentially trigger payment-processor retries.
 *
 * Uses lib/fetch.ts fetchWithTimeout (5 s AbortController) for every outbound
 * HTTP call.
 */

import { fetchWithTimeout } from './fetch.ts'

// ── Types ────────────────────────────────────────────────────────────────────

export interface EscalationNotification {
  vendor: 'stripe' | 'mollie'
  customerId: string
  failureCount: number
  severity: 'first' | 'at-risk' | 'action-required'
  donorEmail?: string
  donorName?: string
  paymentRef?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function severityUpper(severity: EscalationNotification['severity']): string {
  return severity === 'action-required'
    ? 'ACTION REQUIRED'
    : severity === 'at-risk'
      ? 'AT-RISK'
      : 'FIRST'
}

// ── Slack ────────────────────────────────────────────────────────────────────

async function sendSlack(
  webhookUrl: string,
  input: EscalationNotification,
): Promise<void> {
  const donorDisplay = input.donorEmail ?? 'anon'
  const severityLabel = input.severity
  const payloadText = `🦙 Alpaca adoption: ${severityUpper(input.severity)} — failureCount=${input.failureCount} on ${input.vendor} customer ${input.customerId} (${donorDisplay})`

  const body = JSON.stringify({
    text: payloadText,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: 'Adopt-a-Paca escalation',
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Severity:* ${severityLabel}` },
          { type: 'mrkdwn', text: `*Failures:* ${input.failureCount}` },
          { type: 'mrkdwn', text: `*Vendor:* ${input.vendor}` },
          { type: 'mrkdwn', text: `*Donor:* ${donorDisplay}` },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Customer: \`${input.customerId}\` | Ref: \`${input.paymentRef ?? '—'}\``,
          },
        ],
      },
    ],
  })

  const res = await fetchWithTimeout(
    webhookUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    },
    5000,
  )

  if (!res.ok) {
    // Throw so the caller's try/catch logs this as a non-fatal error.
    throw new Error(`Slack webhook returned HTTP ${res.status}`)
  }
}

// ── Telegram ─────────────────────────────────────────────────────────────────

async function sendTelegram(
  botToken: string,
  chatId: string,
  input: EscalationNotification,
): Promise<void> {
  const donorDisplay = input.donorEmail ?? 'anonymised'
  // Plain text — avoid Markdown to sidestep Telegram's strict escape rules.
  const text = [
    '🦙 Alpacas Ibiza — Adoption escalation',
    `Severity: ${severityUpper(input.severity)}`,
    `Failures: ${input.failureCount}`,
    `Vendor: ${input.vendor}`,
    `Donor: ${donorDisplay}`,
    `Customer: ${input.customerId}`,
    `Ref: ${input.paymentRef ?? '—'}`,
  ].join('\n')

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`
  const body = JSON.stringify({ chat_id: chatId, text })

  const res = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    },
    5000,
  )

  if (!res.ok) {
    throw new Error(`Telegram API returned HTTP ${res.status}`)
  }
}

// ── Generic webhook ──────────────────────────────────────────────────────────

async function sendGenericWebhook(
  webhookUrl: string,
  input: EscalationNotification,
): Promise<void> {
  const res = await fetchWithTimeout(
    webhookUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input satisfies EscalationNotification),
    },
    5000,
  )

  if (!res.ok) {
    throw new Error(`Generic webhook returned HTTP ${res.status}`)
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Fire escalation notifications to all configured channels.
 *
 * - Skips 'first' severity (noise; owner email from payment handler covers it).
 * - Never throws; all channel errors are console.error'd and swallowed.
 * - Call as `void notifyOwnerOnEscalation(...)` — fire-and-forget.
 */
export async function notifyOwnerOnEscalation(
  input: EscalationNotification,
): Promise<void> {
  // Skip first-time failures — they're noise at the real-time channel level.
  // The owner email from the payment handler already covers 'first'.
  if (input.severity === 'first') return

  const slackUrl = process.env.OWNER_SLACK_WEBHOOK_URL
  const telegramToken = process.env.OWNER_TELEGRAM_BOT_TOKEN
  const telegramChatId = process.env.OWNER_TELEGRAM_CHAT_ID
  const genericUrl = process.env.OWNER_GENERIC_WEBHOOK_URL

  // Fan out all configured channels concurrently. Each is wrapped in its own
  // try/catch so a failure in one does not abort the others.
  await Promise.all([
    slackUrl
      ? sendSlack(slackUrl, input).catch((err: unknown) => {
          console.error('[owner-notify] Slack send failed', { err })
        })
      : Promise.resolve(),

    telegramToken && telegramChatId
      ? sendTelegram(telegramToken, telegramChatId, input).catch((err: unknown) => {
          console.error('[owner-notify] Telegram send failed', { err })
        })
      : Promise.resolve(),

    genericUrl
      ? sendGenericWebhook(genericUrl, input).catch((err: unknown) => {
          console.error('[owner-notify] Generic webhook send failed', { err })
        })
      : Promise.resolve(),
  ])
}
