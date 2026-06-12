import { Resend } from 'resend'
import { createHash } from 'crypto'
import { isSuppressed, getSuppression } from './email-suppression.ts'
import { withRetry } from './retry'

const resend = new Resend(process.env.RESEND_API_KEY)
const DEFAULT_TO = process.env.CONTACT_EMAIL ?? 'info@alpacasibiza.com'
const FROM_EMAIL = `Alpacas Ibiza Website <noreply@alpacasibiza.com>`

// ── Audit ring buffer ─────────────────────────────────────────────────────────
//
// Process-scoped FIFO of the last 200 sends. Lost on cold start — same
// tradeoff as ADR 001 (booking-schedule-store). SHA-256 hashes `to` for
// GDPR Art 5(1)(c) data-minimisation: the owner only needs aggregate
// failure-rate per hostname, not per-subscriber email addresses.
//
// The buffer NEVER blocks or throws — all mutations are wrapped in try/catch.

export interface MailerAuditEntry {
  timestamp: number            // Date.now()
  to: string                   // SHA-256 hex of trimmed lower-case address
  toHostnameOnly: string       // e.g. "gmail.com" — useful for failure-rate by host
  subject: string              // capped at 80 chars
  status: 'sent' | 'failed' | 'cancelled'
  errorMessage?: string        // first 200 chars if status='failed'
  durationMs: number
  hasUnsubscribeUrl: boolean   // compliance check: should be true for newsletter sends
}

export interface MailerAuditSummary {
  last24h: { sent: number; failed: number; cancelled: number }
  byHostname: Array<{ hostname: string; sent: number; failed: number }>
  unsubscribeUrlPresenceRate: number  // 0..1 — 1.0 = all sends had unsubscribe header
}

const AUDIT_BUFFER_SIZE = 200

// globalThis singleton: survives HMR in dev (same pattern as __webhookIdempotencyStore)
const globalForAudit = globalThis as unknown as {
  __mailerAuditBuffer?: MailerAuditEntry[]
}

if (!globalForAudit.__mailerAuditBuffer) {
  globalForAudit.__mailerAuditBuffer = []
}

function appendAuditEntry(entry: MailerAuditEntry): void {
  try {
    const buf = globalForAudit.__mailerAuditBuffer!
    buf.push(entry)
    // FIFO eviction: drop the oldest when over the cap
    if (buf.length > AUDIT_BUFFER_SIZE) {
      buf.splice(0, buf.length - AUDIT_BUFFER_SIZE)
    }
  } catch {
    // fail-quiet: buffer issues never break the actual send
  }
}

function hashEmail(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
}

function hostnameOf(email: string): string {
  const at = email.indexOf('@')
  return at >= 0 ? email.slice(at + 1).toLowerCase() : 'unknown'
}

/**
 * Returns the last `limit` audit entries (most-recent last).
 * Safe to call from monitoring / admin routes.
 */
export function getMailerAuditEntries(limit = 50): MailerAuditEntry[] {
  try {
    const buf = globalForAudit.__mailerAuditBuffer ?? []
    return buf.slice(-limit)
  } catch {
    return []
  }
}

/**
 * Returns aggregate statistics over the ring buffer.
 * Safe to call from monitoring / admin routes.
 */
export function getMailerAuditSummary(): MailerAuditSummary {
  try {
    const buf = globalForAudit.__mailerAuditBuffer ?? []
    const cutoff = Date.now() - 24 * 60 * 60 * 1000

    const last24h = { sent: 0, failed: 0, cancelled: 0 }
    const hostnameMap = new Map<string, { sent: number; failed: number }>()
    let withUnsubscribe = 0

    for (const e of buf) {
      if (e.timestamp >= cutoff) {
        last24h[e.status]++
      }

      // hostname breakdown covers all entries in the buffer (not just 24h)
      const existing = hostnameMap.get(e.toHostnameOnly) ?? { sent: 0, failed: 0 }
      if (e.status === 'sent') existing.sent++
      else if (e.status === 'failed') existing.failed++
      hostnameMap.set(e.toHostnameOnly, existing)

      if (e.hasUnsubscribeUrl) withUnsubscribe++
    }

    const byHostname = Array.from(hostnameMap.entries())
      .map(([hostname, counts]) => ({ hostname, ...counts }))
      .sort((a, b) => (b.sent + b.failed) - (a.sent + a.failed))

    const unsubscribeUrlPresenceRate = buf.length > 0 ? withUnsubscribe / buf.length : 1

    return { last24h, byHostname, unsubscribeUrlPresenceRate }
  } catch {
    return {
      last24h: { sent: 0, failed: 0, cancelled: 0 },
      byHostname: [],
      unsubscribeUrlPresenceRate: 1,
    }
  }
}

// ── Public interface ──────────────────────────────────────────────────────────

export interface SendEmailOptions {
    subject: string
    html: string
    to?: string
    replyTo?: string
    /**
     * Optional ISO 8601 timestamp (e.g. "2026-05-12T09:30:00Z") OR Resend
     * natural-language form (e.g. "in 48 hours") to defer send until later.
     * Max ~30 days ahead per Resend docs.
     */
    scheduledAt?: string
    /**
     * Optional unsubscribe URL. When provided, adds RFC 8058 headers:
     *   List-Unsubscribe: <url>, <mailto:...>
     *   List-Unsubscribe-Post: List-Unsubscribe=One-Click
     *
     * Required by CAN-SPAM § 5(a)(3) and EU PECR for bulk/newsletter emails.
     * Resend supports arbitrary headers via the `headers` field in the send payload.
     */
    listUnsubscribeUrl?: string
    /**
     * Optional file attachments. Each item maps to a Resend attachment object.
     * `content` must be a base64-encoded string of the file data.
     * `contentType` defaults to application/octet-stream if omitted.
     */
    attachments?: Array<{ filename: string; content: string; contentType?: string }>
}

/**
 * Send an email via Resend. Returns the resulting email ID (needed if the
 * caller later wants to cancel a scheduled send).
 */
export async function sendEmail({
    subject,
    html,
    to = DEFAULT_TO,
    replyTo,
    scheduledAt,
    listUnsubscribeUrl,
    attachments,
}: SendEmailOptions): Promise<{ id: string | null }> {
    // Suppression gate — protect sender reputation. /api/resend-webhook adds
    // bounced + complained addresses to the in-memory suppression store;
    // every subsequent send to that address is skipped here BEFORE the
    // Resend API call so we don't rack up bounce count + cost.
    // The owner CONTACT_EMAIL fallback is never suppressed (admin notifications
    // must always go through; the owner can unsuppress their own address via
    // a future admin page if it ever lands in the store).
    if (to !== DEFAULT_TO && isSuppressed(to)) {
        const entry = getSuppression(to)
        console.warn(`[mailer] skipping send to suppressed address: reason=${entry?.reason ?? 'unknown'}, subject="${subject}"`)

        appendAuditEntry({
            timestamp: Date.now(),
            to: hashEmail(to),
            toHostnameOnly: hostnameOf(to),
            subject: subject.slice(0, 80),
            status: 'cancelled',
            durationMs: 0,
            hasUnsubscribeUrl: !!listUnsubscribeUrl,
        })

        return { id: null }
    }

    // Build List-Unsubscribe headers when a per-recipient URL is supplied.
    // Resend accepts `headers: Record<string, string>` on the email payload.
    const listUnsubscribeHeaders: Record<string, string> = listUnsubscribeUrl
        ? {
            'List-Unsubscribe': `<${listUnsubscribeUrl}>, <mailto:unsubscribe@alpacasibiza.com>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          }
        : {}

    // Map attachments to Resend's shape: { filename, content (base64), content_type }
    const resendAttachments = attachments?.map(a => ({
        filename: a.filename,
        content: a.content,
        content_type: a.contentType ?? 'application/octet-stream',
    }))

    const startMs = Date.now()

    // Retry on transient Resend failures: 3 attempts, exponential backoff starting at 100ms.
    const { data, error } = await withRetry(
        () => resend.emails.send({
            from: FROM_EMAIL,
            to,
            subject,
            html,
            replyTo,
            ...(scheduledAt ? { scheduledAt } : {}),
            ...(Object.keys(listUnsubscribeHeaders).length > 0 ? { headers: listUnsubscribeHeaders } : {}),
            ...(resendAttachments && resendAttachments.length > 0 ? { attachments: resendAttachments } : {}),
        }),
        { attempts: 3, baseDelayMs: 100 },
    )

    const durationMs = Date.now() - startMs

    if (error) {
        appendAuditEntry({
            timestamp: Date.now(),
            to: hashEmail(to),
            toHostnameOnly: hostnameOf(to),
            subject: subject.slice(0, 80),
            status: 'failed',
            errorMessage: (error.message ?? 'Unknown email error').slice(0, 200),
            durationMs,
            hasUnsubscribeUrl: !!listUnsubscribeUrl,
        })
        throw new Error(error.message || 'Unknown email error')
    }

    appendAuditEntry({
        timestamp: Date.now(),
        to: hashEmail(to),
        toHostnameOnly: hostnameOf(to),
        subject: subject.slice(0, 80),
        status: 'sent',
        durationMs,
        hasUnsubscribeUrl: !!listUnsubscribeUrl,
    })

    return { id: data?.id ?? null }
}

/**
 * Cancel a previously scheduled Resend email by its ID.
 * Safe to call on already-sent emails — Resend no-ops.
 */
export async function cancelScheduledEmail(id: string): Promise<boolean> {
    try {
        await resend.emails.cancel(id)
        return true
    } catch (err) {
        console.warn('[mailer] cancel scheduled email failed:', (err as Error).message)
        return false
    }
}
