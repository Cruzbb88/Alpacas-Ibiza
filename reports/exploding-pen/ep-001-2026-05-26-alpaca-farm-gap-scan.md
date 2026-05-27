---
report_number: "001"
date: "2026-05-26"
mode: "quick"
target_path: "C:/Users/cruzb/Projects/alpaca-farm-redesign"
language: "TypeScript/Next.js"
gaps_found: 5
gadgets_designed: 5
gadgets_injected: 0
gap_scan_score: 72
gadget_design_score: NA
injection_plan_score: NA
inventory_score: NA
composite_score: 72
previous_composite: null
score_delta: "-"
trend: "first_run"
---

# Exploding Pen — Gap Scan Report ep-001

**Project:** Alpacas Ibiza (Next.js 16 / React 19 / Tailwind / Resend / FareHarbor / Turnstile)
**Date:** 2026-05-26
**Mode:** L1 Quick Scan

---

## Gap Summary

| # | Category | Severity | Location |
|---|----------|----------|----------|
| 1 | Rate Limiting | Critical | `app/api/contact/route.ts`, `app/api/newsletter/route.ts`, `app/api/commission/route.ts` |
| 2 | Retry Logic | Important | `lib/newsletter.ts:30` (bare `node-fetch`, no retry), `lib/mailer.ts:31` (Resend SDK, no retry) |
| 3 | Logging / Observability | Important | All API routes — only `console.error`/`console.warn`; no structured log with request ID, IP, or latency |
| 4 | Input Validation | Important | `app/api/contact/route.ts:12` — email field accepted without format-check; `app/api/commission/route.ts:12` — description has no length cap |
| 5 | Graceful Degradation | Nice-to-have | `app/api/analytics/data/route.ts:32` — GA4 SDK call has no timeout and no fallback; server hangs if GA4 credential is wrong |

---

## Gap Detail + Micro-Gadget Designs

---

### GAP-001 — Rate Limiting (Critical)

**Where:** `app/api/contact/route.ts`, `app/api/newsletter/route.ts`, `app/api/commission/route.ts` — all public POST endpoints with Turnstile as the only spam gate. Turnstile is a CAPTCHA, not a rate limiter; a bot that keeps a solved token can spam indefinitely within a TTL window.

**Gadget design** — drop-in in-memory sliding-window limiter (`lib/rate-limit.ts`):

```ts
// lib/rate-limit.ts  (<20 lines)
const map = new Map<string, number[]>()

export function rateLimit(key: string, maxReqs = 5, windowMs = 60_000): boolean {
  const now = Date.now()
  const hits = (map.get(key) ?? []).filter(t => now - t < windowMs)
  if (hits.length >= maxReqs) return false
  hits.push(now)
  map.set(key, hits)
  return true
}
```

Usage in each POST handler (after IP extraction, before Turnstile):

```ts
import { rateLimit } from '@/lib/rate-limit'
const ip = request.headers.get('cf-connecting-ip') || 'unknown'
if (!rateLimit(ip, 5, 60_000))
  return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
```

**Injection points:**
- `app/api/contact/route.ts:16` (after IP extraction)
- `app/api/newsletter/route.ts:14` (after IP extraction)
- `app/api/commission/route.ts:16` (after IP extraction)

---

### GAP-002 — Retry Logic (Important)

**Where:** `lib/newsletter.ts:30` — bare `node-fetch` PUT to SendGrid with no retry on transient 5xx/network errors. If SendGrid hiccups, the subscription silently fails and the owner gets no signal. `lib/mailer.ts:31` — Resend SDK call also has no retry.

**Gadget design** — wrap the two external calls with a tiny retry helper (`lib/retry.ts`):

```ts
// lib/retry.ts  (<20 lines)
export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  delayMs = 500,
): Promise<T> {
  let last: unknown
  for (let i = 0; i < attempts; i++) {
    try { return await fn() }
    catch (err) {
      last = err
      if (i < attempts - 1) await new Promise(r => setTimeout(r, delayMs * (i + 1)))
    }
  }
  throw last
}
```

Usage in `lib/newsletter.ts:30`:

```ts
import { withRetry } from '@/lib/retry'
const res = await withRetry(() => fetch(url, { method: 'PUT', headers, body }))
```

**Injection points:**
- `lib/newsletter.ts:30` — wrap `fetch(url, ...)` with `withRetry(...)`
- `lib/mailer.ts:31` — wrap `resend.emails.send(...)` with `withRetry(...)`

---

### GAP-003 — Logging / Observability (Important)

**Where:** Every API route uses bare `console.error` / `console.warn` with no request ID, no IP, no latency. In Vercel logs, correlated debugging across retries is impossible because there is no shared trace token.

**Gadget design** — structured request logger (`lib/logger.ts`):

```ts
// lib/logger.ts  (<20 lines)
export function makeLogger(route: string, req: Request) {
  const id = crypto.randomUUID().slice(0, 8)
  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? 'unknown'
  const log = (level: 'info'|'warn'|'error', msg: string, data?: unknown) =>
    console[level](JSON.stringify({ ts: new Date().toISOString(), id, route, ip, msg, ...( data ? { data } : {}) }))
  return { id, info: (m: string, d?: unknown) => log('info', m, d),
               warn: (m: string, d?: unknown) => log('warn', m, d),
               error: (m: string, d?: unknown) => log('error', m, d) }
}
```

Usage at the top of each route handler:

```ts
import { makeLogger } from '@/lib/logger'
const log = makeLogger('contact', request)
log.info('received')
// replace: console.error('[contact] ...') → log.error('...')
```

**Injection points:** Top of every `export async function POST/GET` in `app/api/*/route.ts`.

---

### GAP-004 — Input Validation (Important)

**Where:** `app/api/contact/route.ts:12` — `email` field is present-checked but never format-validated (the regex check exists only in `fareharbor-webhook` and `reminder`/`review-request`). `app/api/commission/route.ts:12` — `description` has no length cap; a 1 MB paste would be forwarded to Resend.

**Gadget design** — reusable validators (`lib/validators.ts`):

```ts
// lib/validators.ts  (<20 lines)
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function validateEmail(v: unknown): v is string {
  return typeof v === 'string' && EMAIL_RE.test(v)
}

export function validateLength(v: unknown, max: number): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= max
}
```

Usage in `app/api/contact/route.ts` (after L12 presence check):

```ts
import { validateEmail, validateLength } from '@/lib/validators'
if (!validateEmail(email))
  return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
if (!validateLength(message, 5000))
  return NextResponse.json({ error: 'Message too long' }, { status: 400 })
```

**Injection points:**
- `app/api/contact/route.ts:13` — add after presence check
- `app/api/commission/route.ts:13` — add `validateLength(description, 10000)`

---

### GAP-005 — Graceful Degradation on GA4 (Nice-to-have)

**Where:** `app/api/analytics/data/route.ts:32` — `analyticsDataClient.runReport(...)` is a gRPC call with no timeout guard. If `GA4_PRIVATE_KEY` is malformed or the credential has expired, the SDK hangs or returns an opaque error, and the admin analytics page blocks indefinitely.

**Gadget design** — wrap the SDK call with `Promise.race` timeout:

```ts
// Inline in app/api/analytics/data/route.ts  (<15 lines added)
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ])
}

// Replace line 32:
const [response] = await withTimeout(
  analyticsDataClient.runReport({ ... }),
  8000,
  'GA4 runReport'
)
```

**Injection points:** `app/api/analytics/data/route.ts:32` — replace bare `await analyticsDataClient.runReport(...)` with `await withTimeout(analyticsDataClient.runReport(...), 8000, 'GA4 runReport')`.

---

## False Positives Excluded

- **Timeout handling** — `lib/fetch.ts` already wraps all external HTTP via `fetchWithTimeout`. GA4 gRPC is the only uncovered call.
- **Circuit breaking** — not flagged; site is low-traffic and has no persistent server process that could accumulate open-circuit state across requests (serverless functions reset).
- **Connection pooling** — no DB; not applicable.
- **Error recovery** — routes all have try/catch. React error boundaries not scanned (out of scope for L1).

---

*Generated by exploding-pen skill, L1 Quick Scan, 2026-05-26*
