/**
 * Email suppression list — addresses we will NOT send to.
 *
 * Resend reports bounce / complaint events via webhook. When we receive one,
 * we add the address here; lib/mailer.ts checks before every send.
 *
 * Why this matters
 * ----------------
 * Sender reputation: Gmail / Outlook / Yahoo track per-domain bounce rates.
 * A sustained 5% bounce rate is enough for Gmail to start spam-foldering
 * EVERY message from the domain. Most of our bounces are typo'd recipient
 * addresses ("gift recipient typed wrong by the buyer") — without
 * suppression, every Mollie/Stripe webhook retry re-sends to the bad
 * address and racks up bounces.
 *
 * Reason taxonomy
 * ---------------
 * `hard-bounce` — permanent failure (account doesn't exist, domain dead).
 *                  Never retry. Highest reputation hit.
 * `complaint`   — recipient hit "report spam." NEVER send again — repeated
 *                  spam complaints are blacklisting-level reputation damage.
 * `soft-bounce` — transient (mailbox full, server temporary). NOT added by
 *                  this store by default; Resend retries on its own.
 *
 * Persistence (ADR 001 tradeoff)
 * ------------------------------
 *   - In-memory Set pinned to globalThis. Survives HMR in dev.
 *   - Lost on Vercel cold start → newly-bounced addresses could be re-sent
 *     to ONE TIME post-restart before Resend's next bounce event re-flags
 *     them. Acceptable: one extra bounce per restart is far better than the
 *     uncapped firehose without any suppression.
 *
 * Upgrade trigger: persistent reputation damage observed (Resend dashboard
 * shows a sustained bounce-rate spike post-restart). Migration target:
 * lib/db/schema.ts — new `email_suppressions` table with reason + addedAt
 * columns. Store API stays the same; only the implementation swaps.
 */

export type SuppressionReason = 'hard-bounce' | 'complaint' | 'manual'

interface SuppressionEntry {
  email: string
  reason: SuppressionReason
  addedAt: string
}

const globalForSuppression = globalThis as unknown as {
  __emailSuppressionStore?: Map<string, SuppressionEntry>
}

const _store: Map<string, SuppressionEntry> =
  globalForSuppression.__emailSuppressionStore ?? new Map()

if (process.env.NODE_ENV !== 'production') {
  globalForSuppression.__emailSuppressionStore = _store
}

/** Normalize an email for store key: lowercase + trim. */
function normalize(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Add an address to the suppression list. Idempotent — re-adding the same
 * email with a stronger reason (complaint > hard-bounce) wins; equal-or-
 * weaker reasons keep the existing entry.
 */
export function suppressEmail(email: string, reason: SuppressionReason): void {
  const key = normalize(email)
  if (key.length === 0) return
  const existing = _store.get(key)
  // Reason precedence: complaint > hard-bounce > manual. Once an address is
  // suppressed for spam-complaint, it stays at that reason regardless of
  // any subsequent bounce events.
  if (existing) {
    const order: Record<SuppressionReason, number> = { manual: 0, 'hard-bounce': 1, complaint: 2 }
    if (order[existing.reason] >= order[reason]) return
  }
  _store.set(key, { email: key, reason, addedAt: new Date().toISOString() })
}

/** Returns true when the given address is suppressed. Case-insensitive. */
export function isSuppressed(email: string): boolean {
  return _store.has(normalize(email))
}

/** Returns the suppression entry, or null when the address is not suppressed. */
export function getSuppression(email: string): SuppressionEntry | null {
  return _store.get(normalize(email)) ?? null
}

/** Manual override — usually for owner-initiated "remove from suppression list" actions. */
export function unsuppressEmail(email: string): boolean {
  return _store.delete(normalize(email))
}

/** List all suppressed entries, sorted by addedAt descending. Used by future admin page. */
export function listSuppressions(): SuppressionEntry[] {
  return Array.from(_store.values()).sort((a, b) => b.addedAt.localeCompare(a.addedAt))
}

/** @internal — for tests. */
export function __resetSuppressionStore(): void {
  _store.clear()
}
