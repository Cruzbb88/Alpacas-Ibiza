/**
 * Client-error ring buffer — process-scoped FIFO of the last 100 client-side
 * error reports received via POST /api/log-error.
 *
 * Design mirrors lib/mailer.ts audit buffer exactly (same globalThis singleton
 * pattern, same SHA-256 hashing for privacy, same fail-quiet contract) so the
 * readers can be wired into snapshot.ts identically.
 *
 * IP addresses are SHA-256 hashed (8-char hex prefix) — never stored raw.
 * Buffer is lost on cold start (ADR 001 tradeoff — process-scoped only).
 */

import { createHash } from 'crypto'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ClientErrorEntry {
  ts: number         // Date.now()
  type: string       // 'error' | 'unhandledrejection' | 'react-error-boundary'
  message: string    // capped at 500 chars (already trimmed by route)
  path: string       // window.location.pathname (already sanitised by route)
  digest?: string    // Next.js error digest (optional)
  ip_hash: string    // SHA-256(ip).slice(0, 8) — 8-char hex prefix
}

export interface ClientErrorSummary {
  last1h: Record<string, number>   // { [type]: count } over the last 1 h
  total: number                    // total entries currently in the buffer
}

// ── Singleton buffer ──────────────────────────────────────────────────────────

const CLIENT_ERROR_BUFFER_SIZE = 100

const globalForClientErrors = globalThis as unknown as {
  __clientErrorBuffer?: ClientErrorEntry[]
}

if (!globalForClientErrors.__clientErrorBuffer) {
  globalForClientErrors.__clientErrorBuffer = []
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function hashIp(ip: string): string {
  return createHash('sha256').update(ip.trim()).digest('hex').slice(0, 8)
}

// ── Write API (called from the route after rate-limit passes) ─────────────────

/**
 * Appends one entry to the ring buffer. Fail-quiet: any internal error is
 * swallowed. The route's 204 contract is never affected by buffer code.
 */
export function appendClientError(entry: {
  type: string
  message: string
  path: string
  digest?: string
  ip: string        // raw IP — hashed before storing
}): void {
  try {
    const buf = globalForClientErrors.__clientErrorBuffer!
    buf.push({
      ts: Date.now(),
      type: entry.type,
      message: entry.message,
      path: entry.path,
      ...(entry.digest !== undefined ? { digest: entry.digest } : {}),
      ip_hash: hashIp(entry.ip),
    })
    // FIFO eviction
    if (buf.length > CLIENT_ERROR_BUFFER_SIZE) {
      buf.splice(0, buf.length - CLIENT_ERROR_BUFFER_SIZE)
    }
  } catch {
    // fail-quiet — buffer issues never affect the route
  }
}

// ── Read API (called from monitoring snapshot) ────────────────────────────────

/**
 * Returns the last `limit` entries (most-recent last).
 * Safe to call from monitoring / admin routes.
 */
export function getClientErrorEntries(limit = 50): ClientErrorEntry[] {
  try {
    const buf = globalForClientErrors.__clientErrorBuffer ?? []
    return buf.slice(-limit)
  } catch {
    return []
  }
}

/**
 * Returns aggregate statistics. `last1h` is a map of type → count for entries
 * within the last 1 hour; `total` is the current buffer length.
 */
export function getClientErrorSummary(): ClientErrorSummary {
  try {
    const buf = globalForClientErrors.__clientErrorBuffer ?? []
    const cutoff = Date.now() - 60 * 60 * 1000

    const last1h: Record<string, number> = {}
    for (const e of buf) {
      if (e.ts >= cutoff) {
        last1h[e.type] = (last1h[e.type] ?? 0) + 1
      }
    }

    return { last1h, total: buf.length }
  } catch {
    return { last1h: {}, total: 0 }
  }
}
