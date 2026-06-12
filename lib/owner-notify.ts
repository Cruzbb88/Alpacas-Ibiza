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
 * Uses lib/fetch.ts fetchWithTimeout — 2 s ceiling for every outbound HTTP
 * call. Tightened from 5 s because the webhook handler awaits ownerSendPromise
 * before responding 200 to the payment processor (Stripe / Mollie). At 5 s, a
 * single dead notification channel would stall every webhook for 5 s, eating
 * into the processor's 10 s response window and risking retry storms.
 */

import { fetchWithTimeout } from './fetch.ts'

/**
 * Per-channel HTTP timeout. Keep this strictly below the gap between the
 * webhook handler's wall-clock and the payment processor's hard deadline.
 * Stripe = 10 s, Mollie = 15 s. We want notify to fail loudly + fast, not
 * silently delay the webhook.
 */
const NOTIFY_TIMEOUT_MS = 2000

/**
 * Strip secrets out of an error string before it's logged. Telegram bot
 * tokens appear in the request URL; Slack webhook URLs are themselves
 * bearer-equivalent. fetch error messages occasionally embed the full URL
 * verbatim, which would leak the secret to Vercel logs (and downstream
 * to anyone with log-read access).
 */
function sanitizeErrorForLog(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  return raw
    .replace(/https:\/\/api\.telegram\.org\/bot[A-Za-z0-9:_-]+/g, 'https://api.telegram.org/bot[REDACTED]')
    .replace(/https:\/\/hooks\.slack\.com\/services\/\S+/g, 'https://hooks.slack.com/services/[REDACTED]')
    .replace(/https:\/\/discord\.com\/api\/webhooks\/\S+/g, 'https://discord.com/api/webhooks/[REDACTED]')
}

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
    NOTIFY_TIMEOUT_MS,
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
    NOTIFY_TIMEOUT_MS,
  )

  if (!res.ok) {
    throw new Error(`Telegram API returned HTTP ${res.status}`)
  }
}

// ── Discord ──────────────────────────────────────────────────────────────────
// Discord incoming webhooks use their OWN payload shape — `{ content, embeds }`
// — NOT Slack's `{ text, blocks }`. Sending Slack Block Kit to Discord yields a
// 400 "Cannot send an empty message" because Discord ignores `text`/`blocks`.
// Embeds use `{ title, color, fields: [{ name, value, inline }] }`.

async function sendDiscord(
  webhookUrl: string,
  input: EscalationNotification,
): Promise<void> {
  const donorDisplay = input.donorEmail ?? 'anon'
  const payloadText = `🦙 Alpaca adoption: ${severityUpper(input.severity)} — failureCount=${input.failureCount} on ${input.vendor} customer ${input.customerId} (${donorDisplay})`

  const body = JSON.stringify({
    content: payloadText,
    embeds: [
      {
        title: 'Adopt-a-Paca escalation',
        color: 0xcc0000,
        fields: [
          { name: 'Severity', value: severityUpper(input.severity), inline: true },
          { name: 'Failures', value: String(input.failureCount), inline: true },
          { name: 'Vendor', value: String(input.vendor), inline: true },
          { name: 'Donor', value: donorDisplay, inline: true },
          { name: 'Customer', value: `\`${input.customerId}\``, inline: false },
          { name: 'Ref', value: `\`${input.paymentRef ?? '—'}\``, inline: false },
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
    NOTIFY_TIMEOUT_MS,
  )

  if (!res.ok) {
    throw new Error(`Discord webhook returned HTTP ${res.status}`)
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
    NOTIFY_TIMEOUT_MS,
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
  const discordUrl = process.env.OWNER_NOTIFY_DISCORD_URL

  // Fan out all configured channels concurrently. Each is wrapped in its own
  // try/catch so a failure in one does not abort the others.
  await Promise.all([
    slackUrl
      ? sendSlack(slackUrl, input).catch((err: unknown) => {
          console.error('[owner-notify] Slack send failed', { err: sanitizeErrorForLog(err) })
        })
      : Promise.resolve(),

    telegramToken && telegramChatId
      ? sendTelegram(telegramToken, telegramChatId, input).catch((err: unknown) => {
          console.error('[owner-notify] Telegram send failed', { err: sanitizeErrorForLog(err) })
        })
      : Promise.resolve(),

    genericUrl
      ? sendGenericWebhook(genericUrl, input).catch((err: unknown) => {
          console.error('[owner-notify] Generic webhook send failed', { err: sanitizeErrorForLog(err) })
        })
      : Promise.resolve(),

    discordUrl
      ? sendDiscord(discordUrl, input).catch((err: unknown) => {
          console.error('[owner-notify] Discord send failed', { err: sanitizeErrorForLog(err) })
        })
      : Promise.resolve(),
  ])
}
