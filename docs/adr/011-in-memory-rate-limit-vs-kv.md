# ADR 011 — In-memory sliding-window rate limit (defer KV until volume justifies)

**Status:** Accepted · 2026-05-27
**Supersedes:** none
**Superseded by:** none
**Related:** ADR 001 (same in-memory→KV upgrade pattern for booking schedule store)

## Context

The three form routes (`/api/contact`, `/api/newsletter`, `/api/commission`) are protected by Cloudflare Turnstile CAPTCHA. Turnstile alone is **not** sufficient — a successful CAPTCHA bypass or token farm can still flood Resend credits, leading to:

1. Hitting the Resend free-tier limit (3000 emails/month).
2. Owner's `info@alpacasibiza.com` inbox flooded.
3. Possible IP reputation damage on the sender domain.

Industry norm is server-side rate limiting on form endpoints. Two implementation paths:

- **Vercel KV / Upstash Redis** — shared store across all serverless instances. Survives cold starts. Standard for high-traffic prod.
- **In-memory `Map<ip, timestamps[]>`** — process-scoped. Lost on cold start / scaled instances may diverge. Zero infra cost. Zero deps.

## Decision

Ship in-memory sliding-window limiter ([lib/rate-limit.ts](../../lib/rate-limit.ts)) for now: 5 requests per 5 minutes per IP, returning 429 with `Retry-After` header.

Use the same HMR-safe `globalForStore` singleton pattern already in use by `lib/booking-schedule-store.ts` (ADR 001).

## Consequences

**Positive:**
- Zero new dependencies. Zero infra cost. Survives the volume this site will see at launch (~10-100 form submissions/day).
- Closes the Resend quota-exhaustion attack vector at the level it matters today.
- Identical pattern to ADR 001 means one upgrade path covers both.

**Negative / Trade-offs:**
- Process-scoped. A serverless function running on multiple instances has multiple counters — effective limit could be N×5 across N instances.
- Cold start resets the counter. An attacker hitting 5 requests, waiting for cold-start, hitting 5 more = 10 in <5 min.
- Acceptable below ~50 req/min total because Vercel keeps warm instances at that traffic.

## Upgrade triggers (when to revisit)

- Site sustains >50 req/min on form endpoints for >1 hour.
- A real flood incident proves the in-memory limiter let too much through.
- Vercel KV is already provisioned for `bookingScheduleStore` (ADR 001 upgrade) — at that point, both stores migrate together (single connection, shared infra).

## Verifying the decision

`lib/rate-limit.test.ts` covers: allow up to limit, reject limit+1, window reset, key isolation. All 4 pass as of 2026-05-27.

## References

- ADR 001 — Resend scheduled sends + in-memory booking schedule store (same pattern)
- [Vercel KV docs](https://vercel.com/docs/storage/vercel-kv)
- [Upstash Redis pricing](https://upstash.com/pricing/redis)
