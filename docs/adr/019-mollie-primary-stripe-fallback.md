# ADR 019 — Mollie primary, Stripe fallback (supersedes ADR 015)

**Status:** Accepted
**Date:** 2026-05-28
**Supersedes:** [ADR 015 — Stripe primary, Mollie deferred](015-stripe-primary-mollie-deferred.md)

## Context

ADR 015 chose Stripe as the primary processor for Adopt-a-Paca on the basis
that Stripe's developer experience (CLI, webhooks dashboard, hosted Customer
Portal, well-documented retries) shipped a working flow fastest. Mollie was
deferred as an optimisation we'd swap in later if the cost gap mattered.

By 2026-05, three things changed:

1. **Cost is meaningful.** At €75/mo per donor:
   - Stripe blended fee on EU cards: **~€1.75 per charge** (€21/yr per donor).
   - Mollie SEPA Direct Debit: **€0.25 flat per charge** (€3/yr per donor).
   - Net saving: **~€18 per donor per year**. At 100 active adopters that's
     **~€1,800/year** kept on the farm side instead of going to a US processor.
2. **Mollie now has an MCP server.** Mollie shipped an official Model Context
   Protocol server in 2026 ([docs](https://docs.mollie.com/docs/mollie-mcp-server))
   that exposes 10 tools across Payments, Customers, Subscriptions, Mandates,
   Invoices, Settlements, Webhooks. So the previous "Stripe has better dev/AI
   tooling" advantage no longer holds for our day-to-day workflow.
3. **Most donors are EU-based.** Mollie's strongest payment methods (SEPA, iDEAL,
   Bancontact, Belfius) cover the bulk of Alpacas Ibiza's target audience
   better than Stripe's global card-first defaults.

## Decision

Mollie is now the **default** payment vendor. Stripe is retained as a
**fallback** — set `PAYMENT_VENDOR=stripe` to switch back without code change.

### Code consequences

1. `lib/payment-vendor.ts` `getPaymentAdapter()` default flipped from
   `mailto` to `mollie`. The `default:` branch in the switch now returns
   `mollieAdapter()`.
2. `.env.local.example` lists Mollie first, with the env-vars description
   moved above Stripe.
3. The Mollie webhook gained two new handlers to reach Stripe parity:
   - `handleMolliePaymentFailed` — notifies donor + owner on SEPA fail,
     points donor at the manage endpoint to update payment.
   - `handleMollieSubscriptionCanceled` — owner notification on cancel.
4. `handleMolliePaymentPaid` gained an `ownerEmail` dep + tri-state
   `ownerNotified` result, mirroring the Stripe handler updated this session.
5. New `/api/mollie-manage` + `/api/mollie-manage/cancel` routes provide a
   token-gated cancel flow. Mollie has no hosted billing portal — this
   replaces what Stripe's Customer Portal gives us for free. Same
   email-oracle closure as ADR 017 / the Stripe billing-portal route.
6. New `lib/mollie-manage-token.ts` HMAC-signs cancel-action capabilities
   using the same `NEWSLETTER_SIGNING_KEY → NEXTAUTH_SECRET` fallback chain.
7. Donor-facing copy updated:
   - `adopt.ctaSubtext` — "via Stripe" → "via Mollie"
   - `adopt.faqA7` — payment methods list updated (adds iDEAL + Bancontact)
   - `adopt.trustSecurePayments` — "by Stripe" → "by Mollie"
8. `BillingPortalLink` component gained a `vendor` prop. Default 'mollie'
   posts to `/api/mollie-manage`; pass `vendor="stripe"` to switch.
9. `.mcp.json` declares the Mollie MCP server so any Claude Code session in
   this repo can inspect Mollie data once `MOLLIE_API_KEY` is set locally.

## Trade-offs accepted

- **No hosted portal.** Mollie offers no equivalent of Stripe Customer
  Portal. We build our own token-gated cancel + update flow. Update-payment
  (re-mandate) is not yet implemented — donors with a failed SEPA mandate
  currently email us. ADR 020 will tackle re-mandate when needed.
- **Slower fallback to cards.** SEPA settles in ~3 days vs Stripe-card
  ~2 days. Acceptable for a subscription product where renewals don't need
  same-day cash flow.
- **Card-payment fee for non-SEPA donors.** Mollie still charges Stripe-like
  rates for non-SEPA card payments. A donor who pays by card via Mollie costs
  the same as via Stripe. The savings story is specifically for the SEPA
  cohort. We surface SEPA Direct Debit as the recommended payment method
  on the Mollie checkout page (default behaviour for Mollie EUR Payments).

## Revert path

`PAYMENT_VENDOR=stripe` in env. No code rollback needed — Stripe adapter +
webhook + handlers remain intact.

## References

- [ADR 015 — Stripe primary, Mollie deferred (superseded)](015-stripe-primary-mollie-deferred.md)
- [ADR 016 — Pure-function payment handlers](016-pure-function-payment-handlers.md)
- [ADR 017 — SITE_BASE_URL mandatory for redirects](017-site-base-url-mandatory-for-redirects.md)
- [Mollie MCP server documentation](https://docs.mollie.com/docs/mollie-mcp-server)
- [Mollie pricing — SEPA Direct Debit](https://www.mollie.com/pricing)
