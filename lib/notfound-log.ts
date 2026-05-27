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
 * DEDUPING: in-process Map of recently seen (path, host) tuples. TTL 60s. This
 * stops a crawler hitting /foo/bar 1000x from filling the log; first hit logged,
 * rest swallowed for 60s. Crashes-on-restart by design (acceptable).
 */

const recent = new Map<string, number>()
const TTL_MS = 60_000

export function safeReferrerHost(referer: string | null): string | null {
  if (!referer) return null
  try {
    const u = new URL(referer)
    return u.host || null
  } catch {
    return null
  }
}

function purgeOld(now: number): void {
  for (const [key, ts] of recent) {
    if (now - ts > TTL_MS) recent.delete(key)
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
  purgeOld(now)

  const cleanPath = input.pathname.split('?')[0]
  const refHost = safeReferrerHost(input.referer)
  const key = `${cleanPath}|${refHost ?? '_none_'}`

  if (recent.has(key)) return // deduped within TTL
  recent.set(key, now)

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

/** Reset dedupe map — test-only. Never call in production code. */
export function _resetDedupeMapForTesting(): void {
  recent.clear()
}
