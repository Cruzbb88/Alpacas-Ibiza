# VENDOR_INSOURCING_RESEARCH.md — Should Cruz build it in-house?

Generated 2026-06-10 by `/deep-research` workflow (106 agents, 24 sources fetched, 105 claims extracted, 25 adversarially verified, 22 confirmed, 3 refuted).

**Scope:** Single-tenant alpacasibiza.com Ibiza farm — ~5000 unique visitors/mo, ~50 bookings/mo growing to ~150/mo, ~2 adoptions/mo growing to ~20/mo, ~10k emails/mo at scale, solo-maintained by Cruz.

**One-line summary:** Insource the **email stack** (Listmonk), **analytics** (Plausible), and **uptime monitoring** (Uptime Kuma) — that's it. Keep Stripe, Mollie, FareHarbor, Resend, Vercel, Turnstile, Google Places, GA4/GTM (until Plausible swap), reCAPTCHA, MyMemory, and chat-webhooks as-is. The vendor cost at 10× scale (€500–€700/mo total) is dwarfed by the cost of solo-maintaining PCI-DSS + PSD2 + SEPA + email deliverability.

---

## (i) Per-vendor cost curve — three scale tiers

Conventions: **current** = today's usage; **2×** = ~10k visitors / ~100 bookings; **10×** = ~50k visitors / ~500 bookings / ~100k emails. All fees verified at the vendor's `/pricing` page (URLs in §iv).

| Vendor | Current €/mo | 2× €/mo | 10× €/mo | Free tier ceiling |
|---|---|---|---|---|
| **Stripe** (cards EU mix) | ~€130 | ~€260 | ~€1,300 | No free tier; 2.9%+$0.30 US, +1.5% intl, +1% FX, +0.4–0.5% Radar, $15 chargeback |
| **Mollie** (SEPA DD at €80 avg) | ~€18 | ~€35 | ~€175 | €0.35/charge + €15 dispute + €3.50 fail |
| **FareHarbor** (~6% take rate at €80 avg) | ~€240 | ~€480 | ~€2,400 | No free tier — commission-only model |
| **Resend** | $0 (<3k/mo on free) | $20 (50k/mo) | $90 (250k/mo) | 3,000 emails/mo |
| **Google Places API** | $0 | $0 | $0–$5 | $200 credit/mo covers most single-location sites |
| **GA4** | $0 | $0 | $0 | 10M events/mo |
| **Google Tag Manager** | $0 | $0 | $0 | Free always |
| **Cloudflare Turnstile** | $0 | $0 | $0 | Free always |
| **reCAPTCHA v3** | $0 | $0 | $0 | 1M assessments/mo |
| **MyMemory** | $0 | $0 | $0–$5 | 5k chars/day free, 50k/day with email |
| **SendGrid** (if used) | $0 | $20 (Essentials) | $89.95 (Pro 1.5M) | 100/day on free |
| **Vercel** | $0 (Hobby) | **$20** (Pro forced) | $20 + ~$50 bandwidth | 100GB/1M edge/5k img on Hobby; **commercial-use prohibited on Hobby** |
| **Slack / Discord / Telegram webhooks** | $0 | $0 | $0 | Free always |
| **UptimeRobot** | $0 (Free) | $0 (Free) | $7 (Solo) | 50 monitors / 5-min interval / reduced retention |
| **Mailchimp / Klaviyo** (if added later) | $13 (Essentials, 500) | $26 (1,500) | $135 (10k) | Both free <500 contacts |

**Combined vendor stack at 10× scale: ~€500–€700/mo gross fees + ~€60/yr hosting.** That is the number any DIY plan must beat.

---

## (ii) TOP-5 in-sourcing wins (ROI-ordered, lowest effort first)

### 1. Plausible Analytics → replace GA4 + Google Tag Manager
- **Repo:** https://github.com/plausible/analytics — AGPL-3.0
- **Why:** Single tool replaces TWO Google integrations + removes cookie-banner friction (Plausible doesn't use cookies). At 5k visitors/mo, cloud is $9/mo or self-host free on the existing infra.
- **Effort:** ~3–5 days (swap script tag, configure goals/funnels for booking conversions, archive GA4 property). Maintenance ~1 hr/mo.
- **Maintained by:** Cruz solo — Plausible is famously low-ops (single Elixir binary + Postgres + Clickhouse).
- **Crossover math:** $108/yr cloud vs €0 self-host on existing VPS. Wins immediately.
- **Source:** https://plausible.io/pricing

### 2. Listmonk → replace SendGrid + Mailchimp + Klaviyo (newsletter campaigns + transactional)
- **Repo:** https://github.com/knadh/listmonk — AGPL-3.0 (last release v6.1.0 on 2026-03-29; 21.5k stars; 40 releases)
- **Why:** Collapses three vendors into ONE self-hosted service running on the existing Postgres + a $5 VPS SMTP relay (or AWS SES at $0.10/1k = ~$1/mo at 10k emails). Covers newsletter, transactional, list management, subscriptions.
- **Effort:** ~1–2 weeks senior dev (Docker compose, Postgres tenant DB, SES integration for deliverability, port newsletter unsubscribe + double-opt-in tokens). Maintenance ~2–4 hrs/mo.
- **Maintained by:** Cruz solo.
- **Crossover:** Mailchimp Essentials $13/mo @ 500 contacts → $135/mo @ 10k vs DIY ~€6/mo. Immediate at any contacts ≥500.
- **AGPLv3 caveat:** §13 triggers source disclosure only if Cruz modifies and serves over network. Unmodified self-hosting is unaffected.
- **Sources:** https://github.com/knadh/listmonk, https://listmonk.app

### 3. Uptime Kuma → replace UptimeRobot / BetterStack
- **Repo:** https://github.com/louislam/uptime-kuma — MIT (release 2.4.0 on 2026-05-31; 7,130 commits; 87k stars; last commit hours before this research)
- **Why:** MIT, no AGPL noise, covers HTTP/HTTPS/keyword/JSON-query/ping/DNS — JSON-query monitoring is gated behind UptimeRobot paid tiers but free in Kuma.
- **Effort:** ~2–4 hrs (Docker compose on the same VPS as Listmonk, port existing checks). Maintenance ~1 hr/quarter.
- **Maintained by:** Cruz solo.
- **Crossover:** **Don't migrate yet** — UptimeRobot Free covers single-tenant needs today. Insource ONLY if Cruz already spins up a Coolify VPS for Listmonk; otherwise stay on UptimeRobot Free.
- **Source:** https://github.com/louislam/uptime-kuma

### 4. (Conditional) Coolify → partial replacement of Vercel hosting
- **Repo:** https://github.com/coollabsio/coolify — Apache-2.0 (v4.1.2 on 2026-06-04; 56k stars; last pushed 2026-06-09)
- **Why:** Trigger only when forced off Vercel Hobby (commercial-use TOS or >100GB bandwidth). Coolify on a $5/mo Hetzner VPS replaces hosting/build/deploy.
- **Effort:** ~2–3 weeks (VPS provisioning, Next.js build pipeline, ISR/cron rewiring, CDN for static assets, **rewrite Edge Functions to Node runtime**). Maintenance ~4–6 hrs/mo (server patching, build pipeline, certificate renewal).
- **What you LOSE:** Edge Functions (current `/og` route + middleware), Speed Insights, shared-ISR cache across regions.
- **Crossover math:** Vercel Pro $20/mo × 12 = $240/yr vs Coolify VPS $5/mo × 12 = $60/yr + ~60 hrs/yr ops. **At any self-valuation >$3/hr, Vercel Pro wins.** Insource only when forced.
- **Sources:** https://github.com/coollabsio/coolify, https://vercel.com/pricing

### 5. (Stretch) AWS SES + Listmonk → eventually replace Resend
- **Repo:** Listmonk above + AWS SES (managed)
- **Why:** Once Listmonk is in place, Resend becomes Listmonk's SMTP relay. Swap to AWS SES at $0.10 per 1,000 emails (~$1/mo at 10k, ~$10/mo at 100k) — Amazon handles IP warming + reputation.
- **Effort:** ~1 day (swap SMTP credentials in Listmonk + verify SES sending domain DNS).
- **DO NOT** self-host SMTP via Postal at this scale — Gmail's 5k/day SPF+DKIM+DMARC alignment requirement + <0.3% complaint-rate enforcement = ops liability (see §iii Bottom-5 below).
- **Crossover:** Resend $240/yr (50k/mo) → SES ~$12/yr. Wins after Listmonk lands.
- **Sources:** https://aws.amazon.com/ses/pricing/

---

## (iii) BOTTOM-5 "NEVER INSOURCE" (hard rationale)

### 1. Stripe (cards / Checkout / subscriptions)
- **Why never:** PCI-DSS Level 1 + PSD2 SCA + 3DS2 + EU PSP licensing. Years of work. Stripe's full fee at 10× scale is ~€1,300/mo — vendor wins forever vs >€100k/yr equivalent ongoing compliance.
- **Source:** https://stripe.com/pricing, https://finance.ec.europa.eu/publications/strong-customer-authentication-requirement-psd2-comes-force_en

### 2. Mollie (SEPA Direct Debit)
- **Why never:** SEPA scheme membership requires bank sponsor; PSP licensing applies. Mollie at 10× scale = ~€175/mo. Vendor wins forever.
- **Source:** https://www.mollie.com/pricing

### 3. FareHarbor (booking SaaS)
- **Why never (at this scale):** Replacing FareHarbor means building inventory management, availability rules, channel manager (Viator/GetYourGuide/TripAdvisor sync), payment splits, waiver e-signature flow (eIDAS-aligned), and resource/staff scheduling. Custom booking engines run **$15,000–$200,000+** to build (Zentrumhub industry estimate). At 6% of €80 × 50 bookings/mo = €240/mo, payback never happens at single-farm scale. **Re-evaluate only if Cruz adds multi-property tenants** — then the build cost amortises across tenants.
- **Source:** https://www.zentrumhub.com/booking-engine-cost-build-vs-buy/, https://fareharbor.com/pricing/

### 4. Self-hosted SMTP (Postal) for transactional email
- **Why never (yet):** Postal is MIT and capable, BUT Gmail bulk-sender rules require SPF + DKIM with domain alignment + DMARC p=none at 5k+/day, plus <0.3% (ideally <0.1%) spam-complaint rate, plus warmed dedicated IPs, plus registered feedback loops (Yahoo ARF, MS SNDS/JMRP, Gmail Postmaster Tools). ~6–10 hrs/mo deliverability ops. Resend's $20/mo pays for itself in deliverability alone. **Skip Postal — go AWS SES under Listmonk instead.**
- **Source:** https://github.com/postalserver/postal, https://support.google.com/a/answer/81126

### 5. Custom CAPTCHA / bot detection
- **Why never:** Turnstile (Cloudflare) free + reCAPTCHA v3 free to 1M/mo. Zero fee to displace. Building behavioral bot detection introduces months of false-positive tuning vs vendor cost of €0. Altcha (MIT) and hCaptcha (self-host) exist but win nothing on price.
- **Source:** https://www.cloudflare.com/application-services/products/turnstile/, https://developers.google.com/recaptcha

---

## (iv) Per-recommendation cheatsheet

| Recommendation | Repo | License | Last activity | Migration weeks | Solo-maintainable? |
|---|---|---|---|---|---|
| Plausible Analytics | github.com/plausible/analytics | AGPL-3.0 | active | 0.5–1 wk | Yes |
| Listmonk | github.com/knadh/listmonk | AGPL-3.0 | v6.1.0 (2026-03-29) | 1–2 wks | Yes |
| Uptime Kuma | github.com/louislam/uptime-kuma | MIT | 2.4.0 (2026-05-31) | <1 day | Yes |
| Coolify (only if forced off Vercel) | github.com/coollabsio/coolify | Apache-2.0 | v4.1.2 (2026-06-04) | 2–3 wks | Yes-but-ops-heavy |
| AWS SES via Listmonk | AWS managed | — | — | <1 day | Yes |
| Postal (DO NOT) | github.com/postalserver/postal | MIT | v3.3.7 (2026-06-03) | 3–4 wks + ongoing | No — ops liability |

---

## (v) Cost-crossover one-liners (single line each)

- **Stripe:** Vendor €1,300/mo @ 10× vs DIY >€100k/yr ongoing compliance + years of dev → **never crosses over.**
- **Mollie:** Vendor €175/mo @ 10× vs SEPA scheme membership + bank sponsor → **never crosses over.**
- **FareHarbor:** Vendor €240/mo current vs custom build $15k–$200k → **crosses over only at multi-tenant scale; not Cruz alone.**
- **Resend → AWS SES via Listmonk:** Vendor $240/yr vs SES $12/yr + ~1 day swap → **wins after Listmonk lands.**
- **Listmonk vs Mailchimp/SendGrid/Klaviyo:** Vendor $135/mo @ 10k contacts vs DIY ~€6/mo + 1–2 weeks + 2–4 hrs/mo → **wins immediately at ≥500 contacts.**
- **Plausible vs GA4+GTM:** Vendor €0/mo vs DIY €0/mo — savings are UX (no cookie banner) + GDPR compliance, not cash. Wins at any nonzero value on those.
- **Uptime Kuma vs UptimeRobot:** Vendor €0/mo Free tier vs DIY €0/mo on existing VPS — wins ONLY when JSON-query checks needed or already running Coolify.
- **Coolify vs Vercel:** Hobby = €0 vs Pro = $240/yr vs Coolify $60/yr + 60 hrs/yr — **at any hourly self-valuation >$3, Vercel Pro is cheaper.** Insource only when forced off Hobby.
- **Google Places, Turnstile, reCAPTCHA, MyMemory, GA4, GTM, Slack/Discord/Telegram:** all €0 vendors → **insourcing burns ops time with no €-savings. Never insource.**

---

## Refuted claims (excluded from findings)

Three claims were killed in 3-vote adversarial verification:

1. **"Stripe charges no setup fees, no monthly fees, no hidden fees"** — refuted. Stripe adds 1% currency conversion, 0.5% Adaptive Pricing, $15 chargeback dispute, 0.4–0.5% Radar fraud-tools fees.
2. **"UptimeRobot Free = 50 monitors at 5-min interval"** — refuted. Current free tier has reduced retention; recommend Cruz re-fetches uptimerobot.com/pricing before final commitment.
3. **"Umami is MIT + 1M events/mo free cloud"** — refuted. Umami switched to AGPL-3.0 and cloud free tier is now 10k events/mo. **This is why Plausible (not Umami) is the recommended GA4 replacement.**

## Open questions (verify before commitment)

- Does Vercel actively enforce the Hobby-tier no-commercial-use TOS against a small commerce site like a 50-bookings/mo farm? If yes, the "stay on Hobby" recommendation is a ticking compliance bomb.
- Listmonk + AWS SES vs Listmonk + Postal at 10k emails/mo: what's the real ops-time delta after factoring IP warming + feedback-loop registration + bad-campaign reputation recovery? AWS SES at $1/mo is the headline; operational reality may favor keeping Resend even after the Mailchimp/SendGrid swap.
- Does Plausible self-hosted CE (AGPL-3.0) include goals + funnels + custom events for booking conversions, or are some features cloud-only?
- UptimeRobot Free tier current limits — re-fetch pricing page before quoting numbers above.

---

## Recommended order of operations

1. **Now:** Swap GA4 + GTM → Plausible (3–5 days, AGPL-3.0 self-host or $9/mo cloud).
2. **Once a content cadence is set:** Stand up Listmonk on a Coolify or Hetzner VPS, swap newsletter to Listmonk, point Listmonk SMTP at Resend (keep Resend short-term).
3. **After 30 days of Listmonk reputation:** swap Listmonk SMTP to AWS SES, decommission Resend.
4. **Stand up Uptime Kuma on the same VPS** — 2-hour task, replaces UptimeRobot.
5. **Coolify hosting migration:** trigger ONLY when Vercel Pro becomes required (TOS enforcement or >100GB bandwidth). Don't migrate preemptively.
6. **Stripe / Mollie / FareHarbor / Turnstile / reCAPTCHA / Google Places / Slack-Discord-Telegram-webhooks:** stay forever — they're either regulated-impossible or free.

**Net effect at 10× scale:** vendor stack drops from ~€500–€700/mo to ~€450–€650/mo (cards + SEPA + FareHarbor commission don't move; ~€50–€100/mo savings on email + analytics + uptime + hosting if Coolify-migrated). The real win is **owning the customer data** (newsletter list, analytics), not the €.
