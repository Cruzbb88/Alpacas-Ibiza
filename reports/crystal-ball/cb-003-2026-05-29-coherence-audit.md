---
report_number: "cb-003"
report_type: "crystal-ball-full"
date: "2026-05-29"
project: "alpaca-farm-redesign"
slug: "coherence-audit"
mode: "degraded-local-file (Cortex policy-blocked per feedback_no_cortex_saves)"
l1_outcome_alignment: 78
l2_integration_chains: 64
overall_coherence: 71
previous_overall: null
trend: "first_run (this report_type at this depth)"
---

# Crystal Ball — Coherence Audit (post-11-cycle build)

**Mode:** degraded local-file. Cortex history queries are policy-blocked (`feedback_no_cortex_saves` + PreToolUse hook). L3/L5 grounded in git log + ADRs + handoff docs instead of memory statistics.

## Headline

11 cycles of building shipped a lot of correct code, but coherence is **71/100** because three growth/retention features are **orphaned** — built on my side, never connected on the consumer side (parallel-AI's `lib/payment-handlers.ts`). These are NOT owner-blockers. They're integration seams left open across the two-AI boundary.

## L1 — Outcome Alignment: 78/100

Adopt funnel stage-by-stage:

| Stage | Status |
|---|---|
| Discovery / counters / trust | IMPLEMENTED |
| Picker + personality quiz | IMPLEMENTED |
| Tier selection (€75/€900) | IMPLEMENTED |
| Gift option | IMPLEMENTED (full chain both vendors) |
| Checkout (Stripe + Mollie) | SCAFFOLD (owner-blocked: keys + price IDs unset) |
| Payment / webhook / idempotency | IMPLEMENTED |
| Welcome email (locale + gift-branched) | IMPLEMENTED |
| **Certificate** | **WAS BROKEN → FIXED cycle-12 (see below)** |
| Retention (quarterly cron) | SCAFFOLD (owner content UNMAPPED) |
| Renewal (daily cron) | IMPLEMENTED but referral CTA permanently dead (see L2#2) |
| **Referral loop** | **BROKEN — coupon never minted** |
| Deferred-gift delivery | REDUNDANT STUB (Resend scheduledAt covers it; cron does nothing) |

**Drift flagged** (built, serves no core outcome): invented experience sub-routes, shop e-commerce UI against an email-only live business (ADR 004), 6 locales vs NL/EN/DE/ES real demand. All pre-existing; not this session.

## L2 — Integration Chains: 64/100

1. **Gift adoption** ✅ connects — form → URL → vendor adapter → checkout metadata → handler. Keys match. ⚠️ caveat: `isGiftPurchase` requires `gift_message != null` (`payment-handlers.ts:225/959`) but the simplified form has no message field → name+email-only gift misroutes welcome to buyer.
2. **Referral loop** ❌ — `createReferralCoupon` (`lib/payment-handlers-referral.ts:83`) is called NOWHERE. The whole LTV referral loop is dead; inbound coupon-apply works but no codes ever exist.
3. **Renewal** ⚠️ — degrades gracefully on null `referral_code`, but because of #2 the code is ALWAYS null → renewal email's referral CTA permanently dead. Impact-stats block UNMAPPED.
4. **Crons** ⚠️ — `adopt-deferred-gifts` is a confirmed stub (`dispatched:0`); harmless because Resend `scheduledAt` is the real delivery path. Quarterly works, content UNMAPPED.
5. **Certificate** ❌ → **FIXED 2026-05-29 cycle-12**: success_url (`checkout/route.ts`) + returnUrl (`mollie-checkout/route.ts`) now thread `alpaca_name` (always) + `donor_name` (gift recipient). Self-adoption donor's own name still needs a session-id fetch path — handed off.
6. **Withdrawal waiver** ❌ orphan — `withdrawal-waiver-checkbox.tsx` unimported. EU Directive 2011/83 Art 16(m) gap. Owner-sign-off-blocked on copy.

## Fixed this session (in-territory, no boundary cross)

- **Certificate seam (#5)** — threaded `alpaca_name` + gift `donor_name` into both vendors' return URLs. Every gift certificate now shows the right alpaca + recipient; self-adoptions show the right alpaca (donor name pending session-fetch). tsc clean.

## Handed off to parallel AI (their `lib/payment-handlers.ts`)

- **Referral coupon mint (#2)** — call `createReferralCoupon` after welcome + persist `metadata.referral_code`. Un-blocks #2 AND #3.
- **Gift-message detection (#1)** — relax `isGiftPurchase` to not require `gift_message`.
- **Self-adoption certificate name (#5 remainder)** — add `&session_id={CHECKOUT_SESSION_ID}` to success_url + a tiny session-fetch in AdoptThankYou, OR read name from webhook metadata into a signed cookie.

## Owner-blocked (not code)

- Withdrawal-waiver copy sign-off (#6), then 1h to wire
- Stripe/Mollie keys + price IDs, legal text, shop prices, photos

## Overall: 71/100

Not a design-quality problem — the code is correct in isolation. It's an **assembly** problem: the two-AI parallel build left load-bearing connections unwired. The single highest-leverage non-owner action is the referral-coupon mint (one ~5-line call in the consumer handler unblocks the entire LTV loop + the renewal CTA).
