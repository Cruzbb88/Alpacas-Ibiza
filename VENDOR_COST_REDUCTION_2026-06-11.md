# Vendor cost reduction — "keep more cash" status + roadmap
**Compiled 2026-06-11** from 4 parallel research passes (FareHarbor/booking, email, hosting/cron, reviews/misc) with live 2026 pricing. Goal: replace fee-bearing SaaS with cheaper/free/OSS where it doesn't hurt the business.

## TL;DR — biggest levers
| Lever | Status | €/yr impact | Effort |
|---|---|---|---|
| **Mollie SEPA instead of Stripe** | ✅ DONE (ADR-019) | **~€2,250/yr saved** @50 donors | banked |
| **Vercel Hobby instead of Pro for crons** | ✅ FIXED THIS PASS (note was stale) | **~€220/yr saved** | €0 — all 7 crons are daily |
| **FareHarbor → flat-fee booking (Bookeo) for tours** | ⏳ owner decision | **~€3,000/yr** (the 6% customer surcharge) | 1–2 wk migration |
| **Never pay SendGrid** (free tier gone 2025) | ✅ confirmed droppable | avoids ~€240/yr | €0 — Resend covers it |
| Maps → OpenStreetMap | ✅ DONE | avoids Google Maps fees | banked |

---

## 1. Payments — already optimized ✅
Mollie SEPA Direct Debit (**€0.25 flat/charge**) is the default vs Stripe cards (**~€1.75/charge**). At 50 donors × €75/mo that's **~€900/yr in fees + ~€1,350/yr in avoided involuntary churn = ~€2,250/yr saved** (handoff `2026-05-27-mollie-sepa-wired.md`). Nothing more to do; biggest single win already banked.

## 2. FareHarbor — the biggest *remaining* lever ⏳
**How FareHarbor charges:** €0 monthly, but adds **~6% on top of the customer's price** at checkout (visible line item) + the operator pays ~1.9–2.9% processing. On ~€50k/yr of online tours that's **~€3,000/yr extracted from customers** + ~€1,000 operator processing. The 6% can't be removed without absorbing it.

**Where we are:** ADR-021 already moves **adoption** off FareHarbor to on-site Stripe/Mollie (12-month migration). **Tour/experience bookings still run through FareHarbor** — that's the unpulled lever.

**Cheapest replacements (2026):**
| Option | Cost | Notes |
|---|---|---|
| **Bookeo Standard** ⭐ | **~€30/mo flat, 0% commission** | Eliminates the 6% customer surcharge; EUR pricing, no lock-in, EU VAT support. Best fit for a direct-booking farm |
| Bókun (Tripadvisor) | $49/mo + ~1.5% | Worth it only if you want Viator/GetYourGuide channel distribution |
| **Build in-house** on existing Next.js + Stripe/Mollie | €7.7k–11.6k one-time, then ~€700/yr | Break-even ~yr 2–3 vs Bookeo; full control, no commission. Do later if dev capacity |
| Cal.com self-host | ❌ not fit | It's a meeting scheduler — no tour capacity/group/multi-ticket. Commercial self-host license unclear |

**Recommendation:** **Phase 1 — move tour booking to Bookeo (~€360/yr)** to kill the ~€3,000/yr customer surcharge now. **Phase 2 — build minimal in-house** on the Stripe/Mollie rails once demand is proven. (Owner decision + their FareHarbor contract terms needed.)

## 3. Hosting + crons — FIXED ✅ (was the stale "need Pro" note)
**The 7 crons are all daily-or-weekly** (`vercel.json`: weekly digests, quarterly update, daily reminders/gifts/milestones/birthdays — **none sub-daily**). Per 2026 Vercel docs, **Hobby (free) now allows up to 100 crons/project, capped at once-per-day frequency** — so **all 7 run free on Hobby. No Vercel Pro ($20/mo ≈ €220/yr) needed.** The old "Hobby only supports 2 crons" guidance is outdated (Vercel changelog: 100/project on every plan).
- **If Vercel ever tightens this:** point a **free external scheduler** (cron-job.org or a free Cloudflare Worker) at the existing `/api/*` cron routes — they're already secured by `CRON_SECRET`. €0, ~2h.
- Full host move (Cloudflare Workers + OpenNext ~€55/yr, or Hetzner VPS ~€54/yr) is only worth it for other reasons, not the crons.

## 4. Transactional email — likely €0, one watch-item
Resend free tier = **3,000/mo but capped at 100/day**. At this volume that's **€0** — *unless* a batch (e.g. all renewal reminders on one day) exceeds 100/day. Mitigations, all €0 / ~1–3h (swap the one `lib/mailer.ts` SDK call):
- **Brevo free** — 300/day, 5k/mo, EU-hosted (GDPR-friendly). Best free upgrade if batches grow.
- **AWS SES** — ~€0.10/1,000, no daily cap; cheapest at scale, more setup.
- **Self-hosted SMTP** — ❌ not worth the deliverability risk for a small EU sender.

## 5. Reviews + misc — mostly already free
| Service | 2026 cost here | Action |
|---|---|---|
| Google Places (rating/count, 6h cache) | **€0** (well under free threshold) | keep; or go static text to drop the billing-account dependency |
| **SendGrid** (optional list mgmt) | free tier **eliminated 2025** → $20/mo min | **drop it** — Resend covers transactional; Brevo free if list mgmt ever needed |
| Cloudflare Turnstile / reCAPTCHA v3 | **€0** | both free; **reCAPTCHA legacy keys face 2026 deprecation** — Turnstile (1M/mo free) is the safer long-term default |
| GA4 / GTM / OSM | **€0** | keep |
| Uptime (UptimeRobot) | free tier now **non-commercial** | switch to **Freshping** (free, commercial-OK) |
| Error tracking (custom `/api/log-error`) | **€0** | optional: Sentry free tier (5k errors/mo) adds grouping/alerts |

---

## Net picture
- **Already banked:** Mollie (~€2,250/yr) + Maps→OSM + free analytics/captcha stack.
- **Fixed this pass (€0 effort):** Vercel stays Hobby → **~€220/yr** not spent on Pro.
- **Biggest open lever (owner call):** move tour booking off FareHarbor → **~€3,000/yr** of customer-facing fees, via Bookeo (~€360/yr) now or in-house later.
- **Watch-items:** Resend 100/day cap (→ Brevo free if needed); never pay SendGrid.

Sources: FareHarbor/Bokun/Bookeo/Cal.com pricing pages, Vercel cron docs + changelog, Resend/Brevo/AWS SES pricing, Google Maps Platform + SendGrid + Cloudflare pricing — all retrieved 2026-06-11. Pricing flagged unverified in the source briefs: Peek Pro, Xola-EU, Brevo monthly cap, ZeptoMail post-July.
