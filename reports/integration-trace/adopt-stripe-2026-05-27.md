# Adopt-a-Paca Stripe Subscription — End-to-End Trace
**Date:** 2026-05-27  
**Verdict:** CODE IS WIRED. STRIPE SDK NOT INSTALLED. Zero owner env vars set. Currently dead in production.

---

## Stripe SDK status

**NOT INSTALLED.** `package.json` has no `stripe` entry in dependencies or devDependencies. The routes use a dynamic import with a build-safe guard — the build succeeds and the site runs without it, but hitting `/api/checkout` or `/api/stripe-webhook` at runtime returns 503 `STRIPE_SDK_MISSING`. `npm install stripe` is a required owner-controlled deploy step documented in `OWNER_INPUT_NEEDED.md`.

---

## 12-Step Chain

| # | Step | Status | Notes |
|---|---|---|---|
| S1 | User clicks "Adopt now" on /adopt | WIRED | `page.tsx` calls `getPaymentAdapter().buildAdoptCheckoutUrl(tier)` for both monthly and yearly. Mailto fallback wired when env unset. |
| S2 | Adapter returns URL | WIRED | `stripeAdapter()` in `lib/payment-vendor.ts` returns `/api/checkout?tier=monthly\|yearly` when `STRIPE_SECRET_KEY` + price ID are set; returns `null` (→ mailto fallback) when unset. Guard is correct. |
| S3 | Browser navigates to /api/checkout | WIRED | Route handles both GET (href link from adopt page) and POST (future JS calls). Tier validated as `monthly\|yearly`, 400 on bad input. |
| S4 | /api/checkout dynamically imports Stripe SDK | PARTIAL | Dynamic import pattern is correct — webpackIgnore + turbopackIgnore pragmas, try/catch returns 503 `STRIPE_SDK_MISSING`. **Fails at runtime because `stripe` is not installed.** |
| S5 | Checkout Session created | WIRED | `mode: 'subscription'` for monthly, `mode: 'payment'` for yearly. `line_items`, `success_url`, `cancel_url`, `billing_address_collection: 'auto'`, metadata `{product, tier}` all set. SITE_BASE_URL used (not Origin header — open-redirect fix already applied per CLAUDE.md). |
| S6 | Browser redirects to Stripe hosted checkout | WIRED | GET returns `NextResponse.redirect(session.url, 303)`. POST returns `{url}`. Shape is correct. |
| S7 | User pays at Stripe | OUT OF SCOPE | Stripe-hosted page. |
| S8 | Stripe sends webhook to /api/stripe-webhook | WIRED | POST handler exists. Reads raw body via `request.text()` (required for signature verification). |
| S9 | Webhook signature verified | WIRED | Fail-closed 503 when `STRIPE_WEBHOOK_SECRET` unset. Separate 503 when `STRIPE_SECRET_KEY` unset. 400 on missing `stripe-signature` header. `stripe.webhooks.constructEvent()` with raw body + signature. |
| S10 | Event dispatch | WIRED | Switch handles: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`. Unhandled events log and return 200. Dispatch errors return 500 (triggers Stripe retry). |
| S11 | Confirmation email sent | WIRED (with gap) | `checkout.session.completed` calls `sendEmail()` via Resend with `welcomeAdoptionEmailHtml`. Fail-quiet (try/catch) so Stripe doesn't retry-spam on email failure. Missing email logs warn and skips send. **Gap: discount codes promised in the email ("we'll send your codes in a separate email") are never actually sent — no follow-up email triggered.** |
| S12 | User lands on success page | MISSING | `success_url` is `/{locale}/adopt?checkout=success&tier={tier}`. The adopt `page.tsx` does NOT read `searchParams`. There is no success confirmation UI, no "thank you" banner, no order summary shown. User returns to the plain adopt page with no feedback. |

**WIRED: 9 / PARTIAL: 1 / MISSING: 1**  
(S4 is PARTIAL because the code path is correct but the SDK is absent. S12 is MISSING — no success state rendered.)

---

## Benefit Fulfillment Gap Analysis

The welcome email (`lib/email-templates.ts`) lists all 7 benefits. What happens after the email sends:

| Benefit | Email promises | Code fulfillment | Verdict |
|---|---|---|---|
| Personalised adoption certificate | "we'll post within 7-10 days" | No PDF generation, no automated dispatch. Manual ops. | MANUAL OPS ONLY |
| 6 farm tours/year (up to 4 guests) | "bookable any time — mention you're an adopter when you book" | No subscriber lookup, no FareHarbor coupon/access granted. Honour system. | MANUAL OPS ONLY |
| Welcome gift bundle (calendar, planner, keychain, framed photo) | "ships within 2-3 weeks" | No fulfillment integration, no address collection at checkout. Stripe Checkout collects billing address (not shipping). | ADDRESS GAP + MANUAL OPS |
| Professional photoshoot | "we'll be in touch" | No booking trigger, no calendar link. Manual outreach. | MANUAL OPS ONLY |
| 5 kg Alcaca fibre | "ships seasonally, we'll email you" | No seasonal trigger, no email scheduled. Manual ops. | MANUAL OPS ONLY |
| 10% off Weaving / 15% off shop | "we'll send your codes in a separate email" | No code generation, no follow-up email triggered anywhere in the codebase. | CODE NEVER SENT — BROKEN PROMISE |
| Alpaca assignment | Not in welcome email | Not built, not referenced in code. OWNER_CONFIRM items in adopt page. | NOT BUILT |

**Summary:** The welcome email is sent. All 7 benefits after that are manual ops or outright missing. The discount codes are the worst gap — the email explicitly promises a follow-up that the code never sends.

---

## Customer Portal (cancel/update billing)

**NOT BUILT.** There is no `/api/billing-portal` route in `app/api/`. The `app/api/` directory contains: analytics, auth, availability, checkout, commission, contact, fareharbor-webhook, google-reviews, health, mollie-checkout, mollie-webhook, newsletter, owner-digest, reminder, review-request, stripe-webhook. No billing portal, no cancel endpoint, no subscription management. 

A Stripe subscriber who wants to cancel or update their card has no self-serve path — they must email the owner directly.

---

## Env Vars Required (none currently set)

To activate Stripe end-to-end, owner must set ALL of these:

```
PAYMENT_VENDOR=stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_ADOPT_PRICE_ID_MONTHLY=price_xxx   # recurring, €75/mo
STRIPE_ADOPT_PRICE_ID_YEARLY=price_xxx    # one-time, €900
```

Plus run `npm install stripe` (or `pnpm add stripe`) on deploy.

---

## What Cannot Be Verified From Static Code

- Whether any Stripe account exists for this business
- Whether price IDs have been created in Stripe dashboard
- Whether the webhook endpoint URL has been registered in the Stripe dashboard
- Whether Stripe Tax is needed for EU VAT (currently `automatic_tax: {enabled: false}`)
- Whether the owner's Resend domain is verified (welcome email from `noreply@alpacasibiza.com` will land in spam or bounce without DKIM/SPF)
- Whether the Stripe account is in test mode or live mode

---

## Verdict

**Have Stripe and the alpaca subscription been applied?**

The plumbing is built. The checkout route, webhook route, adapter, email template, and event handlers are all correctly coded. But:

1. `stripe` SDK is not installed — every request to `/api/checkout` returns 503 today
2. Zero env vars are set — even with the SDK installed, all routes fail closed
3. The success page is missing — users get no confirmation after paying
4. Discount codes are never sent — promised in the welcome email, never triggered
5. All physical fulfillment is manual with no address collection and no automation
6. No customer portal — no self-serve cancel or billing management

The code says "yes we did the work." The deployment says "none of this runs yet." Cruz cannot tell customers to adopt until at minimum: SDK installed, env vars set, Stripe prices created, webhook registered, and the success page built.
