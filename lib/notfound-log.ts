/**
 * 404 referrer logger. Logs the path + referrer host (NOT full URL — privacy)
 * + UA + timestamp to console. Captured by Vercel logs / Node stdout.
 *
 * Privacy: strips query strings from path (could contain UTM tracking; not PII
 * but reduces log noise) and strips path-and-after from referrer (host only).
 *
 * Sample-rate: 1 in 1 (every 404 logged at v1 — flip to 1-in-10 sampling later
 * if log volume becomes a problem).
 *
 * DEDUPING: createTtlStore with 60s TTL. Crashes-on-restart by design (acceptable).
 * A parallel `recent` array mirrors the store for read-path access (getRecentEntries)
 * since TtlStore does not expose iteration — the array is notfound-specific.
 *
 * MAX_ENTRIES cap: if the store exceeds 500 unique keys, new entries are dropped
 * until old ones expire, preventing unbounded growth from mass-scanning bots.
 */

import { createTtlStore } from './in-process-ttl-store.ts'

const TTL_MS = 60_000
const MAX_ENTRIES = 500

const _dedupeStore = createTtlStore({
  ttlMs: TTL_MS,
  globalKey: '__notFoundDedupeStore',
})

// Parallel array for iteration (getRecentEntries). Trimmed on write.
const _recentArr: Array<{ key: string; lastSeenMs: number }> = []

export function safeReferrerHost(referer: string | null): string | null {
  if (!referer) return null
  try {
    const u = new URL(referer)
    return u.host || null
  } catch {
    return null
  }
}

export function isBotUA(ua: string): boolean {
  return /bot|crawl|spider|slurp|wget|curl/i.test(ua)
}

export interface NotFoundLogInput {
  pathname: string
  referer: string | null
  userAgent: string | null
}

export function logNotFound(input: NotFoundLogInput): void {
  const now = Date.now()

  const cleanPath = input.pathname.split('?')[0]
  const refHost = safeReferrerHost(input.referer)
  const key = `${cleanPath}|${refHost ?? '_none_'}`

  if (_dedupeStore.has(key)) return // deduped within TTL

  // Cap: if we're at or above MAX_ENTRIES, don't add new entries until old ones expire.
  if (_dedupeStore.size() >= MAX_ENTRIES) return

  _dedupeStore.set(key, now)

  // Keep parallel array in sync — update existing entry or push new one.
  // Also evict expired entries so _recentArr doesn't grow past MAX_ENTRIES
  // independently of the dedupe store (store purges lazily; array never did).
  const cutoff = now - TTL_MS
  // Splice backwards to avoid index shifting.
  for (let i = _recentArr.length - 1; i >= 0; i--) {
    if (_recentArr[i]!.lastSeenMs < cutoff) _recentArr.splice(i, 1)
  }

  const existing = _recentArr.find((e) => e.key === key)
  if (existing) {
    existing.lastSeenMs = now
  } else {
    _recentArr.push({ key, lastSeenMs: now })
  }

  // Truncate UA — log enough to spot bots without slurping fingerprintable data
  const ua = (input.userAgent ?? '').slice(0, 100)
  const isBot = isBotUA(ua)

  console.warn(
    `[404] path=${JSON.stringify(cleanPath)} ` +
      `referer=${JSON.stringify(refHost ?? 'direct')} ` +
      `ua=${JSON.stringify(ua)} ` +
      `bot=${isBot}`,
  )
}

/** Reset dedupe store — test-only. Never call in production code. */
export function _resetDedupeMapForTesting(): void {
  _dedupeStore.clear()
  _recentArr.length = 0
}

/**
 * Read recent 404 hits for the /admin/monitoring error feed.
 * Returns array of `{ key, lastSeenMs }` sorted by most-recent first, capped at `limit`.
 * Read-only; never mutates the dedupe store.
 */
export function getRecentEntries(limit = 20): Array<{ key: string; lastSeenMs: number }> {
  return _recentArr
    .slice()
    .sort((a, b) => b.lastSeenMs - a.lastSeenMs)
    .slice(0, limit)
}
