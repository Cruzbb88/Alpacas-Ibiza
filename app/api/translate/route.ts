/**
 * POST /api/translate
 *
 * In-place translation endpoint for review text.
 *
 * - Body: { text: string, sourceLang?: string, targetLang: string }
 * - Validates: targetLang must match /^[a-z]{2}(-[A-Z]{2})?$/, text length 1..2000
 * - Rate-limit: 30 req / min per IP
 * - In-memory LRU cache: SHA-256 keyed, 24h TTL, max 500 entries
 *   Uses a parallel Map (same pattern as lib/referral-count-reader.ts) since
 *   the existing createTtlStore is timestamp-only (no value storage).
 * - All paths return 200; on translate failure returns { translated: original, provider: 'noop', attribution: '' }
 *
 * Failsafe: /api/translate always-200 (fail-quiet); rate-limit 30/min per IP; 24h in-memory cache (max 500 entries)
 */

import { createHash } from 'crypto'
import { translateText, type TranslationResult } from '@/lib/translate'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

// ── In-memory translation cache ─────────────────────────────────────────────
// Parallel Map pattern (value-bearing) — createTtlStore is timestamp-only.
// See lib/referral-count-reader.ts for the same approach.

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const CACHE_MAX_ENTRIES = 500

interface CacheEntry {
  result: TranslationResult
  expiresAt: number
}

const CACHE_GLOBAL_KEY = '__translateCache'
type CacheGlobal = typeof globalThis & { [CACHE_GLOBAL_KEY]?: Map<string, CacheEntry> }

function getTranslateCache(): Map<string, CacheEntry> {
  const g = globalThis as CacheGlobal
  if (!g[CACHE_GLOBAL_KEY]) g[CACHE_GLOBAL_KEY] = new Map()
  return g[CACHE_GLOBAL_KEY]!
}

function cacheKey(text: string, sourceLang: string | undefined, targetLang: string): string {
  return createHash('sha256')
    .update(`${text}|${sourceLang ?? 'auto'}|${targetLang}`)
    .digest('hex')
}

function cacheGet(key: string): TranslationResult | null {
  const cache = getTranslateCache()
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  return entry.result
}

function cacheSet(key: string, result: TranslationResult): void {
  const cache = getTranslateCache()
  // Evict oldest entries if at cap (simple FIFO — first inserted key)
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const firstKey = cache.keys().next().value
    if (firstKey !== undefined) cache.delete(firstKey)
  }
  cache.set(key, { result: { ...result, provider: 'cache' }, expiresAt: Date.now() + CACHE_TTL_MS })
}

// ── Validation ────────────────────────────────────────────────────────────────
const TARGET_LANG_RE = /^[a-z]{2}(-[A-Z]{2})?$/
/** Source language: same shape as target, OR 'auto'/'AUTO' for MyMemory autodetect.
 *  Case-insensitive so callers passing BCP47 codes from Accept-Language headers
 *  ('EN', 'ES', etc.) or uppercase 'AUTO' are accepted and normalised below. */
const SOURCE_LANG_RE = /^(auto|[a-z]{2}(-[A-Z]{2})?)$/i

function ok200(body: object): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function err400(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // Rate limit: 30 req / min per IP
  const ip = getClientIp(request)
  const rl = rateLimit({ key: `translate:${ip}`, limit: 30, windowMs: 60_000 })
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil(rl.resetMs / 1000)),
      },
    })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return err400('invalid_json')
  }

  if (!body || typeof body !== 'object') return err400('invalid_body')

  const { text, sourceLang, targetLang } = body as Record<string, unknown>

  if (typeof text !== 'string' || text.length < 1 || text.length > 2000) {
    return err400('text must be 1..2000 chars')
  }
  if (typeof targetLang !== 'string' || !TARGET_LANG_RE.test(targetLang)) {
    return err400('invalid targetLang')
  }
  if (sourceLang !== undefined) {
    if (typeof sourceLang !== 'string' || !SOURCE_LANG_RE.test(sourceLang)) {
      return err400('invalid sourceLang')
    }
  }

  // Normalise to lowercase so MyMemory receives 'en' not 'EN', 'auto' not 'AUTO'
  const src = typeof sourceLang === 'string' ? sourceLang.toLowerCase() : undefined
  const key = cacheKey(text, src, targetLang)

  // Cache hit
  const cached = cacheGet(key)
  if (cached) {
    return ok200({
      translated: cached.translated,
      sourceLang: cached.detectedSourceLang,
      provider: 'cache',
      attribution: cached.attribution,
    })
  }

  // Translate
  const result = await translateText({ text, sourceLang: src, targetLang })

  // Only cache successful translations (not noop — noop results from errors)
  if (result.provider === 'mymemory') {
    cacheSet(key, result)
  }

  return ok200({
    translated: result.translated,
    sourceLang: result.detectedSourceLang,
    provider: result.provider,
    attribution: result.attribution,
  })
}
