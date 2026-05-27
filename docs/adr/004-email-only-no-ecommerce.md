# ADR-004: Alcaca shop — email-only inquiry, no e-commerce checkout

**Date**: 2026-05-26
**Status**: Accepted

## Context

Alcaca is Alpacas Ibiza's wool/yarn product line. The redesign includes an Alcaca section. The live site has no online shop or cart. Competitors and Shopify norms would suggest a product catalogue + checkout.

Questions at design time: does the volume justify Stripe/Shopify integration? Is the logistics model (hand-spun, limited batches) compatible with async self-serve checkout?

## Options considered

| Option | Pros | Cons |
|---|---|---|
| Full e-commerce (Stripe / Shopify) | Self-serve, 24/7 sales | Inventory sync, VAT compliance, shipping rates, refund flows — large surface area for a cottage product |
| Email/WhatsApp inquiry form | Zero new infra; matches artisanal positioning | No cart, no immediate purchase confirmation; relies on manual follow-up |
| **Email-only with a clear CTA** | Matches live business model; reduces scope; no payment PCI surface | Same as above; may limit impulse purchases |

## Decision

**Email-only inquiry.** The Alcaca section shows products and drives to a contact form (or mailto CTA). No cart, no checkout, no payment processor.

Rationale: the live site operates this way; REALITY_CHECK confirms no e-commerce exists today; artisanal positioning (hand-spun, limited batches) is better served by a personal exchange than a cart abandonment funnel.

## Consequences

**Positive**
- Scope reduction: no Stripe keys, no inventory management, no VAT config.
- Consistent with live business model — no owner workflow change required.

**Negative / trade-offs**
- Lost impulse purchases. Visitors who want to buy now must wait for a reply.
- No order history, no automated receipts for Alcaca specifically.

## Revisit if

- Owner decides to scale Alcaca production and wants async ordering
- A third-party shop (Etsy, Faire) is chosen as the external destination — at that point the CTA links out rather than emailing in
