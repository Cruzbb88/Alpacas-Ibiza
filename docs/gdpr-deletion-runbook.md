# GDPR Article 17 deletion runbook

Article 17 ("Right to erasure"): a controller has **1 month** from receipt
of a verified deletion request to delete the donor's data from every system
that holds it, OR provide a documented reason for refusal.

This runbook lists every system to check + the exact steps to delete from
each. Use it every time `/api/gdpr-request` fires an owner email with a
"DELETION" subject.

When a donor count > 200 OR a deletion is missed past 30 days, migrate to
automated SDK-driven deletion (growth-tracker #5). Until then, manual.

---

## 0 — Verify the request first

Before deleting anything, confirm the request is genuine. The donor
emailed a request through the GDPR form — that's a starting point, NOT
proof of identity.

- Reply to the donor email asking them to confirm the deletion from the
  address that placed the payment.
- Wait for their reply confirming. Save the reply.
- If they don't reply within 14 days → log as "unfulfilled — donor did
  not confirm." File in `docs/gdpr-deletion-log.md` (create on first use).

This step protects against malicious deletion requests sent in someone
else's name.

---

## 1 — Mollie

The GDPR-request route auto-discovers the Mollie `cst_*` customer ID for
the requesting email (see `app/api/gdpr-request/route.ts` "Mollie
customer found:" line in the owner email).

Steps:
1. Log in to <https://my.mollie.com>
2. Customers → search by `cst_*` ID from the owner email
3. Click into the customer
4. Cancel any active subscriptions (Subscriptions tab → Cancel)
5. Profile → "Delete customer"
6. Mollie cascades: customer, subscriptions, mandates, payment metadata.
   Past payment events stay (legally retained for tax records).

If no `cst_*` was found, the donor likely never paid via Mollie. Skip.

---

## 2 — Stripe

If the donor adopted before the Mollie migration OR via a Stripe-direct
flow:

1. Log in to <https://dashboard.stripe.com>
2. Customers → search by email
3. Click the customer
4. ⋯ menu → "Delete customer"
5. Stripe cascades: customer, subscriptions, payment methods. Past charges
   stay (tax-retention exemption).

If no customer matches → skip.

---

## 3 — Resend

Resend stores recipient email + send history.

1. Log in to <https://resend.com>
2. Audiences → search by email
3. Remove from all audiences
4. Email log: search by recipient → cannot bulk-delete log entries via
   UI. Open a support ticket: `support@resend.com` referencing the
   donor's email + request ID; cite GDPR Article 17.
5. Add their email to the in-app suppression list at
   `/admin/suppressions` via "Suppress manually" → reason "manual" so
   future sends are blocked even if they ever re-enter our system.

---

## 4 — FareHarbor

If the donor ever booked a tour:

1. Log in to <https://fareharbor.com/alpacasibiza/dashboard>
2. Bookings → search by email
3. Each booking → ⋯ → "Anonymize guest"
4. For full deletion: open a support ticket via FH dashboard support
   widget. They handle EU GDPR requests within ~5 business days.

If no bookings, skip.

---

## 5 — Google Analytics

GA4 stores hashed user IDs. We don't send raw donor PII (per the GA4
event catalog — only locale, tier, slug). But the donor's IP+browser
fingerprint is hashed and retained.

1. Log in to <https://analytics.google.com>
2. Admin → Data Settings → Data Deletion Requests
3. Create deletion request for the time range covering the donor's
   sessions (provide their estimated sign-up date — they may have
   recorded this in their original donation receipt)
4. Submit — Google honors within 72 hours

---

## 6 — In-app trackers (process-scoped — ADR 001)

These reset on every Vercel restart, so unless a restart happened mid-
process the donor's data may still be in memory:

| Store | What it holds | Action |
|---|---|---|
| `lib/payment-failure-tracker.ts` | Recent failure counts keyed by customerId | `resetFailures('mollie', cst_id)` via a one-off invocation from the admin console OR wait for next deploy/restart (TTL 30d anyway) |
| `lib/webhook-idempotency.ts` | Processed webhook event keys | TTL 4d — no PII directly, but contains customer IDs in keys. Wait for natural expiry. |
| `lib/vat-tracker.ts` | EU OSS sales tally by COUNTRY (no PII) | No action — country-keyed, not customer-keyed |
| `lib/email-suppression.ts` | Suppressed bounce emails | Leave the entry — it's a feature, not data leakage |
| `lib/quarterly-content-store.ts` | Farm news (not PII) | No action |

If we have launched Postgres (DATABASE_URL is set), additionally:

```sql
-- Soft-delete the customer row (we keep the row for FK integrity but
-- clear all PII fields). The schema's deleted_at column triggers this.
UPDATE customers SET deleted_at = NOW(), email = NULL, name = NULL
  WHERE vendor = 'mollie' AND vendor_customer_id = '<cst_id>';

-- Cascade to subscriptions (no PII on subscriptions themselves but
-- mark deleted for completeness).
UPDATE subscriptions SET canceled_at = NOW()
  WHERE customer_id = '<vendor>_<cst_id>' AND canceled_at IS NULL;

-- Payment events retain payload_json which may contain donor email.
-- GDPR + tax law conflict here: payment events are retained for tax
-- audit (7 years, EU OSS). Anonymize the payload field instead of
-- deleting the row:
UPDATE payment_events SET payload_json = '{"redacted":"gdpr-erasure"}'
  WHERE customer_id = '<vendor>_<cst_id>';
```

When this happens, fire a sanity check:
```sql
SELECT COUNT(*) FROM customers WHERE email = '<donor-email>';
-- Expect: 0
```

---

## 7 — Logs

Vercel Function Logs retain ~30 days. We already mask PII via
`lib/log-pii.ts` (email → first-4-chars, customer IDs → masked), but
the masked first 4 chars + domain can sometimes identify an individual.

1. Vercel dashboard → Functions → Logs
2. Search by request ID (from the original GDPR request email)
3. Export the matching log lines as a CSV for your records
4. Vercel has no programmatic delete — wait for the 30-day natural
   expiration. The lookback window from request date is the legal window
   we're operating under.

Mention this 30-day window in the response to the donor: "Logs older
than 30 days are not retained; logs from your request will be purged
automatically within X days."

---

## 8 — Backups

If we ever run pg_dump backups of the Postgres DB, those backups will
contain the donor's data even after we soft-delete from the live DB.

Today: no backups. When backups start: document them here + add a
backup-rotation policy that includes GDPR-erasure rolling.

---

## 9 — Confirm + log

After steps 1-8:

1. Reply to the donor: "We've deleted your data from every system that
   holds it. Logs older than 30 days are not retained; logs from your
   request will be auto-purged within ~30 days from request date. Email
   us back if you need anything else."
2. Append an entry to `docs/gdpr-deletion-log.md` (create on first use):
   ```
   - 2026-MM-DD — donor request ID req_xxx — Mollie cst_xxx deleted,
     Stripe N/A, Resend audiences cleared + suppression added, FH
     anonymized 3 bookings, GA4 deletion request submitted, in-app
     trackers reset, logs noted for natural expiry by 2026-MM-DD.
   ```

The log is the audit trail an EU DPA inspector would ask for.

---

## When to migrate from manual to automated

This runbook is fine for under-200-donors scale. Migrate when ANY of:

- A deletion request is missed past the 30-day window
- Donor count > 200 — manual time per request × volume becomes unworkable
- A second person joins the team and the runbook becomes hard to keep
  in sync across operators

When migrating: the work to do is in growth-tracker #5 (Article 17
automation). High level:
1. Wire SDK calls to Mollie `customers.delete()` and Stripe
   `customers.del()` into `/api/gdpr-request`
2. Wire programmatic Resend audience removal via Resend API
3. Wire in-app tracker reset
4. Keep this runbook as a fallback for the systems that have no
   programmatic delete (FareHarbor, GA4, Vercel logs)
