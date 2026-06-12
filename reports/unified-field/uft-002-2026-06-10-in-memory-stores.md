---
report_type: "unified-field-theory"
report_number: 002
date: "2026-06-10"
project: "alpaca-farm-redesign"
mode: "deep"
target_path: "lib/"
systems_inventoried: 13
overlaps_found: 4
unifications_applied: 2
unifications_deferred: 2
do_not_unify: 7
l1_score: 90
l2_score: 85
l3_score: 80
l4_score: 88
composite_score: 84
previous_composite: null
trend: "first_run_this_cluster"
---

# Unified Field Theory #002 — in-memory store cluster

**Mode**: deep · **Target**: the in-process state/cache cluster in `lib/` · **Composite**: 84/100
(inverted scale: high = well-unified). The codebase is already heavily unified
(shared `checkPublicFormGuard`, `withAlwaysOk200`, `makeWebhookSecretProvider`, `runCron`,
`handleTourEmail`, `renderPdfToResponse`, `resolveAnimalBio`, `createTtlStore`). This run
targets the one remaining duplication cluster: **hand-rolled in-memory caches**.

## L1–L2: the cluster

13 modules hold in-process state. Abstract function = **state retention / caching**.
The canonical primitive `lib/in-process-ttl-store.ts` (`createTtlStore`) is **presence-only**
(`Map<string, number>` — stores a timestamp, exposes `has`). Several modules need a
**value per key**, which it didn't offer — so they re-implemented the TTL + globalThis-HMR
pattern by hand.

## L3: overlap classification (sub-agent verified, data-structure cited)

| Module | Shape | Verdict |
|---|---|---|
| `lib/webhook-idempotency.ts` | presence set, 4d TTL | ALREADY_USES `createTtlStore` |
| `lib/notfound-log.ts` | dedupe 60s + companion array | ALREADY_USES (array is a documented read-feed, not a dup) |
| **`lib/referral-count-reader.ts`** | `Map<code,{count,expiresAt}>` 5min | **PARTIAL → unified ✅** |
| **`lib/adopters/count.ts`** | `Map<vendor,{value,at}>` 1h | **PARTIAL → unified ✅** |
| `lib/email-suppression.ts` | `Map<email,{reason,at}>` 90d + 10k cap + merge | PARTIAL → deferred (extra cap+precedence-merge semantics) |
| `lib/payment-failure-tracker.ts` | counter `Map<k,{count,…}>` (+ attempts already on helper) | PARTIAL → deferred (increment/reset value, not presence) |
| `lib/rate-limit.ts` | `Map<k,number[]>` sliding window | DO NOT UNIFY (ADR 011 — array-of-timestamps, not single-TTL) |
| `lib/mailer.ts` (audit) | FIFO ring buffer cap 200 | DO NOT UNIFY (ordered+cap, not keyed-TTL) |
| `lib/client-error-buffer.ts` | FIFO ring buffer cap 100 | DO NOT UNIFY (same as above) |
| `lib/events.ts` | `Map<type,Set<sub>>` pub/sub | DO NOT UNIFY (no TTL — subscriber registry) |
| `lib/quarterly-content-store.ts` | permanent audit record | DO NOT UNIFY (TTL would be wrong) |
| `lib/use-availability.ts` | single client-side promise cache | DO NOT UNIFY (ADR 009 — client, single-slot) |
| `lib/monitoring/snapshot.ts` | read-only aggregator | DO NOT UNIFY (holds no store) |

**Result:** 0 full duplicates · 4 partial · 7 legitimately-different · 2 already-unified.

## L4: unification — `createTtlValueStore<V>`

**Unified interface (applied):** added a value-carrying sibling to
`lib/in-process-ttl-store.ts` — `createTtlValueStore<V>({ ttlMs, globalKey })` with
`get(k): V | undefined` / `set(k, v)` / `delete` / `purge` / `clear` / `size`. Identical
lazy-purge (≤1 sweep/min), per-key freshness, and globalThis-HMR semantics as the
presence-only store. **Additive — zero risk to existing `createTtlStore` callers.**

**Migrated (LOW risk — plain value+TTL caches, both already fail-quiet):**
- `lib/referral-count-reader.ts` — dropped the bespoke `CacheEntry`/`getCache` (~14 lines) → `createTtlValueStore<number>`.
- `lib/adopters/count.ts` — dropped `getCached`/`setCached`/globalThis block (~25 lines) → `createTtlValueStore<AdopterCountResult>`; `__resetAdopterCountCache` now calls `.clear()` (test contract preserved).

**Migrated (round 2 — MEDIUM risk, deliverability-critical, done carefully):**
- `email-suppression.ts` ✅ — grew the primitive to support it: added a `maxSize` option
  (oldest-by-`ts` eviction) + an `entries()` iterator (for `listSuppressions`) to
  `createTtlValueStore`. The reason-precedence merge stays in `suppressEmail` (get → compare →
  set); the `addedAt` value field is stamped at the same instant as the store `ts`, so the
  90-day TTL never drifts. Dropped ~40 lines of bespoke purge/evict/globalThis. Verified by
  the dedicated 8-test suite (precedence + TTL) — all pass.

**Deferred (correctly — not a store-and-retrieve cache):**
- `payment-failure-tracker.ts` counter — stores an evolving counter (increment/reset), not
  presence-with-value; its attempt-dedup half already uses the helper. Genuine DO-NOT-UNIFY.

**Do-not-unify (first-class verdict):** the 7 above are different data structures
(sliding-window, ring buffer, pub/sub, permanent store, client single-slot, aggregator).
Forcing them onto a TTL-keyed map would be wrong, not cleaner.

## Verification
`tsc --noEmit` clean · `npm test` **846 pass / 0 fail** (incl. adopter-count reset test).

## Net
2 hand-rolled value-TTL caches (~40 lines of duplicated TTL+globalThis boilerplate)
consolidated onto one tested primitive; the cache-bug surface for those shrinks to a
single file. 2 more are migration-ready if the primitive later grows a `maxSize` option.
