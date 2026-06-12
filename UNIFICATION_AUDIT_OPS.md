# Operations Surfaces — Duplication Audit (2026-06-06)

## TL;DR

- **Real duplication (actionable): 2** — `TIER1_IMPACT` prose lives in both `validate-env.ts` (private const, lines 61–70) and `env-check/page.tsx` (exported `TIER1_IMPACT`, lines 183–192); and `env_tier1_ready` in `/healthz` re-enumerates the 8 keys inline instead of importing `TIER1_KEYS`.
- **Mild overlap (layered, fine): 3** — setup-probe vs healthz?detailed vs launch-readiness integrations are three different entry-point contracts, not copies; mailer audit vs analytics dashboards are different aggregation layers over the same data.
- **Genuine additive (no overlap): 1** — send-test-email is the only new surface that has nothing equivalent anywhere in the codebase.

---

## 1. launch-readiness vs validate-env vs env-check vs healthz

### Overlap found

**A. Tier 1 key list** — `TIER1_KEYS` is declared once in `lib/validate-env.ts:20` and imported correctly by all three consumers:
- `app/api/health/route.ts:2` — `import { isSet, TIER1_KEYS }`
- `app/admin/env-check/page.tsx:4` — `import { TIER1_KEYS, isSet }`
- `app/healthz/route.ts` — does **NOT** import `TIER1_KEYS`

**B. `env_tier1_ready` in `app/healthz/route.ts` lines 178–187** re-enumerates the 8 Tier 1 keys manually as a `Boolean(a && b && c...)` chain. It does not use `TIER1_KEYS` or `isSet()`. If a new key is added to `TIER1_KEYS` (e.g. to add `OWNER_EMAIL` or `SITE_BASE_URL`), healthz silently falls behind. This is real divergence risk — one line of truth vs one copied list.

**C. `TIER1_IMPACT` impact strings** — `validate-env.ts:61–70` defines a private `tier1Impact` const (not exported). `env-check/page.tsx:183–192` defines a local `TIER1_IMPACT` with the same 8 entries (the file even comments "mirrors validate-env.ts"). Capitalisation differs ("contact form emails will not send" vs "Contact form emails will not send") confirming these are manually-synced copies, not the same string.

**D. Launch-readiness vs validate-env** — `lib/launch-readiness/checks.ts` does NOT import `TIER1_KEYS` from validate-env. It implements its own 8 `checkXxx()` functions covering the same 8 Tier 1 vars (lines 114–360). These go beyond presence-only checks (they validate lengths, formats, `https://`, non-default values) — so they are a superset of what `validate-env` checks. This is NOT duplication of logic; it is a richer quality check.

### Verdict

| Sub-point | Verdict |
|---|---|
| A. TIER1_KEYS shared import | Clean — single source of truth imported correctly |
| B. healthz inline Boolean chain | **Real duplication** — healthz should import `TIER1_KEYS` + `isSet()` |
| C. TIER1_IMPACT prose in env-check | **Real duplication** — same strings maintained in two files |
| D. launch-readiness Tier 1 check fns | Layered, fine — richer validation, not a copy |

### Entry-point layering (not duplication)

| Surface | Entry point | Auth | What it does |
|---|---|---|---|
| `instrumentation.ts` → `validateEnv()` | Boot-time, once per process | None | Logs warnings/errors to stdout |
| `app/api/health` | Public HTTP, synchronous | None | 200/503 based on TIER1_KEYS presence |
| `app/healthz` | Public HTTP, synchronous | None | Always 200; `env_tier1_ready` bool |
| `app/api/launch-readiness` | Cron-tokenable or session | CRON_SECRET or session | Full structured report with blockers/warnings |
| `app/admin/launch-readiness` | Browser, session | Session | Same report rendered as HTML |
| `app/admin/env-check` | Browser, session | Session | Table of every Tier 1 + Tier 2 var with masked previews |

These are six different consumption contracts. The boot-time check cannot replace the HTTP endpoint; the HTML page cannot replace the cron-pollable API. The layering is intentional.

### One concrete consolidation move

Export `TIER1_IMPACT` (or a `getTier1Notes()` function) from `lib/validate-env.ts` so `env-check/page.tsx` imports it instead of maintaining its own copy. Then replace the `env_tier1_ready` inline chain in `app/healthz/route.ts:178–187` with:

```ts
import { TIER1_KEYS, isSet } from '@/lib/validate-env'
env_tier1_ready: TIER1_KEYS.every(isSet),
```

That is two targeted changes, one export to add.

---

## 2. setup-probe vs healthz?detailed=1 vs launch-readiness integrations

### Overlap found

All three probe Resend, Stripe, and Mollie. The probe logic is nearly identical across the three files:

**Resend probe (all three):** HTTP HEAD/GET to `https://api.resend.com/api-keys` with `Authorization: Bearer <key>`, 3–5s timeout.
- `app/api/setup-probe/route.ts:47–79` — `checkResend()`, returns structured `ProbeResult`, distinguishes 200/401/403/timeout
- `app/healthz/route.ts:98–130` — `checkResend()`, returns `ServiceCheck` with `latencyMs`, same URL, same logic
- `lib/launch-readiness/checks.ts:568–606` — `checkResendReachable()`, HEAD request not GET, 3s AbortController, skips if key unset

**Stripe probe (all three):** `stripe.balance.retrieve()` via dynamic import of `importStripe`.
- `app/api/setup-probe/route.ts:82–105` — same pattern, 3s timeout via Stripe SDK `timeout` option
- `app/healthz/route.ts:35–61` — same pattern, identical error codes (`AUTH_FAILED`, `TIMEOUT`, `NETWORK_ERROR`)
- `lib/launch-readiness/checks.ts:609–656` — same pattern, also skips if `PAYMENT_VENDOR !== 'stripe'`

**Mollie probe (all three):** `mollie.profiles.getCurrent()` via dynamic import of `@mollie/api-client`.
- `app/api/setup-probe/route.ts:107–140` — same factory-resolution pattern, `Promise.race` for timeout
- `app/healthz/route.ts:63–96` — identical factory-resolution pattern, identical error codes
- `lib/launch-readiness/checks.ts:658–705` — same factory pattern, skips if `PAYMENT_VENDOR !== 'mollie'`

The `checkStripe()` and `checkMollie()` bodies in `setup-probe` and `healthz` are near-identical (same error strings, same SDK import path, same timeout value). The launch-readiness versions differ in that they gate on `PAYMENT_VENDOR` before probing — a deliberate policy difference.

### Is this real duplication or layered diff coverage?

| Surface | Auth | Purpose | Returns |
|---|---|---|---|
| `setup-probe` | Session required | One-at-a-time interactive probe for setup wizard UI | `{ok, detail, code}` |
| `healthz?detailed=1` | Public | External monitor ping (UptimeRobot) | `{ok, latencyMs, code}` per service |
| `launch-readiness` | Session or cron-token | Pre-launch structured readiness report | Full `LaunchReadinessCheck` with category/blocking |

The contracts are different (interactive wizard vs external monitor vs structured report). They are not interchangeable. However, the **probe bodies themselves** — the actual HTTP fetch logic — are genuine code copies. They have no shared extract, so a bug fix or a changed API endpoint URL needs to be applied in three places.

### Verdict

**Mild overlap** — different entry-point contracts, but the inner `checkStripe()` / `checkMollie()` / `checkResend()` functions are structural duplicates with no shared implementation. Not a correctness risk today, but a maintenance tax if Stripe or Mollie change their test endpoints.

### One concrete consolidation move

Extract a `lib/probes.ts` module with three exported async fns: `probeResend()`, `probeStripe()`, `probeMollie()`, each returning a minimal `{ok, latencyMs?, code}`. All three consumers import from it. The per-consumer shaping (adding `blocking:`, `category:`, `ServiceCheck` vs `ProbeResult`) stays local to each consumer.

---

## 3. send-test-email vs email-previews

### Overlap found

**Purpose differs completely:**
- `app/admin/email-previews/page.tsx` — renders all 7 email templates with dummy data inside sandboxed iframes. Read-only. No send. Visual check.
- `app/api/admin/send-test-email/route.ts` — sends a real transactional email via Resend. Write. Live send. Delivery check.

**Minor structural similarity:** both are session-gated admin tools related to email. Both render/use email content. That is the full extent of their overlap.

### Verdict

**Clean** — these serve orthogonal concerns (visual template review vs end-to-end delivery test). No code is duplicated; they do not share any logic. Genuinely additive.

### One concrete consolidation move

None. They are complementary, not overlapping.

---

## 4. mailer audit ring buffer vs analytics dashboards

### Overlap found

The ring buffer in `lib/mailer.ts` (`getMailerAuditEntries`, `getMailerAuditSummary`) is consumed by:
- `lib/monitoring/snapshot.ts:191,300` — `getMailerAuditSummary()` used in two places: `buildEmail()` (last24h sent/failed, unsubscribe rate) and `buildCounters()` (weeklyEmailSends)
- `app/admin/monitoring/page.tsx` — renders `snap.email.last24hSent`, `snap.email.last24hFailed` from the snapshot

The analytics dashboards (`dunning/page.tsx`, `vat/page.tsx`, `subscriptions/page.tsx`) do not use the mailer audit buffer at all. They consume `payment-failure-tracker`, `vat-recorder/vat-tracker`, and Mollie SDK respectively. No overlap with the mailer ring buffer.

`owner-mrr-digest/route.ts` and `owner-digest/route.ts` use `sendEmail()` (which writes to the buffer) but do not read the buffer back. They are data producers, not consumers.

### Verdict

**Clean** — the ring buffer has exactly one production reader path (`lib/monitoring/snapshot.ts` → `/admin/monitoring`). Analytics dashboards are separate vertical slices. No duplication.

### One concrete consolidation move

None needed. The separation is correct: the ring buffer is a process-local in-flight metric feed; the analytics dashboards are persistent payment/tax data feeds. Merging them would conflate different data lifetimes (ring buffer resets on cold start; payment data is persistent).

---

## 5. Cross-cutting recommendations (if any)

Three moves Cruz could authorize, in priority order:

**Move A (highest value, lowest risk):** Export `tier1Impact` from `lib/validate-env.ts` so `env-check/page.tsx` can import it instead of maintaining `TIER1_IMPACT` locally. This eliminates the only copy-paste of human-readable impact strings. One new export, two-line change in env-check.

**Move B (correctness risk):** Replace the manual `Boolean(process.env.X && ...)` chain in `app/healthz/route.ts:178–187` with `TIER1_KEYS.every(isSet)`. The current implementation will silently report `env_tier1_ready: true` even after a new Tier 1 key is added to `TIER1_KEYS`. This is a single-line fix that eliminates the drift surface.

**Move C (maintenance tax, lower urgency):** Extract `lib/probes.ts` with shared `probeResend()`, `probeStripe()`, `probeMollie()` fns consumed by setup-probe, healthz, and launch-readiness. Not a correctness problem today — it is a maintenance cost if the vendor test endpoints change. Only worth doing if probe logic continues to diverge.
