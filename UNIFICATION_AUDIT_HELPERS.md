# Cross-cutting Helpers — Duplication Audit (2026-06-06)

## TL;DR

- **7 helper families canonical, all callers conform** — validators, sanitizers, secrets, honeypot, captcha, redirect guards, webhook-secret gate.
- **3 parallel-copy instances found** — `fetchWithTimeout` local shadow in `google-reviews/route.ts`; raw `AbortController` blocks in `setup-probe/route.ts` and all four `healthz` check functions; IP-extraction inline in `gdpr-request/route.ts` bypasses `getClientIp`.
- **Recently introduced parallel pattern flagged HIGH** — launch-readiness `checks.ts` defines a local `fetchWithAbort` (3s) and `healthz/route.ts` defines a local `withTimeout<T>` wrapper instead of calling `fetchWithTimeout` with a 3000 ms override. These are the new 3s wrappers added for probes. They're not bugs, but they are divergence.

---

## 1. Validators / sanitizers

### 1.1 `isValidEmail` — `lib/validate-email.ts`
**Status: canonical, all callers conform.**

Grep confirms every route that validates email uses the import:
- `app/api/billing-portal/route.ts` — `import { isValidEmail } from '@/lib/validate-email'`
- `app/api/mollie-checkout/route.ts` — same
- `app/api/mollie-manage/route.ts` — same
- `app/api/newsletter/route.ts` — same
- `app/api/gdpr-request/route.ts` — same
- `app/api/skein-checkout/route.ts` — same
- `lib/launch-readiness/checks.ts` — same
- `lib/validate-email.ts` consolidation comment confirms it replaced 3 prior copies.

No inline email-regex duplication found.

### 1.2 `escapeHtml` / `sanitizeHeader` / `sanitiseDisplayName` — `lib/html.ts`
**Status: canonical, all callers conform.**

- `app/api/contact/route.ts`, `app/api/commission/route.ts` — use `sanitizeHeader` for SMTP headers, `escapeHtml` for body.
- `app/api/newsletter/route.ts` — uses both for owner notification.
- `app/api/gdpr-request/route.ts` — uses both.
- No inline CRLF-stripping or entity-escape patterns found elsewhere.

### 1.3 `safeEqual` — `lib/secrets.ts`
**Status: canonical, all callers conform.**

- `lib/route-helpers.ts` imports it for `requireOptionalWebhookSecret`.
- `lib/integrations/webhook-secret.ts` imports it.
- `app/api/newsletter/confirm/route.ts` and `lib/newsletter-token.ts` use it for HMAC verification.
- `app/api/owner-digest/route.ts` and `app/api/alpaca-birthday-cards/route.ts` use `verifyCronSecret` which calls it internally.
- No plain `===` comparisons on secrets found in route handlers.

### 1.4 `detectHoneypot` — `lib/honeypot.ts`
**Status: canonical, all callers conform.**

Used by: `contact`, `commission`, `newsletter`, `billing-portal`, `mollie-manage`, `recover-certificate`, `gdpr-request`. Each passes a different field name (`company_url`, `phone_extension`, `business_name`, `website`, `bee_finds_nectar`). No inline truthy checks on hidden fields found elsewhere.

---

## 2. AbortController / fetchWithTimeout (HIGH ATTENTION)

### 2.1 Canonical helper — `lib/fetch.ts`

```ts
export async function fetchWithTimeout(
    url: string,
    init: RequestInit = {},
    ms = 5000,
): Promise<Response> {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), ms)
    try {
        return await fetch(url, { ...init, signal: ctrl.signal })
    } finally {
        clearTimeout(t)
    }
}
```

Default 5000 ms. Callers that override: `owner-notify.ts` uses 2000 ms, `turnstile.ts` and `captcha-recaptcha.ts` use 5000 ms explicitly, `newsletter.ts` uses 8000 ms for SendGrid.

All of the above import `fetchWithTimeout` from `@/lib/fetch`. Confirmed canonical.

---

### 2.2 PARALLEL COPY 1 — `app/api/google-reviews/route.ts` lines 18–26

```ts
async function fetchWithTimeout(url: string, init: RequestInit, ms = 5000) {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), ms)
    try {
        return await fetch(url, { ...init, signal: ctrl.signal })
    } finally {
        clearTimeout(t)
    }
}
```

**This is an exact structural copy of `lib/fetch.ts`**, declared locally inside the route file. It predates the canonical helper or was never updated when the helper was extracted. The route does NOT import from `@/lib/fetch`.

**Recommendation: Replace** the local function with `import { fetchWithTimeout } from '@/lib/fetch'` and delete the local copy. Zero behavior change (same timeout logic, same ms=5000 default).

---

### 2.3 PARALLEL COPY 2 — `lib/launch-readiness/checks.ts` lines 101–110

```ts
/** 3s AbortController fetch wrapper. */
async function fetchWithAbort(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 3000)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}
```

This is a **local 3s variant** of `fetchWithTimeout`. The file comment says "Network probes have a 3-second abort timeout." The canonical helper accepts a third `ms` argument, so calling `fetchWithTimeout(url, init, 3000)` would be identical. The local function was added when launch-readiness checks were built instead of delegating.

**Recommendation: Replace** with `import { fetchWithTimeout } from '@/lib/fetch'` and call `fetchWithTimeout(url, init, 3000)` at all four call sites inside the file. Saves one bespoke function.

---

### 2.4 PARALLEL COPY 3 — `app/healthz/route.ts`

Three separate `new AbortController` blocks at lines 26, 104, 143 plus a `withTimeout<T>` generic wrapper:

```ts
// Lines 25–33 — local withTimeout wrapper (NOT a fetch wrapper, wraps any promise fn)
async function withTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fn()
  } finally {
    clearTimeout(t)
  }
}
```

```ts
// Lines 104–113 — inline AbortController for Resend HEAD probe
const ctrl = new AbortController()
const t = setTimeout(() => ctrl.abort(), 3000)
let res: Response
try {
  res = await fetch('https://api.resend.com/api-keys', {
    headers: { Authorization: `Bearer ${key}` },
    signal: ctrl.signal,
  })
} finally {
  clearTimeout(t)
}
```

```ts
// Lines 143–151 — inline AbortController for FareHarbor probe
const ctrl = new AbortController()
const t = setTimeout(() => ctrl.abort(), 3000)
let res: Response
try {
  res = await fetch(url, { signal: ctrl.signal })
} finally {
  clearTimeout(t)
}
```

The `withTimeout<T>` wrapper is a generalized form — it wraps any async function, not just `fetch`. It's used for the Stripe and Mollie SDK calls that go through typed client methods rather than bare `fetch`. The two inline `ctrl/t/fetch` blocks at lines 104 and 143 could be replaced with `fetchWithTimeout(url, init, 3000)` directly.

**Recommendation:** Replace the two bare `fetch` blocks with `fetchWithTimeout` from `@/lib/fetch`. Keep `withTimeout<T>` (it serves a different purpose: wrapping typed SDK calls that don't accept a signal). This is the file where the 3s divergence most clearly adds noise but also most clearly has a valid reason (probe endpoints want 3s, not 5s).

---

### 2.5 PARALLEL COPY 4 — `app/api/setup-probe/route.ts` lines 54–64

```ts
const ctrl = new AbortController()
const t = setTimeout(() => ctrl.abort(), 5000)
let res: Response
try {
  res = await fetch('https://api.resend.com/api-keys', {
    headers: { Authorization: `Bearer ${key}` },
    signal: ctrl.signal,
  })
} finally {
  clearTimeout(t)
}
```

This is inside `checkResend()` — a 5000 ms raw `AbortController`. The `fetchWithTimeout` canonical uses the same 5000 ms default. Direct replacement: `const res = await fetchWithTimeout('https://api.resend.com/api-keys', { headers: ... })`.

The Stripe and Mollie probes in `setup-probe` use `stripe.balance.retrieve({}, { timeout: 3000 })` and `Promise.race([..., setTimeout 3000])` — these call SDK methods with their own timeout mechanism, which is fine; `fetchWithTimeout` only applies to raw `fetch` calls.

**Recommendation: Replace** the inline `AbortController` block in `checkResend()` with `fetchWithTimeout`.

---

### 2.6 `lib/heartbeat.ts` lines 50–59

```ts
const ctrl = new AbortController()
const t = setTimeout(() => ctrl.abort(), HEARTBEAT_TIMEOUT_MS)
fetch(url, { method: 'GET', signal: ctrl.signal })
  .finally(() => clearTimeout(t))
  .catch(() => {})
```

This is intentionally **fire-and-forget** (not awaited) so `fetchWithTimeout` (which always awaits) cannot replace it directly. The pattern here is structurally correct and purposely different — heartbeats must not block the cron handler. Leave as-is.

---

### Summary table — AbortController instances

| File | Uses `fetchWithTimeout`? | Pattern | Action |
|---|---|---|---|
| `lib/turnstile.ts` | YES | Imported | None |
| `lib/captcha-recaptcha.ts` | YES | Imported | None |
| `lib/owner-notify.ts` | YES (×4) | Imported | None |
| `lib/newsletter.ts` | YES (×4) | Imported | None |
| `lib/booking-engine/fareharbor-adapter.ts` | YES | Imported | None |
| `lib/integrations/booking-fareharbor.ts` | YES | Imported | None |
| `app/api/availability/route.ts` | YES | Imported | None |
| `app/api/owner-digest/route.ts` | YES | Imported | None |
| `app/api/google-reviews/route.ts` | NO — local copy | Exact duplicate | **Replace** |
| `lib/launch-readiness/checks.ts` | NO — local `fetchWithAbort` | 3s local variant | **Replace** |
| `app/healthz/route.ts` (Resend + FH probes) | NO — inline blocks | 3s inline | **Replace inline blocks** |
| `app/healthz/route.ts` (`withTimeout<T>`) | N/A — wraps SDK calls | Generic wrapper | Leave (different purpose) |
| `app/api/setup-probe/route.ts` (Resend) | NO — inline block | 5s inline | **Replace** |
| `lib/heartbeat.ts` | NO — fire-and-forget | Intentional | Leave (fire-and-forget) |

---

## 3. Webhook-secret gates

### 3.1 `requireOptionalWebhookSecret` — `lib/route-helpers.ts`
**Status: canonical for fail-OPEN, but has a sibling.**

`lib/route-helpers.ts` exports `requireOptionalWebhookSecret` which is hardwired to `FAREHARBOR_WEBHOOK_SECRET` and returns `null` (authorized) or `401 NextResponse`. It's used by the reminder + review-request routes (confirmed by docs and unified-field-theory report).

`lib/integrations/webhook-secret.ts` exports `makeWebhookSecretProvider(envVarName, mode)` — a factory that parameterizes the env var name and supports both `fail-open` and `fail-closed`. This was built after `requireOptionalWebhookSecret` as a generalization.

**Gap:** `requireOptionalWebhookSecret` is a hardwired subset of `makeWebhookSecretProvider('FAREHARBOR_WEBHOOK_SECRET', 'fail-open')`. They are not consolidated — two implementations of the same logic exist.

Neither is _wrong_; `requireOptionalWebhookSecret` is documented in CLAUDE.md's failsafe map as intentional. But they share logic: both call `safeEqual`, both read `x-webhook-secret`, both return `null` or a response.

**Recommendation:** `requireOptionalWebhookSecret` could be reimplemented as a one-liner calling `makeWebhookSecretProvider`. Low urgency — both are correct and tested. Flag as cleanup candidate only.

### 3.2 `makeWebhookSecretProvider` actual callers
**Status:** CLAUDE.md documents it as used by both fail-open and fail-closed routes. The grep confirms no route in `app/` directly imports it — it's used inside `lib/integrations/webhook-secret.ts` tests only. The actual route callers (`fareharbor-webhook`, `stripe-webhook`, `mollie-webhook`) implement inline 503 guards via `requireEnvOrReturn503`. That means `makeWebhookSecretProvider` is _defined_ and _tested_ but **not called by any live route**. It is documentation-level infrastructure, not wired.

**Recommendation:** Either wire it in the webhook routes or note explicitly in CLAUDE.md that it's available but callers use `requireEnvOrReturn503` directly. Not a bug — the behavior is identical — but the CLAUDE.md failsafe map entry implies it's active.

---

## 4. Captcha gates

### 4.1 `verifyHumanToken` / `verifyTurnstile` — `lib/turnstile.ts`
**Status: canonical, all callers conform.**

`verifyTurnstile` is the back-compat alias. `verifyHumanToken` is the provider-agnostic canonical. Both internal implementations (`verifyViaTurnstile`, `verifyViaRecaptcha`) are private to the file.

Callers: `billing-portal`, `mollie-manage`, `newsletter`, `gdpr-request`, `contact`, `commission` — all call `verifyTurnstile` (back-compat alias). No inline Turnstile HTTP calls found outside `lib/turnstile.ts`.

`lib/integrations/captcha-recaptcha.ts` also imports `fetchWithTimeout` and duplicates the reCAPTCHA verify logic in a second module. This is a **potential parallel** to `verifyViaRecaptcha` inside `lib/turnstile.ts`. Worth checking — not in the original scope but noted.

---

## 5. Redirect-URL guards

### 5.1 `SITE_BASE_URL` — `lib/config.ts`
**Status: canonical, all callers conform.**

Every route that builds a redirect URL uses `SITE_BASE_URL` from `lib/config`:
- `app/api/checkout/route.ts` — `successUrl`, `cancelUrl` built with `${SITE_BASE_URL}/...`
- `app/api/mollie-checkout/route.ts` — `returnUrl` built with `${SITE_BASE_URL}/...`
- `app/api/billing-portal/route.ts` — `returnUrl` built with `${SITE_BASE_URL}/...`
- `app/api/newsletter/route.ts` — `confirmUrl`, `unsubscribeUrl` built with `${SITE_BASE_URL}/...`
- `app/api/skein-checkout/route.ts` — `successUrl`, `cancelUrl` built with `${SITE_BASE_URL}/...`
- `app/api/mollie-manage/route.ts` — `cancelUrl`, `statusUrl`, `updatePaymentUrl` built with `${SITE_BASE_URL}/...`

No `request.headers.get('origin')` pattern found in any URL-building context. The security-review fix (ADR 017) held.

---

## 6. Anti-enumeration silent-200 pattern

### 6.1 Pattern shape
All five routes follow the same oracle-closure contract: return `{ ok: true }` 200 regardless of whether the email is on file. The only observable difference to an attacker is whether an email arrives.

| Route | Const name | Layers |
|---|---|---|
| `billing-portal` | `GENERIC_OK = () => NextResponse.json({ ok: true })` | honeypot + IP RL + email RL + Turnstile + Stripe lookup |
| `mollie-manage` | `GENERIC_OK = () => NextResponse.json({ ok: true })` | honeypot + IP RL + email RL + Turnstile + Mollie lookup |
| `recover-certificate` | `ALWAYS_OK = NextResponse.json({ ok: true })` | IP RL + honeypot + Stripe/Mollie lookup |
| `newsletter` (rate-limit hit) | inline `{ success: true }` | email RL silent block |
| `gdpr-request` (rate-limit hit) | inline `{ success: true }` | IP RL silent block |

**Status: parallel naming, equivalent behavior.** `GENERIC_OK` vs `ALWAYS_OK` is a cosmetic difference — same JSON body `{ ok: true }`. The shape could be extracted to a shared `lib/anti-enumeration.ts` `alwaysOk()` helper, but since these are short one-liners already, the value is low.

More importantly: `billing-portal` and `mollie-manage` declare `GENERIC_OK` as a **factory function** (called as `GENERIC_OK()`), while `recover-certificate` stores it as a **frozen response** (`ALWAYS_OK` — reused directly). The frozen-response pattern is a subtle footgun if Next.js ever mutates the `Response` object after sending; the factory pattern is safer. Consistency recommendation: use the factory pattern everywhere.

### 6.2 IP extraction inconsistency — REAL BUG

`gdpr-request/route.ts` lines 37–41 extracts IP inline:

```ts
const ip = request.headers.get('cf-connecting-ip')
  ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  ?? 'unknown'
```

The canonical `getClientIp` from `lib/rate-limit.ts`:

```ts
return (
  request.headers.get('cf-connecting-ip') ||
  request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ||
  'unknown'
)
```

**The difference is `.split(',')[0]` (first, client-forgeable) vs `.split(',').at(-1)` (last, infra-appended by Vercel).** Using `[0]` lets an attacker spoof their IP in the `x-forwarded-for` header and bypass the rate limit entirely by cycling the spoofed value. All other routes use `getClientIp` from `lib/rate-limit`.

**Recommendation: Fix `gdpr-request/route.ts`** — replace the inline extraction with `import { getClientIp } from '@/lib/rate-limit'` and call `getClientIp(request)`. This closes a rate-limit bypass on a GDPR request endpoint.

---

## Cross-cutting verdict

**Reuse score: 8/11 families canonical + all callers wired.**

The consolidation work (validators, sanitizers, secrets, captcha, SITE_BASE_URL) held well. No new parallel copies appeared in the domains that were already consolidated.

**Divergence introduced in the monitoring/probe layer:**
- `google-reviews/route.ts` has an exact copy of `fetchWithTimeout` that predates or missed the consolidation.
- The launch-readiness and healthz probe additions introduced local 3s wrappers instead of `fetchWithTimeout(url, init, 3000)`.
- `setup-probe` has one inline 5s block that could be replaced.

**One real security bug:** `gdpr-request` uses `.split(',')[0]` for IP extraction (forgeable), not `.at(-1)` (Vercel-anchored). Rate limit is bypassable on that route.

**One architectural loose end:** `makeWebhookSecretProvider` is documented as active in CLAUDE.md but no live route handler calls it; actual routes use `requireEnvOrReturn503` inline. Either wire it or clarify documentation.
