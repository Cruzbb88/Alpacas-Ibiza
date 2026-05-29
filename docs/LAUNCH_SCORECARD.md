# Launch scorecard — "is it done?" defined per system

The problem this solves: I've been building features without a shared
definition of *done*. This file gives every system a **measurable
done-criterion**, the **parameter to check**, and the **peer benchmark** to
compare against. When you ask "is X done?" the answer is a row lookup, not an
opinion.

Three states per row:
- **CODE-DONE** — built, tsc-clean, tested. No more engineering needed.
- **DATA-BLOCKED** — code is done; waiting on a value only you can supply
  (env var, content, asset, legal text). Listed in `PERSONALIZATION_INTAKE.md`.
- **VERIFY-BLOCKED** — needs a real-world check that can't run locally (live
  payment, deployed URL, DNS propagation, email deliverability).

A system is **LAUNCH-READY** only when CODE-DONE **and** every DATA-BLOCKED
slot is filled **and** every VERIFY-BLOCKED check has passed once.

---

## How to read the "compare to" column

Each system has ONE primary metric and a target drawn from a named peer
(Patreon / Memberful / Substack / Stripe / Mollie published behaviour) or a
spec/legal constraint. That's the bar. If we hit it, the system is done — not
"done" in the abstract, done *against that number*.

---

## Payments

| System | Done-criterion (measurable) | Parameter to check | Compare to | State |
|---|---|---|---|---|
| Hosted checkout (Stripe + Mollie) | A test-mode purchase 303-redirects, returns to `?checkout=success`, webhook creates the subscription | `PAYMENT_VENDOR` set + `MOLLIE_API_KEY`/`STRIPE_SECRET_KEY` set | Mollie/Stripe hosted-redirect baseline | DATA-BLOCKED (keys) + VERIFY-BLOCKED (test purchase) |
| Embedded checkout (Stripe Elements) | `CHECKOUT_MODE=embedded` renders inline card field; PaymentIntent confirms without leaving site | `CHECKOUT_MODE`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe: embedded converts +15-25% vs hosted | CODE-DONE, DATA-BLOCKED (flag+key) |
| Embedded checkout (Mollie Components) | Same, Mollie path, when `PAYMENT_VENDOR=mollie` | `CHECKOUT_MODE`, `MOLLIE_PROFILE_ID` | Mollie: Components +15-20% vs hosted | CODE-DONE, DATA-BLOCKED (flag+profile) |
| Webhook fail-quiet | Every handler returns 200 even on email failure; no duplicate-send on retry | 712-test suite green | Stripe Connect docs prescribe this | CODE-DONE |
| Webhook idempotency | Re-delivered event short-circuits via markProcessed | `webhook-idempotency` TTL = 4 days | > Stripe 3-day + Mollie 18h retry windows ✓ | CODE-DONE |
| Dunning escalation ladder | first → at-risk → action-required fires owner alert at ≥2 fails | failure-counter TTL 30d, escalation at count≥2 | Memberful dunning sequence | CODE-DONE, DATA-BLOCKED (owner alert channel) |
| VAT-OSS tracker | Cross-border revenue tallied; admin shows threshold remaining | `OSS_THRESHOLD = €10,000`, amber at 60% | EU OSS legal threshold | CODE-DONE |
| Event replay admin | Owner can re-fire any logged event; idempotency makes it safe | `DATABASE_URL` set (events table populated) | Stripe Dashboard "Events → Resend" | CODE-DONE, DATA-BLOCKED (DB) |

## Donor experience

| System | Done-criterion | Parameter | Compare to | State |
|---|---|---|---|---|
| Donor portal `/my-adoption` | Shows alpaca photo+bio, subscription, mandate, payment history, quarterly news, manage buttons | renders for a valid status token | Patreon/Memberful member dashboard | CODE-DONE, DATA-BLOCKED (alpaca photos/bios) |
| Portal i18n | Every label resolves via `t(locale)` in 6 languages | `portal-keys-coverage.test.ts` green | Patreon/Memberful native-language portals | CODE-DONE, DATA-BLOCKED (de/it/es/nl/fr translations) |
| SEPA mandate surface | Status badge (valid/pending/revoked) + masked IBAN | Mollie `customerMandates.page` returns | N26/Klarna mandate tab | CODE-DONE, VERIFY-BLOCKED (live mandate) |
| Payment history | Last 24 charges, newest-first, status badges | cap = 24 rows | Patreon billing history | CODE-DONE |
| Photo gallery | Per-alpaca grid; empty-state until photos exist | `getMergedAlpacaGallery(slug)` | Patreon media tab | CODE-DONE, DATA-BLOCKED (photos + `BLOB_READ_WRITE_TOKEN`) |
| Social share card | `/api/og/adoption-share?alpaca=X` renders 1200×630 PNG; share CTA copies link | route returns 200 image | Patreon/Substack per-creator OG cards | CODE-DONE |
| Referral system | `?ref=CODE` → `metadata.referredBy`; admin leaderboard groups by code | `NEWSLETTER_SIGNING_KEY` set (code generation) | Patreon/Substack 30-50% sign-ups via referral | CODE-DONE |

## Lifecycle email

| System | Done-criterion | Parameter | Compare to | State |
|---|---|---|---|---|
| Welcome email | Sent on payment.paid; locale-correct subject; gift variant routes to recipient | 24 subjects across 6 locales | Patreon/Substack onboarding email | CODE-DONE, DATA-BLOCKED (de/it/es/nl/fr body translations) |
| Payment-failed email | Donor + owner notified; subject escalates by severity in donor's locale | 18 subjects (6 locales × 3 severities) | Memberful dunning email | CODE-DONE |
| Quarterly farm update | Cron sends owner-composed news to active adopters Jan/Apr/Jul/Oct 1 | cron `0 9 1 1,4,7,10 *` | Substack quarterly digest | CODE-DONE, DATA-BLOCKED (owner writes content per quarter) |
| Milestone emails | 30d/180d/365d/730d anniversary email per donor, daily cron | milestones `[30,180,365,730]` | Memberful/Substack +15-25% retention | CODE-DONE, DATA-BLOCKED (`HEARTBEAT_*` for monitoring) |
| Deliverability (suppression) | Bounce/complaint webhook adds to suppression; mailer skips suppressed | `RESEND_WEBHOOK_SECRET` set | Gmail/Yahoo 2026 bulk-sender rules | CODE-DONE, DATA-BLOCKED (Resend webhook + secret) |
| List-Unsubscribe + replyTo | Every commercial email carries both headers | present on welcome+failure | RFC 8058 / Gmail one-click | CODE-DONE |
| Sender authentication | SPF + DKIM + DMARC green on alpacasibiza.com | `dig TXT _dmarc.alpacasibiza.com` | Gmail 2026 requires DMARC | VERIFY-BLOCKED (DNS — owner) |

## Admin / ops

| System | Done-criterion | Parameter | Compare to | State |
|---|---|---|---|---|
| MRR/ARR digest | Weekly Monday email: MRR, ARR, active, new, churn, dunning | cron `0 6 * * 1`, ISO-week window | ChartMogul/Baremetrics weekly digest | CODE-DONE, DATA-BLOCKED (`CRON_SECRET`, owner email) |
| Cron dead-man's switch | Healthchecks.io alerts if any cron stops firing | `HEARTBEAT_*_URL` set (4 crons) | Cronitor/healthchecks.io standard | CODE-DONE, DATA-BLOCKED (signup + URLs) |
| Admin auth | Every `/admin/**` page redirects to login without session; 8h JWT | `ADMIN_USERNAME`/`PASSWORD`/`NEXTAUTH_SECRET` | NextAuth credentials baseline | CODE-DONE, DATA-BLOCKED (creds) |
| DB-backed admin reads | Subscriptions page reads DB, falls back to Mollie; "Source: DB/live" badge | `DATABASE_URL` set | Patreon admin reads own DB, not Stripe API | CODE-DONE, DATA-BLOCKED (DB) |
| Photo upload admin | Owner uploads alpaca photos → Vercel Blob → portal shows them | `BLOB_READ_WRITE_TOKEN` set | Shopify product-image uploader | CODE-DONE, DATA-BLOCKED (token) |
| Quarterly auto-suggest | "Auto-suggest" button fills a starter draft from herd + season | deterministic, no AI dependency | Substack/Notion content scaffolding | CODE-DONE |
| Uptime monitor | UptimeRobot pings `/healthz`, alerts on 503 | external signup | UptimeRobot/BetterStack standard | VERIFY-BLOCKED (signup — owner) |
| Observability sink | Sentry/Logtail tails `log.error` | not wired | Sentry standard | NOT BUILT (growth-tracker — deferred) |

## Legal / compliance

| System | Done-criterion | Parameter | Compare to | State |
|---|---|---|---|---|
| Privacy / Terms / Cookies | Pages render real legal text, footer-linked, indexed | `LEGAL_CONTENT_LIVE=true` | GDPR Art. 13/14 | CODE-DONE, DATA-BLOCKED (legal text) |
| Impressum / Aviso Legal | Page renders company name + address + CIF | `impressum.*Value` keys filled | Spain LSSI-CE Art. 10 | CODE-DONE, DATA-BLOCKED (company details) |
| Consent UX | Newsletter checkbox required; adopt+gift show TOS notice | rendered on all 3 forms | GDPR Art. 6(1)(a) / PECR | CODE-DONE |
| GDPR Article 17 deletion | Request emails owner with Mollie customer ID; runbook covers all systems | `docs/gdpr-deletion-runbook.md` | EU 1-month deletion window | CODE-DONE (manual runbook) |
| Cookie consent gate | `trackEvent` no-ops until consent accepted | `hasAnalyticsConsent()` | PECR pre-consent rule | CODE-DONE |

---

## The single launch gate

Before taking the first real euro, ALL of these must be true:

1. `PAYMENT_VENDOR` + payment keys set, ONE test-mode purchase completed end-to-end
2. SPF/DKIM/DMARC green (else welcomes spam-folder)
3. `CRON_SECRET` + `CONTACT_EMAIL`/`OWNER_EMAIL` set (else no digests/alerts)
4. Legal pages live (`LEGAL_CONTENT_LIVE=true`) + Impressum filled
5. At least one owner-alert channel set (`OWNER_SLACK_WEBHOOK_URL` or Telegram)
6. Mollie webhook URL registered in Mollie dashboard, one test delivery = 200

Everything else (embedded checkout, DB layer, photo upload, milestones,
referrals) is **additive** — the site takes money safely without them. They
are conversion/retention multipliers, switched on by filling the slots in
`PERSONALIZATION_INTAKE.md`.

---

## Parameter resonance summary (from resonance-finder L2)

Highest-sensitivity knobs — changing these has the largest behavioural impact:

| Rank | Parameter | Current | Why it's sensitive |
|---|---|---|---|
| 1 | `PAYMENT_VENDOR` | mollie | Routes ALL money; wrong value = checkout falls back to mailto |
| 2 | `CHECKOUT_MODE` | hosted | hosted vs embedded = ~20% conversion delta |
| 3 | `LEGAL_CONTENT_LIVE` | unset | Gates GDPR compliance + whether legal pages show real text |
| 4 | webhook-idempotency TTL | 4d | Too low = duplicate sends; too high = memory growth |
| 5 | failure-counter TTL | 30d | Too low = re-charge a lapsing donor as "first fail" |
| 6 | Mollie iteration cap | 500 | Caps every admin/cron at 500 subs (years of runway at €75/mo) |
| 7 | owner-notify timeout | 2s | Too high stalls the webhook response into retry territory |
| 8 | payment-history cap | 24 | Donor-visible ledger length |

All current values verified sane by resonance-finder 2026-05-29. No retune
needed until donor count crosses ~200 (then: persist in-memory stores to DB,
see growth-tracker #1).
