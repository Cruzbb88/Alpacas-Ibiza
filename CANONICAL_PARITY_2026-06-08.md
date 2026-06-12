# CANONICAL PARITY — our integrations vs the vendor/reference implementation

**Date:** 2026-06-08
**Question answered:** for each integration we built, does our code actually match how the vendor / canonical reference says to build it? (Not feature-completeness — that's `handoff/OSS_UPGRADE_OPPORTUNITIES.md`. Not internal forks — that's `SYSTEM_PARITY_REGISTER_2026-06-06.md`. This is **code fidelity to the external spec**.)

**Method:** 6 parallel agents, one per system. Each read our implementation (file:line) AND fetched the vendor/OWASP/Auth.js canonical docs (URL-cited). Hard rule enforced: every "the canonical does X" claim is backed by a fetched URL or marked UNVERIFIED — no guessing.

**What's verifiable vs not (per `CANT_BE_DONE.md`):** competitors' private server code and bundled CSS are unreadable; FareHarbor's authenticated API needs owner creds. The *vendor specs themselves* (Stripe, Mollie, OWASP, Auth.js, vanilla-cookieconsent, Google Consent Mode) are all public and were fetched.

---

## Scoreboard

| System | Verdict vs canonical | Worst divergence | Status |
|---|---|---|---|
| Stripe webhook + checkout | **At/above** | emails awaited before 200 (vs "return 2xx fast") | fine-as-is; future hardening |
| Mollie webhook + checkout | **At/above** | 401 on `payments.get` 404 (vendor says 200 for unknown id) | flag → Tony (webhook semantics) |
| FareHarbor embed/lightframe | **Matches confirmed URL shapes** | `flow=` not on direct book URLs (UNVERIFIED if required) | flag → owner verify in FH admin |
| Security headers + CSP | **Above baseline on set headers** | Report-Only has **no report endpoint** → observability unshipped | flag → needs a report sink |
| NextAuth admin auth | **At/above on every axis** | none (the CANT_BE_DONE fallback is STALE) | record corrected |
| Cookie consent (GDPR/Consent Mode) | **Granular UX correct; bridge broken** | consent flag had **no writer** → analytics gated off forever | **FIXED this pass** |

---

## 1. Stripe — at/above canonical

Raw body for `constructEvent` ([stripe-webhook/route.ts:55,77](app/api/stripe-webhook/route.ts#L55)), SDK-internal timing-safe sig compare, `event.id` idempotency ([:85-91](app/api/stripe-webhook/route.ts#L85)), only-needed event types, no client-supplied amounts ([checkout/route.ts:184-187](app/api/checkout/route.ts#L184)), `success_url` from `SITE_BASE_URL` not the Origin header ([:191,205](app/api/checkout/route.ts#L191)) — all match [docs.stripe.com/webhooks](https://docs.stripe.com/webhooks).

**Only divergence:** welcome + owner-notify emails are `await`ed before the 200 ([:184-205](app/api/stripe-webhook/route.ts#L184)) rather than deferred. Stripe says return 2xx first. Resend calls are <300ms so no timeout today; if Resend ever slows, Stripe could retry. Future hardening: move the sends into the existing fire-and-forget block.

## 2. Mollie — at/above canonical

Re-fetches status via `payments.get` rather than trusting the POST body ([payment-mollie.ts:375](lib/integrations/payment-mollie.ts#L375)), form-encoded `id` parse, `id:status` compound idempotency key (correctly handles SEPA fail-then-pay), 500-only-for-retry-cases, status mapping matches Mollie's documented statuses, URL-secret is additive (Mollie classic webhooks have no HMAC — verified against [docs.mollie.com/reference/webhooks](https://docs.mollie.com/reference/webhooks)). The `^(tr|sub)_` regex keeps `sub_`.

**Only divergence (DIVERGES-RISK, narrow):** when `payments.get` 404s, we return **401** ([mollie-webhook/route.ts:69-71](app/api/mollie-webhook/route.ts#L69)); Mollie recommends **200 for unknown ids**. For spoofed bodies our 401 is fine (URL-secret already rejected them earlier). The only real exposure: a *legitimate* Mollie delivery whose fetch 404s (key rotated mid-flight / wrong-account id) → Mollie stops retrying → a real `payment.paid` could drop. Low probability on a single stable account. **Recommend (Tony's call, touches webhook control flow):** return 200 on a 404 from `payments.get`, keep 500 for transient network errors.

## 3. FareHarbor — matches confirmed URL shapes

Ground truth came from FareHarbor's own deployed embed script (`fareharbor.com/embeds/api/v1/?autolightframe=yes&shortname=alpacasibiza`), which literally contains the template `embeds/script/calendar/<shortname>/?flow=1257173&full-items=yes&fallback=simple`. Our calendar URL ([components/booking/fareharbor-calendar.tsx:99](components/booking/fareharbor-calendar.tsx#L99)), base book URL ([lib/config.ts:91](lib/config.ts#L91)), lightframe include ([app/layout.tsx:128](app/layout.tsx#L128)), and fail-open fallback all match. (FH help-doc pages 404'd; claims that couldn't be confirmed are marked UNVERIFIED below, not invented.)

**Divergences:**
- `flow=1257173` is appended to the **calendar widget** but NOT to direct `/embeds/book/` CTAs built by `getProductBookingUrl` ([lib/config.ts:85-92](lib/config.ts#L85)). **UNVERIFIED** whether FH requires flow on direct book links. If it does, per-item CTAs open the full unscoped calendar instead of the FLOW-scoped view. → owner can confirm in FH admin which experiences are flow-scoped.
- Lightframe loads `strategy="lazyOnload"` ([app/layout.tsx:129](app/layout.tsx#L129)) — links clicked before it loads hard-navigate instead of opening the overlay (graceful, low risk).

## 4. Security headers + CSP — above baseline, one unshipped control

HSTS w/ preload, `nosniff`, an *enforcing* mini-CSP covering `object-src 'none' / base-uri / frame-ancestors / form-action`, plus the full policy in Report-Only ([next.config.mjs:76-106](next.config.mjs#L76)) — at or above [OWASP Secure Headers](https://owasp.org/www-project-secure-headers/).

**Divergences that matter:**
- **Report-Only has no `report-uri`/`report-to`** ([next.config.mjs:76-87](next.config.mjs#L76)) — violations go to the browser console only, so the entire observability rationale of ADR-010 (stay in Report-Only to *collect* before enforcing) is currently **unshipped**. Highest-value, near-zero code: point `report-to` at a sink (Vercel CSP reporting / report-uri.com), watch for a week, then flip to enforcing.
- `'unsafe-inline'` in `script-src` was justified by ADR-010's "nonces are incompatible with `beforeInteractive`". **That premise is now stale** — ADR-014 moved GTM/GA to `afterInteractive`, and [Next.js now documents nonce CSP](https://nextjs.org/docs/app/guides/content-security-policy). The ADR-010 upgrade trigger is met; dropping `unsafe-inline` is a real (bigger) piece of work.
- Thin `Permissions-Policy` (6 vs OWASP's ~25 features) and missing COOP/COEP/CORP — low severity; COEP needs the Stripe/FareHarbor iframes audited first.

## 5. NextAuth admin — at/above, and a stale risk-record corrected

`safeEqual` timing-safe compare for username AND password ([api/auth/[...nextauth]/route.ts:32-34](app/api/auth/%5B...nextauth%5D/route.ts#L32)), `NEXTAUTH_SECRET` required + length-checked, JWT strategy with 8h maxAge (vs the 30-day default), dual-layer protection (Edge middleware + per-page `getServerSession` across all 21 admin pages), `callbackUrl` deliberately dropped to kill the open-redirect phishing vector — all match/exceed [authjs.dev credentials guidance](https://authjs.dev/getting-started/authentication/credentials).

**Record correction:** `CANT_BE_DONE.md:29` and `INTEGRATION_STATUS_2026-04-20.md:13` claim a hard-coded `admin`/`password` fallback exists. **It does not** — `route.ts:25-28` is fail-closed with no defaults, and `lib/launch-readiness/checks.ts` actively marks the literal strings `"admin"`/`"password"` as blocking. The residual risk is purely operational (are the prod env vars set?), not a code default. → the `CANT_BE_DONE` entry should be retired.

## 6. Cookie consent — granular UX correct, the bridge was broken (FIXED)

Per-category toggles, no pre-ticked boxes, equal-weight reject, Consent Mode v2 default-denied before GA/GTM, all four EEA params, `autoClear` on revoke — all match [vanilla-cookieconsent docs](https://cookieconsent.orestbida.com/) and [Google Consent Mode v2](https://developers.google.com/tag-platform/security/guides/consent).

**The real bug (was DIVERGES-RISK, now fixed):** two readers — the pre-hydration Consent Mode default ([app/layout.tsx:81](app/layout.tsx#L81)) and the custom `trackEvent` gate ([lib/consent-gate.ts:47-48](lib/consent-gate.ts#L47)) — both key off `localStorage['ai_cookie_consent_v1'] === 'accepted'`. **No production code wrote that key.** The library swap to vanilla-cookieconsent (which persists `cc_cookie`) left the bridge writer disconnected; the component callbacks only called `gtag`. Net effect: `trackEvent()` custom events were gated off **permanently, even after a user accepts analytics** (tests passed only because they stub the key directly).
**Fix applied:** [components/cookie-consent-v3.tsx](components/cookie-consent-v3.tsx) `updateConsentMode()` now writes `ai_cookie_consent_v1 = 'accepted' | 'rejected'` from the analytics category on every consent event, before the gtag guard. Restores both readers + matches the existing contract/tests with no reader changes. `tsc --noEmit` green.

**Still open (compliance, not code-broken):** GA4/GTM/FareHarbor scripts still *load* on every page and rely on Consent Mode to suppress data rather than hard-blocking before opt-in — stricter EU reading wants prior blocking. That's the same direction as the OSS-doc's Klaro suggestion and is a deliberate design call for the owner, not a silent bug.

---

## What to do, by who

**Done this pass:** #6 consent-bridge writer (real bug, fixed + type-checked).
**Tony's call (webhook/CSP semantics):** #2 Mollie 401→200 on unknown-id; #4 wire a CSP report sink then plan the `unsafe-inline`→nonce migration (ADR-010 trigger met).
**Owner verify (needs FH admin / can't read from here):** #3 whether per-experience CTAs need `flow=` scoping.
**Housekeeping:** retire the stale `admin/password` fallback entry in `CANT_BE_DONE.md` / `INTEGRATION_STATUS` (#5 — verified gone from code).
