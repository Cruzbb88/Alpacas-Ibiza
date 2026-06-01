# Brainstorm Brief — Alpacas Ibiza post-launch
**Date:** 2026-05-31
**Frame:** stop treating redesign as a Squarespace replacement; treat the new stack as a *software-leveraged craft farm business*. What does that unlock for San & Bart specifically?
**Skipped (already built):** adopt funnel, gift adoption, certificate, search, FareHarbor passthrough, weaving page, retention emails, abandoned-cart, referral coupons, calendar .ics.

## Constraints baked into the scoring

- **Solo operators** — every idea that needs owner labour to keep alive gets penalised
- **Belgian couple in Ibiza** — diaspora connections matter, EU shipping is cheap, ES tax is moderate
- **14 alpacas (hard cap)** — can't scale herd; must scale value per alpaca or scale adjacent products
- **6 years in** — they have inventory, photos, stories, customer list. Don't undervalue institutional assets.
- **Wishfulfilling Weaving = parallel craft business** — already commercial, under-leveraged on the new stack
- **No newsletter / no journal / no testimonials populated on live site** = they don't WANT to be marketing-active. Anything that requires daily owner output is the wrong idea.

---

## 15 raw ideas

### Revenue (new lines)

| # | Idea | One-line |
|---|---|---|
| 1 | **Quarterly "from the farm" subscription box** | Wool ornament + tea + dye seeds, posted 4×/year. Extends weaving into a product line with recurring revenue, no FareHarbor middleman. |
| 2 | **Wool-by-the-skein direct sale** | Sell raw + spun alpaca wool by the skein to home knitters globally (Etsy/Ravelry compete; selling direct keeps 100% margin). |
| 3 | **"Name your skein" pre-shearing sponsorship** | Adopt-a-paca for craftspeople: sponsor a specific alpaca's spring shearing → receive that alpaca's wool. ~Spring only, 14 slots/year. |
| 4 | **Photoshoot location rental** | Wedding + lifestyle photographers pay to use the farm. The setting is the product. Already half-built — `/weddings-photoshoots` exists on live site. |
| 5 | **Apprentice / craft residency** | Paid 1-week weaving immersion stay. Slow-tourism premium, 4-6 guests/year, very high €/guest. |
| 6 | **Pre-orders on next weaving collection** | Studio output is limited; let buyers reserve a scarf from the next batch 6 months out. |

### Retention (existing donors / adopters)

| # | Idea | One-line |
|---|---|---|
| 7 | **Per-alpaca birthday card automation** | Each alpaca has a birth date; on the day, system sends adopter a personalised "today is Dusty's birthday — here's how she's doing" email. Zero owner labour. |
| 8 | **Daily herd photo via Instagram → owned RSS** | Owner posts to Instagram; cron pulls latest, mirrors to owned `/herd-diary` page + email digest. Borrowed labour pattern. |
| 9 | **Live field webcam** | Stream the morning grazing on `/live`. Folly Farm pattern, drives tour bookings + retention. One-time setup. |
| 10 | **Adopter "upgrade" — swap alpaca mid-subscription** | After 6 months, adopter can switch to a different alpaca (within their tier). Choice-architecture pattern; small code. |
| 11 | **Annual adopter visit day** | One Saturday/year, all adopters welcome on-farm free. Build the announcement + RSVP flow once, owner runs the day. |

### Community / institutional

| # | Idea | One-line |
|---|---|---|
| 12 | **Opt-in adopter directory** | Donors see who else adopted, send notes to each other. Patreon-style. Pure software, owner-zero-touch. |
| 13 | **School-visit program** | Local Ibiza primary schools visit free, funded by an "adopter community pool" line item on the subscription. |

### Operational tools (owner-facing)

| # | Idea | One-line |
|---|---|---|
| 14 | **Owner mobile dashboard / PWA shortcut** | Make the 11 admin pages usable from a phone — quick "today's tours + incoming adoptions + new failures" view. Solo operators are NEVER at a desktop. |
| 15 | **Welfare log per alpaca** | Owner-internal: vet visits, feed changes, behavior notes per animal. Health insurance / sale value documentation. |

---

## Viability classification

| # | Effort | Revenue impact | Owner ongoing | Strategic fit | Verdict |
|---|---|---|---|---|---|
| 1. Subscription box | Med (fulfilment + shipping) | High recurring | High (packing 4×/yr) | High | Defer — fulfilment ops are real work |
| 2. Wool direct sale | Med (product photos + inventory) | Med | Med (shipping) | High | Defer — needs Etsy/Ravelry SEO play |
| 3. Name-your-skein | Low (extends adopt flow) | Med (€200×14) | Low (one batch/year) | **Very high** | **TOP 3** |
| 4. Photoshoot rental | Low (booking form already exists) | High per booking | Low | High | Defer — needs owner calendar logic |
| 5. Apprentice residency | Low (booking form + payment) | Very high €/guest | High (host duty) | Medium | Defer — high owner load |
| 6. Pre-orders on next batch | Med (Stripe pre-auth pattern) | Med | Low | High | Defer — depends on weaving output predictability |
| 7. Birthday-card automation | **Low (~3h)** | Indirect (retention) | **Zero** | **Very high** | **TOP 3** |
| 8. IG → owned RSS mirror | Low | Indirect | **Zero (borrows IG labour)** | High | TIER 2 |
| 9. Live field webcam | Med (HW + bandwidth + uptime) | Indirect | Low | High | TIER 2 (HW dep) |
| 10. Swap-alpaca upgrade | Low | Retention | Zero | Med | TIER 2 |
| 11. Annual adopter visit day | Low (announcement + RSVP) | Indirect | Med (one-day) | Very high | TIER 2 |
| 12. Adopter directory | Med | None direct | Zero | Med | DEFER (privacy compliance work) |
| 13. School-visit program | Low (page + email opt-in) | Funded by donors | Owner picks dates | Very high | TIER 2 |
| 14. **Owner mobile dashboard** | Low (PWA shell already in place) | Indirect | Zero | **Very high** | **TOP 3** |
| 15. Welfare log | Low (CRUD admin page) | None direct | Med (owner enters) | Med | DEFER |

---

## Top 3 — recommended for spec-conversion

### 1. Birthday-card automation per alpaca (idea #7)
**Why this:** zero owner labour, leverages existing email infrastructure (Resend + retention templates), high emotional retention impact, immediate competitive differentiator vs WWF-style generic NGOs. The adopter feels seen by *their specific alpaca*.

**Build estimate:** 3-4 hours. New cron route `/api/birthday-alpaca-emails` running daily, reads each alpaca's birthDate from `lib/tenants/alpacasibiza-content.ts`, queries active subscriptions tagged with that alpaca slug, fires `buildAlpacaBirthdayEmail` (new template in `lib/email-templates-retention.ts`). One Vercel cron entry. Done.

**Data we need:** 14 birth dates. Owner pulls from his records, sends as a list. That's it.

### 2. Owner mobile PWA dashboard (idea #14)
**Why this:** the 11 admin pages we just built are unusable on phone today. Solo operators are NEVER at a desktop. They check the dashboard while feeding alpacas. This unlocks the operational value of everything we've already built.

**Build estimate:** half-day. Existing admin pages are SSR + already responsive in theory. Real work: (a) add a `manifest.webmanifest` admin scope so they can "Install" /admin as a phone app, (b) build `/admin/today` — a single-screen "what matters right now" digest pulling from the existing analytics endpoints, (c) audit each admin page for thumb-friendly tap targets (carry forward the WCAG 2.2 touch-target work).

**Data we need:** none. Pure code.

### 3. Name-your-skein pre-shearing sponsorship (idea #3)
**Why this:** revenue-generating, leverages the existing adopt-funnel infrastructure, only 14 spring slots/year so demand-supply tension is built-in (urgency without manipulation), reinforces craft-business identity.

**Build estimate:** 1 day. Extends `AdoptCheckoutOpts` with a `productType: 'adoption' | 'skein-sponsorship'` discriminator. Spring shearing date → Stripe pre-auth that captures on shearing day. Fulfilment: owner ships the spun wool when ready. Single-tier product: €200/skein.

**Data we need:** owner confirms (a) 14 alpacas × 1 skein each is realistic, (b) average wool yield per spring shearing, (c) willingness to ship internationally (EU is easy, UK/US adds duty paperwork).

---

## Tier 2 — worth a follow-up brainstorm later

8 (IG mirror), 9 (live cam), 10 (swap alpaca), 11 (adopter visit day), 13 (school-visit program).

## Deferred / not now

1, 2, 4, 5, 6, 12, 15 — each has a real obstacle named in the verdict column (fulfilment ops, owner load, privacy compliance work, or requires owner data we don't have).

---

## Honest meta-note

This is 15 ideas with the owner's actual constraints baked in, not a generic feature brainstorm. The pattern across the top 3: **leverage existing infrastructure + zero or minimal ongoing owner labour + clear retention or revenue mechanism**. That's the only filter that matters for a 2-person craft business.

If you want me to convert one of the Top 3 into a buildable spec via `/quick-plan`, name the number. Otherwise this brief sits here until you do.
