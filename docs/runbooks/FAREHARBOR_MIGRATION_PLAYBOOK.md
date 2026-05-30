# Runbook: FareHarbor → Stripe/Mollie Customer Migration Playbook

**Scope:** Existing FareHarbor "Adopt-a-Paca" subscription customers  
**Destination:** Stripe Checkout (primary) / Mollie SEPA (deferred, per ADR-019)  
**Date drafted:** 2026-05-29  
**Sensitivity:** GDPR-relevant customer data; do not store exports in public cloud.

---

## Section 1 — Decision tree: choose your migration strategy

Three strategies exist. Each has real tradeoffs. **This runbook implements Strategy B** — read all three before confirming.

### Strategy A — Hard cutover

All FareHarbor adopters receive one email: "We're moving to Stripe. Please re-subscribe by [date X]. Your current adoption will lapse after that date."

**Pros:** Clean break, single source of truth from day one, no parallel system complexity.  
**Cons:** Industry comps for forced re-subscribe migrations show approximately 30% churn. For a small-operator alpaca farm, that could mean losing a third of your adoption income overnight.  
**When to choose A:** You have high confidence in adopter loyalty, or the FareHarbor plan cost exceeds the value of the migration window.

### Strategy B — Grandfather at renewal (RECOMMENDED for solo operator)

Existing adopters continue paying through FareHarbor until their individual renewal date. At renewal, they receive a one-click link to confirm their new Stripe payment method. FareHarbor is then cancelled for that customer only.

**Pros:** Low churn risk. Adopters feel no disruption. No double-billing if executed correctly. Migration completes naturally over the longest subscription cycle (up to 12 months for annual adopters).  
**Cons:** You operate two billing systems in parallel during the window. Requires discipline to track which customers have migrated and to cancel FareHarbor products after their last charge.  
**When to choose B:** You are a solo operator who cannot absorb 30% churn and who can maintain a simple spreadsheet tracker. This is the recommended path.

### Strategy C — Parallel-bill / anniversary switch

Both systems run simultaneously for up to 12 months. At each donor's exact anniversary the system auto-switches them.

**Pros:** Lowest customer friction, no action required from adopters until the switch happens invisibly.  
**Cons:** Requires automated logic to coordinate both APIs, detect FareHarbor charge events, generate per-customer Stripe links, suppress double charges, and handle failures. Highest engineering complexity. Two sources of billing truth is a compliance and reconciliation risk.  
**When to choose C:** You have engineering resource and a large enough adopter base that manual tracking (Strategy B) is not feasible.

---

## Section 2 — Data export from FareHarbor

### 2.1 Manual export (most accounts)

1. Log into your FareHarbor Dashboard at [https://fareharbor.com/dashboard/](https://fareharbor.com/dashboard/).
2. Navigate to **Customers** (left sidebar).
3. Filter by the "Adopt-a-Paca" product/activity. FareHarbor's customer list can be filtered by item/activity — select only the adoption product, not day-tour bookings.
4. Look for an **Export** button (CSV). If it is greyed out, your FareHarbor plan tier may not include exports — see the risk note in Section 6.
5. Select the following fields in the export (column names vary by FareHarbor version):
   - Customer name (first + last)
   - Email address
   - Adoption tier (monthly / annual)
   - Subscription start date
   - Next renewal / next charge date
   - Total amount paid to date
6. Save the CSV as `fareharbor-adopters-export-YYYY-MM-DD.csv` on your local machine.

> **GDPR note:** This file contains personal data (name + email). Do not upload it to Google Drive, Dropbox, or any shared/public cloud storage. Keep it on your encrypted local drive. Delete it when the migration is complete.

### 2.2 API export (if you have a FareHarbor API key)

If you have a FareHarbor API key (Dashboard → Settings → API), you can pull customer records programmatically:

```
GET https://fareharbor.com/api/external/v1/companies/{your-shortname}/customers.json
Authorization: apikey {your-api-key}
```

Filter the response for customers with the adoption activity ID. The audit as of 2026-05-29 shows no API key configured — pursue the manual CSV path first.

---

## Section 3 — Communication script

Send this email to each adopter approximately **30 days before their FareHarbor renewal date**. Edit for your voice — the tone below is a starting point, not verbatim copy.

---

**Subject:** Your alpaca adoption is moving to a new home — no action needed yet

Hi [First Name],

We've been busy behind the scenes building a brand-new home for Alpacas Ibiza, and that includes upgrading how we handle your wonderful alpaca adoption. Your new adopter dashboard will let you download your certificate any time, gift an adoption to a friend, and manage everything in one place.

Your current adoption is not changing. You'll keep receiving your quarterly updates and all the same perks right through your renewal on **[renewal date]**. There is nothing you need to do today.

Around **[renewal date]**, we'll send you a short one-click link to confirm your payment details on our new system. Same price — €75/month or €900/year — same alpacas, same commitment. It will take less than two minutes.

If anything changes for you in the meantime — if you'd like to pause, upgrade, or gift your adoption — just reply to this email and we'll sort it out personally.

Thank you for being part of the Alpacas Ibiza family.

Warm regards,  
[Owner name]  
Alpacas Ibiza

---

*Send from info@alpacasibiza.com (once DNS is configured per EMAIL_DNS_SETUP.md).*

---

## Section 4 — Anniversary trigger workflow

Execute these steps for each customer on or within **2 business days before** their FareHarbor renewal date. Work from your export spreadsheet — add a "Status" column and track each customer's migration state.

**Status values:** `pending` → `notified` → `stripe_link_sent` → `migrated` → `churned`

### Step-by-step for each customer

1. **FareHarbor charges as normal.** Do not touch FareHarbor on the renewal date. Let it process the charge. The customer is not double-billed at this stage because the Stripe subscription has not been created yet.

2. **Generate a per-customer Stripe Checkout link.** In the Stripe Dashboard (or via the Stripe CLI):
   - Go to **Payment Links** → **New** (or use an existing adoption checkout link).
   - Pre-fill `customer_email` with the adopter's email.
   - Set `client_reference_id` to the customer's original FareHarbor customer ID (from your export). This ties the new Stripe record back to the FareHarbor source of truth for audit purposes.
   - Use the correct price ID for their tier (monthly vs annual).
   - The link should land on the adoption confirmation page with their name pre-filled if possible.

3. **Send the migration email.** Use this template:

   > Subject: Your alpaca adoption has renewed — one last step to move to the new system
   >
   > Hi [First Name], your adoption renewed today as usual — thank you! To continue with our new system and get access to your certificate download and adopter dashboard, please confirm your payment details here: **[Stripe Checkout URL]**
   >
   > This is a one-time step. Same price, same perks. Takes under two minutes.
   >
   > If you have any questions, just reply.

4. **Cancel the FareHarbor product after the charge.** In FareHarbor, navigate to the customer record and set the adoption product to **"Cancel after current period"** (do not cancel immediately — let the charge stand). This ensures they are not billed again by FareHarbor at the next cycle.

5. **When Stripe Checkout completes,** the existing `handleStripeCheckoutCompleted` webhook handler fires and creates the adopter record in the new system. The customer receives the new welcome email and certificate. Mark them as `migrated` in your spreadsheet.

6. **Update your tracking spreadsheet.** Record the date of migration, the Stripe customer ID, and the original FareHarbor customer ID.

---

## Section 5 — Edge cases

| Situation | Response |
|-----------|----------|
| Customer ignores the migration email | Send one follow-up at **T-7 days** before the FareHarbor grace period ends. Subject: "Last chance — your alpaca adoption needs a quick update." If still no response after grace, the FareHarbor product cancels and the customer churns naturally. Do not badger beyond two emails. |
| Customer's email hard-bounces | Check the export for a phone number. If none, attempt contact via the farm's social media DM. Log the attempt in your spreadsheet. If unreachable after two contact attempts, let the FareHarbor product lapse. |
| Customer is a corporate sponsor | Do not run them through Stripe Checkout. Corporate sponsors likely need an invoice rather than a card-on-file subscription. Use **Stripe Invoicing** (Dashboard → Invoices → Create) to issue a formal invoice with net-30 terms. Handle separately from the main migration batch. |
| Customer requests GDPR erasure during migration | Process deletion on **both systems**: (1) Submit a deletion request to FareHarbor support for that customer's record. (2) Delete the customer from Stripe Dashboard → Customers → [customer] → Delete. (3) Remove their row from your local export CSV. Document the erasure with a date stamp in a separate `gdpr-erasure-log.csv` on your local machine. |
| Mollie SEPA adopter | SEPA Direct Debit mandates take up to 5 business days to clear after the customer authorises. Build a **5-day buffer** into the anniversary timing for Mollie adopters — send the migration link 7 days before the FareHarbor renewal, not 2, so the mandate is confirmed before the FareHarbor charge processes. |

---

## Section 6 — Risks

**Risk 1 — FareHarbor export gating by plan tier**  
FareHarbor does not guarantee customer-list CSV export on all plan tiers. Before committing to any migration timeline with adopters, log into FareHarbor → Customers and confirm the Export button is active and functional. If it is not available, contact FareHarbor support and request a data export — GDPR Article 20 (data portability) gives you the right to receive this data in a machine-readable format for EU-resident customers. Confirm export access before announcing any migration date.

**Risk 2 — Mollie SEPA mandate clearance delay**  
Mollie SEPA mandates require 5 business days from authorisation to first charge. If a customer authorises on day 0 but their FareHarbor renewal also processes on day 0, there is a window where neither system has successfully charged. Plan the migration email cadence to close this gap (see Section 5).

**Risk 3 — Adoption date vs migration date**  
Existing adopters have an original adoption start date in FareHarbor. The redesign's `handleStripeCheckoutCompleted` handler creates a new adopter record when the Stripe checkout completes. Ensure the handler does **not** overwrite the original adoption start date with the Stripe checkout completion date for migrating customers. The `client_reference_id` on the Checkout session carries the FareHarbor customer ID — use it to look up and preserve the original adoption date when inserting the new record. This matters for anniversary certificates and tenure recognition.

**Risk 4 — Double-billing window**  
The most likely double-billing scenario: owner generates a Stripe Checkout link, customer completes it immediately, and the FareHarbor product is not yet cancelled. FareHarbor then charges at the next cycle. Mitigate by: (a) marking each customer `stripe_link_sent` in the spreadsheet the moment the link is generated, (b) cancelling the FareHarbor product within 48 hours of confirming the Stripe checkout completed, and (c) checking the FareHarbor cancellation confirmation before the next FareHarbor billing cycle.

---

## Section 7 — Success criteria

The migration is complete and successful when all of the following are true:

| Criterion | Target |
|-----------|--------|
| FareHarbor adopters successfully re-enrolled in Stripe | 90% within 12 months of first migration email |
| Churn attributable to migration friction (as opposed to natural churn) | < 10% |
| Billing gaps (customer charged twice OR charged zero in any month) | Zero |
| FareHarbor plan decommissioned | By month 13 from first migration email |
| Local export CSV deleted from owner's machine (GDPR) | Within 30 days of full migration completion |
| All original adoption start dates preserved in the new system | 100% — verified by spot-checking 5 customer records at random |

Track progress in your spreadsheet monthly. If re-enrolment rate is below 80% at month 6, consider switching to Strategy A (hard cutover) for the remaining holdouts with a firm deadline.

---

## Appendix — Tracking spreadsheet column template

Create a local spreadsheet (`fareharbor-migration-tracker.xlsx`) with these columns:

| Column | Notes |
|--------|-------|
| FareHarbor customer ID | From export |
| First name | From export |
| Last name | From export |
| Email | From export |
| Tier | monthly / annual |
| Original adoption start date | From FareHarbor — preserve in Stripe |
| FareHarbor renewal date | The date FareHarbor will next charge |
| Status | pending / notified / stripe_link_sent / migrated / churned |
| Migration email sent date | |
| Follow-up email sent date | |
| Stripe Checkout URL | Generated per-customer |
| Stripe customer ID | After Checkout completes |
| FareHarbor cancelled date | Date you set "cancel after period" |
| Notes | Corporate, GDPR request, bounce, etc. |
