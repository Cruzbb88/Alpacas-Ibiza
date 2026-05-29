# Launch blockers — pre-production checklist

Synthesised from six parallel audits run 2026-05-29 (observability, GDPR,
legal pages, email deliverability, rate-limit/DoS, pre-launch readiness).
Every code-fixable item from those audits has already been applied; this
file lists the things that need OUT-OF-REPO action (env vars, DNS records,
external service signups, legal text, content, manual policy decisions).

Owner reads top-down. Each item: **what**, **why**, **how to verify**.

---

## P0 — MUST resolve before first paying donor

### 1. Resend sender domain authentication (SPF + DKIM + DMARC)

**What**: `lib/mailer.ts:5` sends every donor email from `noreply@alpacasibiza.com`.
The domain needs SPF, DKIM, and DMARC DNS records pointing at Resend, or
Gmail / Outlook will spam-folder every adoption welcome.

**Why**: Without DMARC, donor welcome emails fail bulk-sender authentication
(Gmail 2026 rules require it for any commercial / transactional flow).
Recipients won't see the welcome; they'll think payment didn't complete.

**Verify**:
- `dig TXT alpacasibiza.com` shows `v=spf1 include:_spf.resend.com ~all`
- `dig TXT resend._domainkey.alpacasibiza.com` returns a long base64 key
- `dig TXT _dmarc.alpacasibiza.com` returns `v=DMARC1; p=quarantine; rua=mailto:...`
- Resend dashboard → Domains → alpacasibiza.com shows all 3 green

---

### 2. Owner alerting channel (Slack OR Telegram OR generic webhook)

**What**: `lib/owner-notify.ts` fans out dunning escalations (donor at-risk /
action-required) to `OWNER_SLACK_WEBHOOK_URL`, `OWNER_TELEGRAM_BOT_TOKEN +
OWNER_TELEGRAM_CHAT_ID`, or `OWNER_GENERIC_WEBHOOK_URL`. **All are unset
in `.env.local`** — the escalation code runs every payment failure and
silently `Promise.resolve()`s for every channel.

**Why**: When a donor's monthly SEPA fails twice → fails a third time, the
owner needs Slack / phone ping within minutes. Today the system is silently
dropping these signals. Donors lapse without any notification.

**Verify**: After setting `OWNER_SLACK_WEBHOOK_URL`:
1. Trigger a fake escalation via `node -e "import('./lib/owner-notify.ts').then(m => m.notifyOwnerOnEscalation({ vendor: 'mollie', customerId: 'cst_test', failureCount: 2, severity: 'at-risk', donorEmail: 'test@example.com' }))"`
2. Confirm Slack receives the formatted block.

---

### 3. Cron dead-man's switch (Healthchecks.io free tier)

**What**: `vercel.json` cron fires `/api/owner-digest` Mon 09:00 UTC and
`/api/owner-mrr-digest` Mon 06:00 UTC. If Vercel stops firing them
(quota, env-var drop, plan downgrade) **nothing alerts**. Owner notices
weeks later when the Monday email doesn't land.

**Why**: A silent cron is worse than no cron — owner builds a mental model
"I get my weekly MRR" and starts ignoring the absence.

**Verify**:
1. Sign up at `https://healthchecks.io` (free tier — 20 checks)
2. Create check "owner-mrr-digest" with cron pattern `0 6 * * 1` + 1h grace
3. Add the ping URL to env: `HEALTHCHECKS_MRR_DIGEST_URL=https://hc-ping.com/<uuid>`
4. Wire into `app/api/owner-mrr-digest/route.ts` end-of-handler: `fetch(process.env.HEALTHCHECKS_MRR_DIGEST_URL)` (best-effort, no await)
5. Repeat for owner-digest.

**Deferred to growth-tracker**: code change pending env-var availability.

---

### 4. Resend bounce + complaint webhook

**What**: Resend exposes `email.bounced`, `email.delivery_delayed`,
`email.complained` webhook events. **None wired** in this codebase.
Repeated sends to a hard-bounced address (typo'd gift recipient) keep
firing on every Stripe/Mollie retry → erodes domain reputation → all
mail goes to spam.

**Why**: Sender reputation is hard to recover. A 5% bounce rate on a new
domain is enough for Gmail to start spam-foldering EVERY email.

**Verify**:
1. Add `POST /api/resend-webhook` route reading bounce / complaint events
2. Maintain a suppression list (in-memory ok at current volume; KV later)
3. Skip `sendEmail` to suppressed addresses; log + return null id
4. Sign up Resend dashboard → Webhooks → Add Endpoint pointing at the route

**Deferred to growth-tracker**: code change pending Resend webhook signing
secret env var.

---

### 5. Legal page content (Privacy + Terms + Cookies + Impressum/Aviso Legal)

**What**: `app/[locale]/{privacy,terms,cookies}/page.tsx` EXIST but gate
the body on `LEGAL_CONTENT_LIVE === 'true'`. Until that env var is set,
each page renders an amber "content pending — email us" notice. The
cookie banner at `components/cookie-consent.tsx:76` links to `/cookies`
which today is the amber notice — **GDPR Art. 13/14 transparency obligation
is unmet**.

Also missing: `app/[locale]/impressum/page.tsx` (Spain LSSI-CE Art. 10
requires CIF, registered name, address on a dedicated legal-notice page).

**Why**: Without a real privacy policy live + linked, GA4 + GTM
(`G-Y946QDVVQV`, `GTM-KR3CGLS6`) + Resend (US transfer) + Vercel (US
transfer) are all running without lawful basis disclosure.

**Verify**:
1. Drop legal text into `translations/{en,de,es,it,nl,fr}.json` per
   `docs/LEGAL_DROP_IN.md` (note: guide is currently drifted — see
   growth-tracker #11)
2. Set `LEGAL_CONTENT_LIVE=true` in Vercel env
3. Browse to `/en/privacy` and confirm full text renders (not amber notice)
4. Repeat for /terms and /cookies in every locale

---

### 6. Consent UX before payment + before email signup

**What**: Three flows currently take user data without showing TOS or
privacy-policy link:
- `components/newsletter-form.tsx` — no consent checkbox
- `components/gifts/gift-flow.tsx` — no TOS acknowledgement
- `components/adopt/*` — CTAs go directly to Stripe/Mollie checkout with no
  "By clicking Adopt you agree to [Terms] and [Privacy]" copy

**Why**: Consent is GDPR Art. 6(1)(a) basis. PECR (cookies / direct
marketing) requires affirmative consent for newsletter signup.

**Verify**: Each form / CTA renders a checkbox or inline "By submitting you
agree to [Terms] · [Privacy]". Marketing checkboxes must be UN-ticked by
default per PECR.

---

### 7. Article 17 deletion (Right to be Forgotten)

**What**: `app/api/gdpr-request/route.ts` currently only emails the owner
when a deletion request lands. **No actual delete is executed** against
Stripe (`customers.del`), Mollie (`customers.delete`), the in-memory
trackers, or the Resend audience.

**Why**: Under Article 17, a controller has 1 month to delete OR justify
refusal. An email-the-owner approach without a documented manual checklist
will miss systems. Auditor finding.

**Verify**: Owner needs to either:
1. Wire actual SDK delete calls into the route (code change), OR
2. Maintain a runbook (`docs/gdpr-deletion-runbook.md`) listing every system
   to manually purge, with sign-off checklist per request.

Owner-choice. Option 2 is fine at current scale (<50 donors); switch to
option 1 before 200 donors when manual is no longer practical.

---

## P1 — SHOULD resolve before first paying donor

### 8. Uptime monitoring (UptimeRobot OR BetterStack)

**What**: `/healthz` route is well-built (Tier 1 env probe, returns 503
on degraded). No external monitor pinging it. Site can be hard-down for
hours before owner notices.

**Verify**:
- Sign up `https://uptimerobot.com` (free tier, 50 monitors, 5min interval)
- Add monitor for `https://alpacasibiza.com/healthz`
- Add alert contact = owner's email + optional Telegram/Slack
- Trigger a deliberate 503 (toggle Tier 1 env) — confirm alert fires

---

### 9. Test purchase end-to-end on Mollie test mode

**What**: Before live, run one complete subscription through:
1. `MOLLIE_API_KEY=test_xxx` in env
2. Open `/en/adopt` → pick alpaca → tier=monthly → checkout
3. Use Mollie's test SEPA mandate confirmation
4. Confirm welcome email arrives at the donor address
5. `/admin/analytics/subscriptions` shows the row
6. `/admin/analytics/vat` shows one transaction with country breakdown

---

### 10. Mollie webhook delivery test

**What**: Confirm a test payment actually reaches `/api/mollie-webhook`
and returns 200 within Mollie's 15-second window.

**Verify**: Mollie dashboard → Payments → expand the test payment →
"Webhook deliveries" tab shows 200 OK.

---

## P2 — NICE before launch (deferred to growth-tracker.md)

- Sentry / Logtail / Datadog log sink (every `log.error` is currently
  write-only into Vercel logs).
- /api/resend-webhook to track bounces + complaints + auto-suppress.
- Locale-aware donor emails (de/it/es/nl/fr translations of welcome,
  payment-failed, portal-link).
- Translation-key linter (139 dead keys in en.json).
- KV-persistent stores for VAT / dunning / idempotency / subs-cache.
- Mollie email→customerId index (current linear scan ok < 200 customers).

---

## Code-fix items ALREADY APPLIED in this batch

The 6-audit-batch commit shipped these without owner action needed:

- ✅ FareHarbor booking webhook idempotency + try/catch (no donor
  duplicate-reminder on retry).
- ✅ Mollie payment.failed always-200 fail-quiet (no donor
  duplicate-notify on Resend transient outage).
- ✅ Gift welcome `scheduledAt` arrives 11:00 CET / 12:00 CEST instead
  of 1-2 AM local.
- ✅ Stripe welcome email: List-Unsubscribe + replyTo headers
  (Gmail / Yahoo 2026 bulk-sender compliance).
- ✅ CSRF Origin-null bypass closed in `lib/same-origin-guard.ts`
  (token-replay defence per peer review).
- ✅ Dead refund ternary cleaned in mollie-webhook.
- ✅ IP rate limits added to /api/checkout, /api/mollie-checkout,
  /api/availability, /api/google-reviews.
- ✅ Mollie customerId masked in cancel + manage route logs
  (`lib/log-pii.ts` extraction).
- ✅ 13-file SITE_BASE_URL sweep (sitemap, JSON-LD, breadcrumbs,
  email-templates dashboard links).
- ✅ ISO-week boundary fix + Bearer-only auth on owner-mrr-digest.
- ✅ VAT year-boundary dedup + 7-year retention prune fix.
- ✅ 45 regression tests covering all above fixes (648 total).

See `docs/growth-tracker.md` for items deferred with explicit revisit
triggers.
