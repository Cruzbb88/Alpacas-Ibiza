/**
 * Quarterly farm-news content store.
 *
 * The /api/adopt-quarterly-update cron sends ONE email per active adopter
 * every Jan 1 / Apr 1 / Jul 1 / Oct 1. The email body has a "what's new on
 * the farm" section that needs different copy each quarter — the owner
 * writes it from /admin/quarterly-update before the cron fires.
 *
 * Store shape: keyed by quarter label ("Q1 2026" etc.) so the owner can
 * draft multiple quarters in advance, and so we have a permanent record of
 * "what was sent in Q1 2026" for audit / repeat.
 *
 * Persistence (ADR 001 tradeoff, same as vat-tracker / payment-failure-tracker):
 *   - Process-scoped Map pinned to globalThis. Survives HMR in dev. Lost
 *     on Vercel cold start.
 *   - When DATABASE_URL is set, a future migration moves this to a
 *     `quarterly_content` table (see lib/db/schema.ts). The store API stays
 *     the same — only the implementation swaps.
 *
 * Cold-start tradeoff is ACCEPTABLE for this store because:
 *   - The cron fires only 4× per year; owner sets the content within hours
 *     of the cron, not weeks.
 *   - A lost draft is recoverable (owner re-pastes) unlike a lost VAT count.
 *   - The cron itself reads the content at handler time, so as long as the
 *     content was set since the most recent restart, the cron uses it.
 *
 * Upgrade trigger: once a draft is lost to a cold start in practice, move
 * to lib/db/schema.ts `quarterly_content` table. Today's globalThis pattern
 * is fine.
 */

interface QuarterlyContent {
  /** Quarter label like "Q1 2026". The PK. */
  quarter: string
  /** HTML body for the "what's new on the farm" section. Sanitized by caller. */
  newsHtml: string
  /** ISO timestamp when this quarter's content was last edited. */
  updatedAt: string
  /** ISO timestamp when the cron sent this quarter's email, or null if not yet. */
  sentAt: string | null
}

const globalForQuarterly = globalThis as unknown as {
  __quarterlyContentStore?: Map<string, QuarterlyContent>
}

const _store: Map<string, QuarterlyContent> =
  globalForQuarterly.__quarterlyContentStore ?? new Map()

if (process.env.NODE_ENV !== 'production') {
  globalForQuarterly.__quarterlyContentStore = _store
}

/**
 * Save (or replace) the farm-news HTML for a specific quarter.
 *
 * @param quarter   Quarter label like "Q1 2026".
 * @param newsHtml  Already-sanitized HTML for the news section. Caller is
 *                  responsible for escaping any user-controlled values.
 * @returns         The saved record.
 */
export function setQuarterlyContent(quarter: string, newsHtml: string): QuarterlyContent {
  const existing = _store.get(quarter)
  const record: QuarterlyContent = {
    quarter,
    newsHtml,
    updatedAt: new Date().toISOString(),
    sentAt: existing?.sentAt ?? null,
  }
  _store.set(quarter, record)
  return record
}

/** Read the saved content for a quarter, or null when unset. */
export function getQuarterlyContent(quarter: string): QuarterlyContent | null {
  return _store.get(quarter) ?? null
}

/**
 * Mark a quarter as "sent" by the cron. Records the sentAt timestamp so the
 * admin page can show "✅ Q1 2026 was sent on 2026-04-01T09:00:01Z".
 */
export function markQuarterlySent(quarter: string, when: Date = new Date()): void {
  const existing = _store.get(quarter)
  if (!existing) return
  _store.set(quarter, { ...existing, sentAt: when.toISOString() })
}

/** List all quarters in store, newest first. Used by admin index. */
export function listQuarterlyContent(): QuarterlyContent[] {
  return Array.from(_store.values()).sort((a, b) => b.quarter.localeCompare(a.quarter))
}

/** @internal — for tests. */
export function __resetQuarterlyContentStore(): void {
  _store.clear()
}
