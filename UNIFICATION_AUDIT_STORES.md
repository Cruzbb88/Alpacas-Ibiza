# In-Process Stores — Duplication Audit (2026-06-06)

## TL;DR
- **2 stores share an identical shape** (webhook-idempotency + payment-failure _attempts_ sub-store): `Map<string, number>` (key → timestamp), TTL-only purge on write, no cap, no reader. Candidate for a shared helper.
- **4 stores are distinct enough to stay separate**: mailer buffer (Array FIFO, no TTL), notfound-log (proactive purge-on-write, no cap, reader), rate-limit (Map<string, number[]> sliding window), booking-schedule-store (no TTL at all), payment-failure counter (struct value, non-trivial reset logic).
- **Shared helper is viable only for the TTL-timestamp pattern** — `createTtlSet<string>({ ttlMs })` — covers exactly those 2 stores. A broader `createInProcessStore<T>` helper would not fit the other 4 without adding so many option flags it'd be worse than the current per-file code.

---

## Per-store breakdown

### lib/mailer.ts — audit ring buffer
- **Primitive:** `Array<MailerAuditEntry>` (plain array, not a Map). `globalThis.__mailerAuditBuffer?: MailerAuditEntry[]`. Lines 39–45.
- **TTL model:** None. Entries are never expired by age. The buffer is capped only by count.
- **Eviction:** FIFO, hard cap of 200 entries. `buf.splice(0, buf.length - AUDIT_BUFFER_SIZE)` on every write. Lines 51–54.
- **Reader surface:** Yes — `getMailerAuditEntries(limit)` returns last N entries; `getMailerAuditSummary()` returns aggregate stats with 24 h window computed at read time. Lines 73–123.
- **`globalThis` key:** `__mailerAuditBuffer`. HMR-safe in dev (assigned on first load, never re-assigned). Lines 39–45.
- **WHY this shape:** Audit log, not a dedupe store. Order matters (FIFO replay), TTL is irrelevant (the ring cap controls memory), and the rich summary reader needs the full entry struct. A timestamp-keyed Map would lose ordering and prevent the `byHostname` aggregate.

---

### lib/notfound-log.ts — recent-404 dedupe map
- **Primitive:** `Map<string, number>` — key is `"${path}|${refHost}"`, value is `Date.now()` timestamp. Line 16.
- **TTL model:** Per-entry expiry timestamp stored as the value. Purge is **proactive on every write**: `purgeOld(now)` iterates the whole map and deletes expired entries before checking/setting. Lines 29–33, 46–47.
- **Eviction:** TTL-only (60 s). No count cap. Unbounded between purge cycles but effectively bounded by crawler cadence × TTL.
- **Reader surface:** Yes — `getRecentEntries(limit)` added recently; returns `{ key, lastSeenMs }[]` sorted newest-first. Lines 78–83. Does NOT mutate.
- **`globalThis` key:** None — `recent` is a plain module-level `const`. Survives HMR only because the module is cached; a true cold start resets it. Intentional ("Crashes-on-restart by design" — line 13).
- **WHY this shape:** Crawler-flood suppression. The TTL is short (60 s) because the goal is dedup within a single crawl burst, not long-term dedup. No FIFO cap needed because TTL purge keeps the map small. The intentional absence of `globalThis` is a documented tradeoff — this store is explicitly allowed to reset on restart.

---

### lib/webhook-idempotency.ts
- **Primitive:** `Map<string, number>` — key is event ID (string), value is `Date.now()` timestamp of first processing. Lines 24–25.
- **TTL model:** Per-entry expiry. Purge is **lazy on read**: `purge(now)` called inside `isAlreadyProcessed()` only, not on `markProcessed()`. Lines 30–34, 44–45.
- **Eviction:** TTL-only (4 days). No count cap. Unbounded otherwise.
- **Reader surface:** None. Write-only from the caller's perspective (`isAlreadyProcessed` + `markProcessed`). No getter that exposes entries.
- **`globalThis` key:** `__webhookIdempotencyStore`. HMR-safe in dev only (`NODE_ENV !== 'production'` guard). Lines 21–28.
- **WHY this shape:** Idempotency, not audit. Only needs to know "seen / not seen" within the retry window. Minimal surface by design — exposing a reader would risk leaking payment IDs.

---

### lib/booking-schedule-store.ts
- **Primitive:** `Map<string, ScheduledBookingEmails>` — key is `String(bookingPk)`, value is a struct with `reminderEmailId`, `reviewEmailId`, `startAt`, `customerEmail`. Lines 36–47.
- **TTL model:** **None.** Entries are never expired. They are explicitly deleted by callers via `store.delete(bookingPk)` when a booking is cancelled or fulfilled.
- **Eviction:** Manual delete only. Unbounded in theory (bounded in practice by booking volume).
- **Reader surface:** Yes — `store.get(bookingPk)` is the read path, used by callers before scheduling to cancel stale Resend email IDs. The interface is a full async `BookingScheduleStore` with `get/set/delete`.
- **`globalThis` key:** `__bookingScheduleStore`. HMR-safe in dev only. Lines 50–55.
- **WHY this shape:** This is a mutable record store, not a TTL cache. The entry lifecycle is driven by booking events (created → updated/cancelled → deleted), not time. No TTL because a booking scheduled 3 months out must still be cancellable on day 89.

---

### lib/rate-limit.ts — IP store + email store (two parallel stores)
Both stores share the same shape:

#### (1) IP rate-limit store (`__rateLimitStore`)
- **Primitive:** `Map<string, number[]>` — key is IP string, value is array of `Date.now()` timestamps within the current window. Lines 25, 32–33.
- **TTL model:** Sliding-window. Timestamps older than `windowMs` are **filtered out on every read** (inline `.filter(ts => ts > windowStart)` inside `rateLimit()`). No separate purge function — the filter IS the purge. Lines 113–114.
- **Eviction:** Sliding-window TTL per element. No count cap on the map itself; the array per key is naturally bounded by `limit` (timestamps beyond `limit` never get pushed).
- **Reader surface:** None directly. `rateLimit()` is a check-and-write in one call.
- **`globalThis` key:** `__rateLimitStore`. HMR-safe in dev only. Lines 28–37.

#### (2) Email rate-limit store (`__emailRateLimitStore`)
- **Primitive:** `Map<string, number[]>` — identical shape to IP store. Key is `email:<sha256-prefix>`. Lines 62–64.
- **TTL model:** Identical sliding-window, inline filter. Lines 88.
- **Eviction:** Identical. Window defaults to 24 h; limit defaults to 3.
- **Reader surface:** None directly.
- **`globalThis` key:** `__emailRateLimitStore`. Lines 60–67.
- **WHY two separate stores:** Documented at line 50–57: "do not merge". IP and email have different window/limit policies and must not share a namespace — a key collision between `ip:1.2.3.4` and `email:<hash>` would cross-contaminate counters. Same shape, different policy + namespace.

---

### lib/payment-failure-tracker.ts — TWO stores in one file

#### (1) Failure counter store (`__paymentFailureStore`)
- **Primitive:** `Map<string, CounterEntry>` — key is `"${vendor}:${customerId}"`, value is `{ count: number; lastFailureAt: number; lastSuccessAt: number | null }`. Lines 36–42.
- **TTL model:** Per-entry expiry based on `entry.lastFailureAt`. Purge is **lazy**: `purge(now)` called at the top of `recordFailure()` and `_internalGetStoreSnapshot()`. Line 49–53.
- **Eviction:** TTL-only (30 days). No count cap.
- **Reader surface:** Yes — `getFailureCount()` is a direct reader (line 201); `_internalGetStoreSnapshot()` exposes all entries for the dunning dashboard (line 217); `payment-failure-tracker-readers.ts` wraps those with `listAtRiskDonors()`, `listActionRequiredDonors()`, `listAllTracked()`.
- **`globalThis` key:** `__paymentFailureStore`. Lines 36–47.
- **WHY this shape:** The struct value (count + timestamps) is load-bearing. `resetFailures()` must set `count=0` while preserving `lastFailureAt` for the `onReset` callback. A plain `Map<string, number>` (like idempotency) would lose this metadata.

#### (2) Attempt-dedupe store (`__paymentFailureAttempts`)
- **Primitive:** `Map<string, number>` — key is `"${vendor}:${customerId}:${attemptId}"`, value is `Date.now()` timestamp. Lines 37–43.
- **TTL model:** Per-entry expiry. Purge is **lazy**: called inside `purge()` at the top of `recordFailure()`. Lines 54–56.
- **Eviction:** TTL-only (4 days — matches webhook retry window). No count cap.
- **Reader surface:** None. Internal only; checked via `_attempts.has(...)` inside `recordFailure()`.
- **`globalThis` key:** `__paymentFailureAttempts` (same `globalForStore` cast). Lines 36–47.
- **WHY this shape:** Idempotency within the failure-counter logic, not exposed as a public API. Same primitive as `webhook-idempotency.ts` by necessity — both are "seen this ID? yes/no" within a TTL window.

---

## Shared-helper proposal

**Candidate shape:**
```ts
function createTtlStore(opts: { ttlMs: number }): {
  has(key: string): boolean
  set(key: string): void
  purge(): void
  clear(): void  // test helper
}
```

**Fits exactly 2 stores:**
1. `lib/webhook-idempotency.ts` — `Map<string, number>` keyed by event ID, 4-day TTL, purge on read, no reader.
2. `lib/payment-failure-tracker.ts` (attempts sub-store) — `Map<string, number>` keyed by `vendor:customerId:attemptId`, 4-day TTL, purge on write, no reader.

Both have identical primitive, identical TTL model (per-entry timestamp as value), identical eviction (TTL-only, no cap), and no public reader. A shared helper would remove ~15 lines of duplicated `for (const [k, ts] of map) if (now - ts > TTL) map.delete(k)` logic from each file.

**Not included in the helper:**

| Store | Why it doesn't fit |
|---|---|
| mailer audit buffer | Array, not Map; FIFO cap, no TTL; rich reader required |
| notfound-log | Purge runs proactively (before set, not after); needs full-map iteration for `getRecentEntries` reader; no `globalThis` by design |
| booking-schedule-store | No TTL; struct value; lifecycle is event-driven (delete on cancel), not time-driven |
| rate-limit IP + email | `Map<string, number[]>` (array of timestamps per key); sliding-window filter is inline at read-time, not a separate purge sweep; `windowMs` is per-call, not per-store |
| payment-failure counter store | Struct value (`CounterEntry`), not a raw timestamp; `resetFailures` sets `count=0` without deleting the key (required for the `onReset` callback and for distinguishing "never failed" from "recovered") |

---

## Where shared-helper does NOT fit — line evidence

- `mailer.ts:39–54`: value is a typed struct (`MailerAuditEntry`), primitive is an Array. FIFO splice on every push. No TTL. Completely different eviction contract.
- `notfound-log.ts:29–33`: `purgeOld` is called BEFORE `recent.set()` on every write path, not lazily. The map value is a plain timestamp but the read contract (`getRecentEntries` needing sort + slice) requires full Map iteration — a `has/set` wrapper would hide that surface.
- `booking-schedule-store.ts:36–47`: no TTL field at all. The `MemoryStore` class is deliberately designed for interface-swap to Vercel KV (see lines 20–17 upgrade-path docs). Wrapping it in a TTL helper would work against that upgrade path.
- `rate-limit.ts:113–114 / 88`: the "purge" is a filter expression `(ts => ts > windowStart)` embedded inside the check call. `windowStart` is `now - windowMs` where `windowMs` is a per-call argument — there is no single TTL to configure at store creation time.
- `payment-failure-tracker.ts:124–138`: `_store` value is `CounterEntry` (struct, not timestamp). `resetFailures()` at line 170 writes `{ count: 0, lastFailureAt: prev?.lastFailureAt ?? 0, lastSuccessAt: Date.now() }` — it does NOT delete the key, because the dunning dashboard needs to distinguish "never seen" (missing key) from "recovered" (count=0). A TTL helper's `has()/set()` surface cannot express this.
