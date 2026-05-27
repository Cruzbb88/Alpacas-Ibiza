# SaaS Framework — Phase 5: Billing + Onboarding
**Version:** 0.1 | **Date:** 2026-05-27 | **Applies to:** Cruz (platform operator) billing tenants
**Reconnaissance base:** INTEGRATION_STATUS_2026-04-20.md, ADR-004, ADR-011, OWNER_INPUT_NEEDED.md (Adopt-a-Paca), lib/config.ts, REALITY_CHECK.md Tier 3, specs/saas-framework/001-requirements.md §4 pricing

> **Scope clarification.** This spec covers Cruz → tenant money (platform billing). The separate tenant → guest money channel (FareHarbor, Stripe for e-commerce, etc.) is Phase 3's `PaymentProvider` interface. Do not conflate them.

---

## 1. Platform Billing Model

Three structures evaluated with revenue projections at realistic agritourism booking volumes. REALITY_CHECK.md Tier 3 cites Bokun Starter ~€49/mo + 1.5% commission, Squarespace Business ~€23/mo, FareHarbor free-to-operator model. Phase 1 requirements §4 anchors: €29 / €79 / €199 tiers.

**Assumed booking volume per small agritourism tenant:** 200–600 bookings/yr (Peek Pro estimates <500/yr for sub-€100k operators; Bokun's SMB cohort averages ~400/yr). Average booking value €30–80.

### Option A — Flat monthly per tenant

| Tier | Price/mo | 10 tenants | 100 tenants | 1000 tenants |
|---|---|---|---|---|
| Starter | €39 | €390 | €3,900 | €39,000 |
| Pro | €99 | €990 | €9,900 | €99,000 |
| Studio | €249 | €2,490 | €24,900 | €249,000 |
| **Blended (60% Pro)** | ~€109 | **€1,090** | **€10,900** | **€109,000** |

Pros: predictable, Cruz-side reconciliation is trivial, no booking-volume tracking infra needed.
Cons: Cruz has no upside when a tenant's bookings double; tenant at 20 bookings/yr and tenant at 600/yr pay the same.

### Option B — Per-booking commission (2% of every booked €)

| Avg bookings/yr | Avg value | Annual spend/tenant | Commission (2%) | 10 tenants | 100 tenants | 1000 tenants |
|---|---|---|---|---|---|---|
| 300 | €50 | €15,000 | €300/yr = €25/mo | €250 | €2,500 | €25,000 |
| 500 | €65 | €32,500 | €650/yr = €54/mo | €540 | €5,400 | €54,000 |

Pros: Cruz earns more as tenants grow.
Cons: requires Stripe Connect (per-tenant payment flow), FareHarbor TOS risk (FH already takes a booking fee from guests — stacking a platform fee is legally and contractually fraught), booking data must flow to Cruz for billing — significant compliance and privacy surface.

### Option C — Hybrid: low monthly + per-booking (€19/mo + 1% of bookings)

| Scenario | Monthly base | Avg commission | Total/mo/tenant | 10 tenants | 100 tenants | 1000 tenants |
|---|---|---|---|---|---|---|
| Light (200 bookings, €40 avg) | €19 | €7 | €26 | €260 | €2,600 | €26,000 |
| Mid (400 bookings, €55 avg) | €19 | €18 | €37 | €370 | €3,700 | €37,000 |
| Heavy (600 bookings, €70 avg) | €19 | €35 | €54 | €540 | €5,400 | €54,000 |

Pros: lower entry barrier, Cruz earns more from successful tenants.
Cons: same Stripe Connect complexity and FareHarbor TOS risk as Option B.

**Recommendation: Option A (flat monthly).** Revenue at 100 tenants is competitive with Options B/C at realistic booking volumes, with zero booking-data pipeline complexity. Phase 1 pricing from 001-requirements.md §4 (€39/€99/€249) stands. Revisit hybrid after 50 tenants if top-performing tenants represent disproportionate platform costs.

---

## 2. Stripe Connect vs. Direct Stripe vs. Invoicing

Peer usage:
- **Direct Stripe:** Squarespace, Ghost, Webflow — all charge tenants via Stripe Billing with a single Stripe account. No per-tenant connected accounts. Works for flat monthly. [stripe.com/docs/billing/subscriptions](https://stripe.com/docs/billing/subscriptions)
- **Stripe Connect:** Shopify, Marketplacer, Teachable — each tenant has a connected account so the platform can take a cut of transactions. Required for per-booking commission. [stripe.com/docs/connect](https://stripe.com/docs/connect)
- **Manual invoicing:** works for 0–10 tenants, does not scale, creates reconciliation debt.
- **Lemon Squeezy / Paddle (merchant of record):** handles EU VAT/GST automatically. Lemon Squeezy charges 5% + $0.50/transaction on top of their payment processing. Paddle charges 5%+$0.50 for digital products. Relevant only if Cruz sells internationally into VAT-applicable jurisdictions.

**Recommendation: Direct Stripe + Stripe Billing (subscriptions API).**

Rationale: flat monthly model (Option A) maps perfectly to `stripe.com/docs/billing`. Cruz has one Stripe account, one product per tier, webhook events drive the billing state machine (§5). Stripe Billing handles dunning (retry failed payments), proration on tier upgrades, customer portal (tenants can update cards without contacting Cruz). No per-tenant connected accounts needed. Cruz is EU-based — Stripe Tax add-on handles VAT if needed (~$0.50 per transaction calculated, or ~$30/mo for automated filing depending on volume).

Lemon Squeezy is attractive if VAT compliance burden is high and volume is low; revisit at 50+ tenants if Stripe Tax friction is real.

---

## 3. Tenant Onboarding Flow

| Step | What happens | Automated vs manual | Vercel involvement |
|---|---|---|---|
| 1. Marketing site + signup | Tenant fills email + business name + tier selection on framework marketing page | Automated: Stripe Checkout creates subscription + customer record | None |
| 2. Trial (14 days, card required) | Tenant gets 14-day trial period; card held but not charged until day 15. Stripe `trial_end` webhook triggers billing. Card-required-up-front reduces no-intent signups; Peek Pro and Bokun both require card for trials. | Automated via Stripe Billing `trial_period_days: 14` | None |
| 3. Initial config wizard | Tenant enters: slug (URL subdomain), business name, brand colors (primary hex), contact email, FareHarbor shortname (optional — can skip). Saved as `TenantConfig` DB row. | Automated wizard UI. Cruz-manual fallback for first 10 tenants (email Cruz the config, Cruz creates the row). | None yet |
| 4. First-content step | Tenant adds 1 experience (title, description, price) OR 1 animal profile OR 1 product. Purpose: confirm the content shape works for their business before going live. | Automated in-app form. Blocks the "go live" button until complete. | None |
| 5. Custom domain | Tenant inputs `tours.theirfarm.com`. Framework shows CNAME record to paste at registrar. Vercel programmatic domain add via Vercel API. | Cruz-manual API call at first (Vercel API: `POST /v10/projects/{id}/domains`). Automate once >10 tenants/mo. | **Vercel API call:** add domain to shared project OR provision new Vercel project per tenant. |
| 6. Live flip | Tenant clicks "Go Live." Billing state transitions to `active`. Site resolves at their domain. | Automated state transition. | If shared-deploy model: no new Vercel project — tenant routing at Next.js middleware level. If per-project model: trigger Vercel deploy via webhook. |

**Vercel architecture choice:** shared deploy (one Vercel project, tenant resolved at runtime via middleware hostname matching) vs. per-project deploy (one Vercel project per tenant, separate env vars).

- Shared deploy: simpler to operate, tenant isolation via middleware + DB row, single deploy to update all tenants. Downside: one bad deploy hits all tenants.
- Per-project: maximum isolation, per-tenant env vars native, Vercel free tier allows many projects. Downside: deploy automation needed, 1000 tenants = 1000 projects, Vercel Team plan required at scale (~$20/mo for team + $20/mo per additional seat).

**Recommendation: shared deploy for Phase 1 (< 50 tenants).** Middleware-based hostname routing is the same pattern used in ADR-011's upgrade path — the in-memory→KV pattern applies here too. Migrate to per-project at scale if isolation incidents occur.

---

## 4. Per-Tenant Secret Storage

Tenants need their own: `RESEND_API_KEY`, `FAREHARBOR_APP_KEY`, `FAREHARBOR_USER_KEY`, `FAREHARBOR_WEBHOOK_SECRET`, `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, optionally `GA4_*` and `GOOGLE_PLACES_*`.

Options:

| Option | Cost at 10 tenants | Cost at 100 tenants | Cost at 1000 tenants | Complexity |
|---|---|---|---|---|
| **Vercel env vars with slug prefix** (`RESEND_API_KEY_ESCURRALS`) | $0 (Vercel free/pro) | $0 | Breaks — Vercel has no per-env var per-tenant concept; hits env var count limits (~4000 vars max) | Low now, breaks at scale |
| **Encrypted column in tenant DB** (AES-256-GCM, KEK = single master env var) | $0 (DB cost already paid) | $0 | $0 | Medium — requires KMS-style KEK rotation plan |
| **Doppler** | $0 (free up to 5 projects) | ~$18/mo (Team plan, unlimited projects) | ~$18/mo (same, unlimited) | Low — UI + CLI, good DX |
| **Infisical** (open source, self-host or cloud) | $0 self-hosted | $0 self-hosted | ~$80/mo cloud (Pro) | Medium — self-host adds ops burden |
| **HashiCorp Vault / AWS Secrets Manager** | $0.40/10K API calls (AWS) | ~$5/mo | ~$50/mo | High — overkill for Phase 1 |

**Recommendation: Encrypted column in tenant DB.**

Rationale: ADR-011 established the principle of deferring external infra until volume justifies. A single `secrets` JSONB column on the `tenants` table, AES-256-GCM encrypted with a master KEK stored as a single Vercel env var (`TENANT_SECRETS_KEK`), costs $0 at all scales and keeps data in one place. The KEK rotation story is one env var update + re-encrypt job. Doppler is attractive at 100+ tenants when secret sprawl becomes real — add it then and point the encrypted column's decrypt operation at Doppler's SDK instead.

Implementation: `lib/tenant-secrets.ts` — `encryptSecret(plaintext, kek)` / `decryptSecret(ciphertext, kek)` using Node.js `crypto.createCipheriv('aes-256-gcm', ...)`. Never log decrypted values. Treat KEK as Tier 1 env (site breaks if unset).

---

## 5. Billing State Machine

```
trial ──(trial_end, payment succeeds)──► active
trial ──(trial_end, payment fails)──► past_due
active ──(invoice.payment_failed)──► past_due
past_due ──(invoice.payment_succeeded within grace)──► active
past_due ──(grace period expires)──► cancelled
active ──(customer cancels)──► cancelled
cancelled ──(reactivates, pays)──► active  [= reactivated sub-state]
```

**State transitions + triggers:**

| Transition | Stripe webhook event | Manual trigger | Action |
|---|---|---|---|
| trial → active | `customer.subscription.updated` (`status: active`) | n/a | Set `tenant.status = 'active'`, send welcome email |
| trial → past_due | `invoice.payment_failed` at trial end | n/a | Set `past_due`, send payment failure email, start grace timer |
| active → past_due | `invoice.payment_failed` | n/a | Same as above |
| past_due → active | `invoice.payment_succeeded` | Admin UI override | Clear grace timer, restore full access |
| past_due → cancelled | Grace period cron (day 14) | Admin UI | Set `cancelled`, send offboarding email, begin data retention window |
| any → cancelled | `customer.subscription.deleted` | Admin UI | Immediate cancellation |
| cancelled → active | New subscription created | n/a | Restore from retained data if within retention window |

**Feature gating by state:**

| State | Site live | Admin dashboard | Email forms | Content editable | Data accessible |
|---|---|---|---|---|---|
| trial | Yes | Yes | Yes | Yes | Yes |
| active | Yes | Yes | Yes | Yes | Yes |
| past_due | Yes (grace) | Read-only | Yes | Read-only | Yes |
| cancelled | No (redirect) | Read-only | No | No | Yes (90 days) |

**Grace period:** 14 days past_due before cancellation. Aligns with Stripe's default dunning retry schedule (day 1, 5, 10, 14). After 14 days with no payment, auto-cancel.

**Data retention:** 90 days post-cancellation. Tenant data is not deleted — it is flagged `soft_deleted_at`. After 90 days, a scheduled job hard-deletes. Reactivation within 90 days restores everything. After 90 days, tenant starts fresh.

---

## 6. FareHarbor Relationship

Three options:

**A — Replace FareHarbor entirely (native booking engine)**
Build availability calendar, booking flow, payment processing, confirmation emails, reminders, refunds, operator payout all within the framework.
Scope: 6–12 months of engineering, PCI-DSS level 4 compliance requirements, operator payout legal structure (escrow, money transmitter license potentially required depending on jurisdiction).
Revenue upside: Cruz keeps the FareHarbor guest booking fee (~6% of each booking value).
Risk: re-inventing a mature product, FareHarbor is free to operators so tenants have no incentive to switch their existing FH setup.

**B — Layer commission on top of FareHarbor**
Keep FareHarbor as booking engine, Cruz takes a % on top via Stripe Connect intercepting guest payments.
Legal risk: FareHarbor TOS almost certainly prohibits undisclosed third-party fees on guest transactions. This is the highest-regret option — a TOS violation discovered post-launch would require emergency teardown.

**C — Optional FareHarbor passthrough + native fallback**
Default: FareHarbor embed (tenant supplies their own shortname + item IDs, Cruz never holds FH creds — this is already the pattern in `lib/config.ts` and established in 001-requirements.md R1 mitigation). Native booking: Cruz builds a lightweight native booking form (name, date picker, headcount, Stripe payment link) as the fallback for tenants without FareHarbor. Native is not a replacement — it's a "good enough" step-zero for new operators.

**Recommendation: Option C.**

Phase 1 FareHarbor passthrough is already implemented (tenant supplies shortname). The native fallback reduces onboarding friction for tenants who haven't yet set up FareHarbor. Native booking scope for v1: static date picker + Stripe Payment Link redirect (not a full booking engine — no availability management, no operator dashboard). That's a 2–3 week build, not 6–12 months. Cruz's comment "make more money" is best served by growing tenant count (more flat monthly subscriptions) rather than taking a per-booking cut that risks FH TOS issues.

**First-100-days plan:**
- Days 1–14: ship with FareHarbor passthrough only. Onboard first 5 tenants manually.
- Days 15–45: build native "simple booking" (Stripe Payment Link + confirmation email) as the fallback for non-FH tenants.
- Days 46–100: connect FareHarbor partner program inquiry, understand if reseller/partner agreement is available. If yes, negotiate. If no, native booking remains the alternative path — tenants migrate off FH voluntarily if native is good enough.

---

## 7. Risks — Probability Storm

| Decision | Regret probability (1=low, 10=high) | Reversibility (1=hard, 10=easy) | Time to blocking (months) | Notes |
|---|---|---|---|---|
| Flat monthly (Option A) | 3 | 9 | 18+ | Easy to layer hybrid later once booking data flows |
| Direct Stripe (not Connect) | 2 | 8 | 12 | Stripe Connect can be added alongside; not either-or |
| Shared Vercel deploy | 5 | 6 | 6 | Isolation incident at tenant 30 forces migration; manageable |
| Encrypted DB column for secrets | 3 | 7 | 12 | KEK rotation is the hard part; plan it before tenant 20 |
| FareHarbor passthrough (Option C) | 2 | 9 | N/A | Cruz never holds FH creds = no TOS exposure |
| Native booking v1 as Stripe Payment Link | 4 | 9 | 3 | Low regret — upgrade to full booking engine if volume justifies |
| 14-day grace period | 3 | 9 | 6 | Can change in Stripe Billing config any time |
| Card-required trial | 4 | 9 | 3 | Higher conversion friction but lower churn risk |

**Highest-regret decision in the matrix:** layering a commission on FareHarbor transactions (Option B above) — not included in recommendations but rated: regret 9, reversibility 2, time to blocking 1 month. Avoid.

---

## 8. Phase 5 GO Conditions

**Cruz must decide before implementation:**

| Decision | Options | Default if Cruz doesn't decide |
|---|---|---|
| Platform billing model | A (flat), B (per-booking), C (hybrid) | A (flat — already in 001-requirements.md §4) |
| Payment provider | Direct Stripe / Lemon Squeezy / manual | Direct Stripe |
| Per-tenant secret storage | Encrypted DB column / Doppler / Vercel env prefix | Encrypted DB column |
| FareHarbor relationship | Passthrough / replace / hybrid (Option C) | Option C passthrough + native fallback |
| Trial structure | 14-day card-required / 30-day no-card / no trial | 14-day card-required |

**Reversible — can ship without GO (placeholder values, no production keys):**
- Billing state machine interface (`lib/billing-state.ts`) — types + stub transitions
- Stripe SDK install (`npm install stripe`) + webhook handler stub (`/api/stripe-webhook`) with `STRIPE_WEBHOOK_SECRET` as Tier 1 env
- `TenantStatus` enum + DB column migration
- `lib/tenant-secrets.ts` encrypt/decrypt scaffolding (KEK can be a dummy in dev)

**Irreversible — requires GO before touching:**
- Real Stripe account onboarding (legal entity, bank account, tax info)
- First paying tenant (triggers real billing relationship)
- FareHarbor partner program inquiry (sets expectations with FH)
- Custom domain provisioning automation (Vercel API integration commits to shared-vs-per-project architecture)
