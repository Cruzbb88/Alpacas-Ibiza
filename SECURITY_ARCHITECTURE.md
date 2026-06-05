# Security Architecture — Defence in Depth

**Thesis:** hunting individual vulnerabilities never catches them all.
The answer is layered managed services, each defending what the layers inside it cannot see.
This document maps those layers from the internet edge inward, names the concrete
products, and tells the owner exactly what to sign up for or toggle.

---

## Outer → Inner Layer Map

```
Internet
  │
  ▼
[1] EDGE / NETWORK        ← DDoS, volumetric flood, bad-IP ranges, layer-7 attacks
  │
  ▼
[2] BOT / HUMAN-VERIFY    ← automated form abuse, credential stuffing, scraping
  │
  ▼
[3] APPLICATION           ← injection, CSRF, header-injection, open-redirect, enumeration
  │
  ▼
[4] PAYMENTS / PCI        ← card data never touches our code
  │
  ▼
[5] FIRST-PARTY DATA      ← secrets management, PII minimisation, GDPR
  │
  ▼
[6] MONITORING            ← visibility: uptime, errors, payment alerts, CSP violations
```

---

## Layer 1 — Edge / Network

**What it defends:** Volumetric DDoS (L3/L4/L7), bot-net floods, known-bad IP ranges, TCP/UDP
amplification attacks, slow-loris, layer-7 HTTP floods. App code cannot defend these — by the
time a request reaches Next.js the damage is done.

### Option A: Cloudflare in front of Vercel

| Item | Detail |
|---|---|
| Product | **Cloudflare** (cloudflare.com) |
| Free tier includes | Managed WAF rules (OWASP top-10 signatures), Bot Fight Mode (heuristic bot blocking), DDoS L3/4/7, rate-limiting (1 rule), "Under Attack Mode" toggle |
| Pro ($20/mo) adds | Better WAF rulesets, advanced rate-limiting, analytics |
| Enterprise | Bot Management (full ML, device fingerprint) — $$$, overkill here |
| GDPR stance | Cloudflare is a US company but has EU data-localisation options; GDPR SCCs in place; does not sell traffic data |
| Cost for this site | Free (adequate); Pro $20/mo if WAF analytics are needed |
| Integration | Point DNS NS records to Cloudflare. In Cloudflare dashboard: set SSL mode = **Full (strict)**, enable proxy (orange cloud) on the A/CNAME pointing to Vercel. Vercel sees Cloudflare origin IPs — our `getClientIp()` in `lib/rate-limit.ts` already reads `cf-connecting-ip` first. |
| Status | [OWNER ACTION — signup] DNS move required |

### Option B: Vercel Firewall (built-in)

| Item | Detail |
|---|---|
| Product | **Vercel Firewall** (vercel.com/docs/security/vercel-firewall) |
| Free tier includes | DDoS protection, custom IP/country block rules, "Attack Challenge Mode" toggle |
| Pro/Enterprise adds | Vercel WAF (managed signatures), advanced analytics |
| GDPR stance | Vercel is GDPR-compliant, EU region available |
| Cost | Free on Hobby/Pro plans; no extra charge |
| Integration | Vercel dashboard → Project → Settings → Firewall → enable "Attack Challenge Mode" (one toggle, zero config) |
| Status | [OWNER ACTION — toggle in Vercel dashboard] |

### Recommendation for this site

Enable **Vercel Attack Challenge Mode** first — it is zero-setup and free, and activates
immediately. If the site later needs stronger WAF rules or bot analytics, move DNS to
Cloudflare (Option A adds Bot Fight Mode on top at no cost). Both can co-exist: Cloudflare
in front, Vercel Firewall as a second gate.

---

## Layer 2 — Bot / Human Verification

**What it defends:** Automated form submissions, credential stuffing, email-bomb attacks on
newsletter/contact/commission forms, checkout-abuse bots. Works alongside Layer 1 (which
blocks volumetric floods) — this layer handles low-and-slow behavioral abuse that evades IP
rate limits.

### Primary: Cloudflare Turnstile (Managed mode)

| Item | Detail |
|---|---|
| Product | **Cloudflare Turnstile** (developers.cloudflare.com/turnstile) |
| What it does | Privacy-first, mostly-invisible challenge. Analyzes browser signals, timing, and behavioral patterns non-interactively — no image puzzles, no checkbox. Issues a cryptographic token the server verifies via `challenges.cloudflare.com/turnstile/v0/siteverify`. |
| GDPR stance | Cloudflare does not sell data. No third-party tracking cookies. EU-friendly by design. Preferred over Google reCAPTCHA for EU sites. |
| Cost | **Free, unlimited assessments** |
| Integration | Already wired. `lib/turnstile.ts` handles server-side token verification. `lib/integrations/captcha-turnstile.ts` wraps it as a `CaptchaProvider`. The widget component (`components/turnstile-widget.tsx`) renders null if `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is unset (fail-safe). Server fails open in dev/preview and fails closed on network error in production (ADR-002). |
| Status | [ALREADY WIRED] Code complete. Owner must set keys and configure dashboard mode. |

**Owner action required:**
1. Log in to the Cloudflare Turnstile dashboard.
2. Create a site entry for your domain. Select **Managed** mode (the invisible behavioral
   analysis — not "Invisible" which skips all challenges, not "Interactive" which shows a
   checkbox).
3. Copy the Site Key → set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in Vercel.
4. Copy the Secret Key → set `TURNSTILE_SECRET_KEY` in Vercel.
5. Without these, the production console warns and forms are unprotected.

### Alternative: Google reCAPTCHA v3 / Enterprise

| Item | Detail |
|---|---|
| Product | **Google reCAPTCHA v3** (google.com/recaptcha) |
| What it does | Invisible behavioral score (mouse movement, timing, network signals) returning 0.0–1.0. No test, no puzzle. You set a threshold (typically 0.5). |
| v3 cost | Free up to 1M assessments/month |
| Enterprise cost | Paid; contact Google |
| GDPR friction | Google uses reCAPTCHA data to improve Google services. This raises GDPR friction for an EU site — requires explicit disclosure and may need user consent for secondary-use data flows. Use Turnstile instead unless Turnstile's pass rate proves insufficient. |
| Integration | `CaptchaProviderKind` in `lib/integrations/_types.ts` already includes `'recaptcha'` as a valid kind. Wiring a `recaptchaCaptchaProvider()` adapter is a drop-in swap — same `verify(token, remoteIp)` interface. |
| Status | [CODE — pluggable] Architecture supports it; no adapter implemented yet. Fall back here only if Turnstile pass-rate causes legitimate-user friction. |

### Enterprise escalation path (if bots become a real problem)

These products are overkill and expensive for a small EU business site. Named here as the
escalation ladder if a sustained bot attack survives Turnstile + Cloudflare Bot Fight Mode:

| Product | What it adds | Rough cost |
|---|---|---|
| **hCaptcha Enterprise** (hcaptcha.com) | Continuous behavioral ML, device fingerprinting, adaptive challenges | From ~$99/mo |
| **DataDome** (datadome.com) | Real-time ML bot detection, full HTTP layer, dedicated CDN node | From ~$3k/yr |
| **HUMAN (PerimeterX)** (humansecurity.com) | Device fingerprint + behavioral graph, very high accuracy | Enterprise pricing |
| **Arkose Labs** (arkoselabs.com) | Enforced friction for high-value actions (payments, account creation) | Enterprise pricing |

**Verdict:** Turnstile (managed) on all forms now. Extend to checkout if needed. Escalate to
edge bot-management only after a demonstrated attack that Layer 1 + Turnstile cannot absorb.

---

## Layer 3 — Application

**What it defends:** Injection, CSRF, header injection, XSS, open-redirect, user-enumeration,
webhook replay, rate-abuse at the route level. These are code-level protections already
shipped in this repository.

**Full per-vulnerability security patch shipped at commit `63fadc7`** (2026-05-27 security
review). All 97 failsafes are catalogued with file:line in `CLAUDE.md → In-code failsafe map`.
Summary of what is already in place:

| Mechanism | Where | What it blocks |
|---|---|---|
| Cloudflare Turnstile token verification | `lib/turnstile.ts` | Automated form submissions |
| Honeypot fields (3 forms, different names per form) | `lib/honeypot.ts` → contact / commission / newsletter | Bots that fill all fields; returns silent 200 so bot thinks it succeeded |
| IP sliding-window rate limit (in-memory, process-scoped) | `lib/rate-limit.ts` → all form routes | Brute-force and flooding; 429 + Retry-After; upgrade path to Vercel KV documented (ADR-011) |
| Per-email hashed rate limit (SHA-256 key, 24h window) | `lib/rate-limit.ts` `rateLimitByEmail()` | Email-bomb attacks that rotate IPs |
| Webhook HMAC verification, fail-CLOSED | `lib/webhook-secret.ts` + all webhook routes | Forged webhook events; 503 if secret unset |
| Mollie URL-path secret + constant-time `safeEqual()` | `app/api/mollie-webhook/route.ts` | Mollie has no HMAC — URL secret + server-side payment re-fetch is the two-layer substitute |
| Webhook idempotency guard (4-day TTL) | `lib/webhook-idempotency.ts` | Duplicate event processing from processor retries |
| `escapeHtml()` on all user input before email HTML | `lib/html.ts` | XSS via email bodies |
| `sanitizeHeader()` strips CR/LF from SMTP fields | `lib/html.ts` | CRLF header-injection in Resend/SendGrid |
| Return/redirect URLs use `SITE_BASE_URL` (never `Origin` header) | `app/api/checkout/`, `mollie-checkout/`, `billing-portal/`, `newsletter/` | Open-redirect → phishing after a real payment (ADR-017) |
| Email-oracle closure on billing portal + recover-certificate | `app/api/billing-portal/route.ts`, `recover-certificate/route.ts` | Subscriber enumeration by probing response shape |
| Admin login fail-closed, JWT 8h auto-logout | `app/api/auth/[...nextauth]/route.ts` | Credential stuffing; stale admin sessions |
| Security headers (HSTS, X-Frame, Referrer-Policy, Permissions-Policy) | `next.config.mjs:22-63` | Clickjacking, referrer leakage, permissions creep |
| CSP Report-Only on all routes | `next.config.mjs` | Injection monitoring without blocking (move to enforcing once nonce replaces `unsafe-inline`; see ADR-010) |
| `fetchWithTimeout()` on all external HTTP calls (5s) | `lib/fetch.ts` | Hanging requests / SSRF amplification |
| Token scope guards (newsletter confirm vs unsubscribe) | `lib/newsletter-token.ts` | Cross-use of HMAC capability tokens |
| CPU-DoS guard: reject tokens > 2048 bytes before HMAC | `lib/mollie-manage-token.ts` | Oversized-payload HMAC CPU exhaustion |
| Admin pages `noindex, nofollow` | `app/admin/layout.tsx` | Google does not crawl `/admin/login` |
| `robots.ts` disallows all on non-production environments | `app/robots.ts` | Preview deploys not indexed |

**Known open item:** CSP is in Report-Only mode. Moving to enforcing requires replacing
`unsafe-inline` for GTM with nonce-based injection (see ADR-010).

---

## Layer 4 — Payments / PCI

**What it defends:** Card data theft (PCI-DSS scope).

This site is **SAQ-A** compliant: card data never touches our servers or our code at any
point. The payment iframes are fully owned and served by the processor:

| Processor | Card data isolation | How |
|---|---|---|
| **Stripe** | Stripe.js + Stripe Checkout / Embedded Checkout iframes. Our code calls `/api/checkout` which returns a Stripe-hosted session URL or an embedded client secret. Card numbers are entered directly into Stripe's iframe, processed on Stripe's servers. | `@stripe/stripe-js` + `@stripe/react-stripe-js`; our code never sees a PAN. |
| **Mollie** | Mollie Components iframes. Identical isolation: card entry is inside Mollie's iframe served from `js.mollie.com`. | `@mollie/mollie-js`; our code never sees a PAN. |

Our webhook handlers receive only Stripe/Mollie event payloads (subscription IDs, amounts,
status strings) — no card numbers, no CVVs, no expiry dates.

**Nothing to build.** The PCI-scoped vault is the processor. Document the boundary; do not
let future features accept raw card fields server-side or log raw payment objects.

**Risk to watch:** `payment_events.payload_json` in the Drizzle schema stores raw webhook
payloads. Verify (once `DATABASE_URL` is provisioned) that Stripe/Mollie do not include any
PAN-adjacent fields in those payloads. If they do, scrub before insert or encrypt the column.

---

## Layer 5 — First-Party Data

**What it defends:** Secrets leakage, PII exposure, GDPR breach.

### What PII we hold and where

| Data | Primary location | Our copy |
|---|---|---|
| Card data | Stripe / Mollie only (SAQ-A boundary above) | None |
| Donor name + email | Stripe customer / Mollie customer (system-of-record) | Optional: Drizzle DB `customers` table (upserted from webhooks) when `DATABASE_URL` is set; in-memory stores otherwise |
| Subscription status, amount, tier | Stripe / Mollie + Drizzle mirror | In-memory `vat-tracker`, `payment-failure-tracker` when DB unset |
| Alpaca adoption data (birthday, alpaca name) | `lib/db/schema.ts` `customers` table | Webhook-upserted; `deleted_at` soft-delete for Article 17 GDPR erasure |
| Raw webhook payloads | `payment_events.payload_json` | Scrub or encrypt before DB provisioning (see Layer 4 risk note) |
| Contact / commission form submissions | Resend/SendGrid inboxes only | Not stored in our DB; emailed to owner |
| Newsletter subscribers | SendGrid list (optional) + newsletter token state is stateless (HMAC) | No persistent list unless SendGrid is configured |

### Secrets management

| Secret | Current storage | Adequacy | Upgrade |
|---|---|---|---|
| All env vars (`RESEND_API_KEY`, `NEXTAUTH_SECRET`, `STRIPE_*`, `MOLLIE_*`, `CRON_SECRET`, etc.) | **Vercel encrypted environment variables** | Adequate for this scale. Variables are encrypted at rest; not visible in logs; scoped per environment (production / preview / development). | **Doppler** (doppler.com, free tier) or **Infisical** (infisical.com, open-source, EU-hosted) sync to Vercel and give you rotation UI, audit logs, and team access controls. Worth adding when team grows. |
| `NEXT_PUBLIC_CRON_SECRET_PREVIEW` | Vercel env var prefixed `NEXT_PUBLIC_` | **Risk:** any `NEXT_PUBLIC_` var is bundled into client JS and visible in the browser. This is used only in the admin birthday-test trigger form (`app/admin/birthday-test/trigger-form.tsx`) which is behind NextAuth session gate — so direct exposure is mitigated. However, anyone who can read the page source can extract the cron secret and trigger digests manually. **Owner action: rotate `CRON_SECRET` periodically, or move the birthday-test trigger to a server action so the secret never leaves the server.** |
| Database credentials (`DATABASE_URL`) | Vercel env var | Not yet set — DB not provisioned. When set, use the provider's connection pooler URL (Neon / Supabase both have this built-in). Never commit `DATABASE_URL` to the repo. |

### Data protection actions

| Action | Status |
|---|---|
| Column-encrypt or scrub `payment_events.payload_json` before DB provisioning | [OWNER ACTION — decide before setting `DATABASE_URL`] |
| Least-privilege dashboard access (who has Vercel / Stripe / Mollie / Cloudflare access) | [OWNER ACTION — audit + remove stale members] |
| 2FA on all dashboards (Vercel, Stripe, Mollie, Cloudflare, Resend, SendGrid) | [OWNER ACTION — enable on every account, see checklist below] |
| Database provider backups (Neon: daily point-in-time; Supabase: daily snapshots) | [OWNER ACTION — enable when DB provisioned] |
| 7-year VAT soft-delete retention | Already in schema (`deleted_at` + annual VAT aggregates preserved per GDPR Article 17 / EU VAT Directive) |
| GDPR data-export + erasure flow | Already built: `/api/gdpr-request/route.ts` rate-limited, honeypot-guarded, emailed to owner |

---

## Layer 6 — Monitoring

**What it defends:** Blind spots — attacks or failures you never detect.

| Signal | Mechanism | Status |
|---|---|---|
| Uptime | `GET /healthz` returns `{ok, ts, build_sha, env_tier1_ready}`. Register URL with **UptimeRobot** (free, 5-min checks) or **BetterStack** (betterstack.com, free tier, 3-min checks, integrates with Slack/Discord). | `/healthz` [ALREADY WIRED]. Monitor registration: [OWNER ACTION — signup] |
| Client-side JS errors | `app/error.tsx` + `ClientErrorReporter` beacon to `/api/log-error` → Vercel Function Logs (rate-limited 20 req/hr per IP, payload capped 4KB) | [ALREADY WIRED] |
| Server-side errors | Vercel Function Logs (automatic). For structured error tracking consider **Sentry** (free 5k events/mo) as an upgrade. | Vercel logs: automatic. Sentry: [OWNER ACTION — signup, optional] |
| Payment dunning alerts | `lib/owner-notify.ts` fires on `at-risk` / `action-required` escalation to Slack, Telegram, Discord, or generic webhook (2s timeout, fail-quiet). Weekly MRR digest cron (`/api/owner-mrr-digest`, Mondays 06:00 UTC). | [ALREADY WIRED — code]. Channel URL env vars: [OWNER ACTION — set `OWNER_NOTIFY_DISCORD_URL` or Slack/Telegram equivalent] |
| CSP violations | CSP is currently Report-Only. Adding a `report-uri` endpoint captures violations. Recommend: add `report-uri https://csp.example.com/report` pointing at **Sentry's CSP endpoint** (free) or a simple `/api/csp-report` log-only route. | [CODE — pluggable, low priority] |
| Cron health | Vercel cron failures surface in Function Logs. For independent cron monitoring: **Cronitor** (cronitor.io, free tier) or **Healthchecks.io** (open-source, EU-hosted option). | [OWNER ACTION — optional, signup] |

---

## Prioritised Owner Action Checklist

Ranked by ROI (highest first). Items marked [ALREADY WIRED] need keys set, not code.

1. **Set Turnstile keys in Vercel** — `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`.
   Without these, forms have no bot protection in production (visible `console.warn`).
   Dashboard: Cloudflare → Turnstile → create site → set mode to **Managed**.
   Cost: free.

2. **Enable Vercel Attack Challenge Mode** — Vercel dashboard → Project → Firewall → toggle on.
   Immediate DDoS + attack mitigation at the edge. Zero config, zero cost.

3. **Enable 2FA on every dashboard** — Vercel, Stripe, Mollie, Cloudflare, Resend (or SendGrid).
   A compromised Stripe or Mollie account causes real financial damage. This is the
   highest-leverage security action for a small business owner. Cost: free.

4. **Register `/healthz` with UptimeRobot or BetterStack** — you will know within minutes
   if the site goes down rather than finding out from a customer. Cost: free.

5. **Set `OWNER_NOTIFY_DISCORD_URL` (or Slack/Telegram)** — real-time payment failure
   alerts are wired but silent until an endpoint URL is configured. Cost: free.

6. **Move DNS to Cloudflare (optional upgrade)** — adds Bot Fight Mode + stronger WAF on
   top of Vercel Firewall. Required step: point NS records at Cloudflare, set SSL Full
   (strict), enable proxy. `getClientIp()` already reads `cf-connecting-ip`. Cost: free.
   Tradeoff: adds Cloudflare as a dependency in the DNS chain.

7. **Decide on `DATABASE_URL` (Neon or Supabase)** — before provisioning, decide whether
   to scrub or encrypt `payment_events.payload_json`. Enable provider daily backups.
   Neon free tier: 0.5 GB, 1 compute; Supabase free tier: 500 MB, pauses after 1 week idle.
   Cost: free at this scale.

8. **Rotate `CRON_SECRET` and review `NEXT_PUBLIC_CRON_SECRET_PREVIEW`** — the preview
   secret is exposed in client JS. Consider moving the birthday-test trigger to a
   server action. Cost: free; one-time dev effort.

9. **Audit dashboard access** — remove any stale team members from Vercel, Stripe, Mollie,
   Cloudflare. Least-privilege: owner should be the only one with admin rights until
   the team grows. Cost: free.

10. **Add Sentry CSP reporting (optional)** — register a free Sentry project, point
    `report-uri` at the Sentry CSP endpoint in `next.config.mjs`. Surfaces inline-script
    injections and mixed-content before users notice. Cost: free (5k events/mo).
