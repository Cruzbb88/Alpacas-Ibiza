# SOP-04 — Weekly FareHarbor → Stripe Migration Batch

**Version:** 1.0 — 2026-05-30
**Owner:** Farm owner
**Cadence:** Every Monday morning (suggest: first thing, before other admin)
**Duration:** Approximately 20–30 minutes per batch
**Tool:** `/admin/migration` page on the redesign site

---

## Purpose

Move your existing FareHarbor adopters onto Stripe at their natural renewal point — no forced switches, no double billing, minimal churn. You do this in small weekly batches so it stays manageable. The system generates personalised Stripe Checkout links; your job is to send them in a way that feels human.

---

## When to use

Every Monday. Run this until your FareHarbor adopter list is empty or until FareHarbor is fully wound down.

---

## Pre-requisites

- FareHarbor Dashboard login: [https://fareharbor.com/dashboard/](https://fareharbor.com/dashboard/)
- Access to the redesign site's `/admin/migration` page (you'll need your admin login)
- Your migration tracking spreadsheet (see Log Requirements — create this before your first batch if it doesn't exist)
- Your farm email address (to send the personal outreach emails)

---

## Steps

**Step 1 — Export from FareHarbor (Monday morning)**

1. Log into FareHarbor Dashboard.
2. Navigate to **Customers** in the left sidebar.
3. Filter by the "Adopt-a-Paca" product/activity (not day tours or other products).
4. Click **Export** (CSV). If the export button is greyed out, your FareHarbor plan may not include CSV exports — see Escalation.
5. In the export settings, select these fields:
   - Customer first name + last name
   - Email address
   - Adoption tier (monthly / annual)
   - Next renewal / next charge date
6. Save the file as `fareharbor-export-YYYY-MM-DD.csv` on your local machine. Do not upload it to cloud storage.

**Step 2 — Run the migration tool**

1. Open the redesign site and navigate to `/admin/migration`.
2. Paste the CSV content into the input field (or use the file upload if available).
3. Set the **lookahead** to **30 days** — this filters to only customers whose renewal is within the next 30 days. You only want to contact people when their renewal is approaching, not months in advance.
4. Click **Submit**.
5. The results table will appear — one row per customer within the 30-day window.

**Step 3 — Send the personal outreach emails**

For each row in the results table:

1. Copy the **Stripe Checkout URL** from the row.
2. Click the **pre-filled mailto link** — this opens a draft email in your email client with the customer's address and a pre-filled subject line.
3. **Customise the greeting** before sending. The template is a starting point — add the alpaca's name, their renewal date, and something personal if you know them. See the template below.
4. Send.
5. Mark the row in your migration tracking spreadsheet (date sent, customer name, outcome column left blank for now).

**Step 4 — Log in the migration tracking spreadsheet**

After sending all emails for the batch, update your spreadsheet. See Log Requirements for the column structure.

**Step 5 — Follow-up at T-7 days**

One week before each customer's FareHarbor renewal date, check your spreadsheet for anyone who hasn't responded. Send a single follow-up (template below). One follow-up only.

**Step 6 — Final follow-up at T-1 day**

The day before their FareHarbor renewal date, if still no response: send the final follow-up (template below). After this, accept the FareHarbor charge as their last one and record the outcome as "natural churn."

Do not chase further. Repeated outreach after T-1 day damages trust more than it converts.

---

## Templates

**Initial outreach email (send at T-30 days)**

> Subject: Your alpaca adoption is moving to a new home — here's your link
>
> Hi [First Name],
>
> I see your adoption of [Alpaca Name] is coming up for renewal on [date]. I'm moving our adoptions over to a new system that makes everything a little smoother — including easier access to updates from the farm.
>
> When you're ready, here's your personal link to continue the adoption: [Stripe Checkout URL]
>
> It takes about two minutes and your adoption carries on exactly as before. Your new billing date will be the same as today's renewal date.
>
> No rush — but if you have any questions, just reply here. I'm always happy to chat.
>
> With warm wishes,
> [Your name]

**Follow-up email (send at T-7 days)**

> Subject: Just a reminder — your alpaca link is still waiting
>
> Hi [First Name],
>
> Just a quick nudge in case my last email got buried! Your adoption of [Alpaca Name] renews on [date], and your link to continue via the new system is still here: [Stripe Checkout URL]
>
> If you've decided not to continue, no worries at all — just let me know and I'll make sure everything's wrapped up neatly.
>
> [Your name]

**Final follow-up email (send at T-1 day)**

> Subject: Last reminder — your adoption renews tomorrow
>
> Hi [First Name],
>
> Your [Alpaca Name] adoption renews through the old system tomorrow. If you'd like to switch to the new system before that happens, here's your link: [Stripe Checkout URL]
>
> If I don't hear from you, that's completely fine — your FareHarbor renewal will process as normal and I won't send any further reminders.
>
> Thank you for being part of the farm.
>
> [Your name]

---

## Edge cases

**Stripe Checkout link has expired (links expire after 14 days):** If a customer responds after the link has expired, go to `/admin/migration`, run a fresh export for just that customer, and generate a new link. Send it directly to them with an apology for the expired link.

**Annual adopter contacts you mid-year to switch early:** This is fine and encouraged. Run a single-row export or manually note their details, generate a Stripe link via `/admin/migration` (set lookahead high enough to include them), and send. Cancel their FareHarbor subscription manually after they complete Stripe checkout — do not wait for their renewal date.

**Customer has already migrated but appears in the export again:** FareHarbor sometimes shows a customer even after you've noted them as migrated. Check your tracking spreadsheet first before sending any outreach. If they're already on Stripe, skip the row.

**FareHarbor export button is greyed out:** Your account plan may not include CSV exports. Try the FareHarbor API if you have a key (see the FAREHARBOR_MIGRATION_PLAYBOOK.md for details). If neither works, contact FareHarbor support or contact your developer.

**No customers in the 30-day window:** This is fine — close the tool and come back next Monday. Do not extend the lookahead to fill the batch; contacting someone 60 days before their renewal is premature.

---

## Escalation

- `/admin/migration` page is unavailable or throwing errors → Contact your developer; do not attempt to manually recreate Stripe links.
- Stripe Checkout link takes the customer to an error page → Contact your developer before sending any more links that week.
- A migrated customer reports being charged by both FareHarbor and Stripe → This is a double-billing incident. Contact the customer immediately to apologise and arrange a refund. Then contact your developer and both platforms to determine what happened.

---

## Compliance touchpoints

- The FareHarbor CSV export contains personal data (name + email). Store it locally only, delete it at the end of each working week.
- Do not share the CSV with anyone who doesn't need it for the migration.
- Once a customer migrates, cancel their FareHarbor subscription manually to prevent double billing. Document the cancellation date in your tracking spreadsheet.

---

## Log requirements

Maintain a **migration tracking spreadsheet** — one row per customer contacted:

| Column | What to enter |
|---|---|
| Customer name | From FareHarbor export |
| Email | From FareHarbor export |
| Alpaca | Which alpaca they're adopting |
| Tier | Monthly / Annual |
| FareHarbor renewal date | From the export |
| First outreach sent | Date |
| T-7 follow-up sent | Date (or "skipped — responded") |
| T-1 follow-up sent | Date (or "skipped") |
| Customer response date | When they clicked and completed Stripe checkout |
| Outcome | Migrated / Natural churn / No response |
| FH subscription cancelled | Date you cancelled their FareHarbor sub |
| Notes | Anything unusual |

Add a new tab for each month. Archive completed tabs at year end.
