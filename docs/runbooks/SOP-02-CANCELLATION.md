# SOP-02 — Processing a Cancellation Request

**Version:** 1.0 — 2026-05-30
**Owner:** Farm owner (or designated staff cover)
**Trigger:** Owner notification email from `handleSubscriptionCanceled` — subject line includes "adoption cancelled"
**SLA:** Complete all steps within 48 hours of receiving the notification

---

## Purpose

Handle every cancellation with the same care as a new sign-up. How you respond to someone leaving shapes whether they ever come back — or recommend you to someone else.

---

## When to use

Any time a Stripe or Mollie subscription cancellation fires and you receive the owner notification. This covers both payment-failure cancellations and voluntary cancellations.

---

## Pre-requisites

- Access to your email inbox
- Stripe Dashboard login: [https://dashboard.stripe.com](https://dashboard.stripe.com)
- Mollie Dashboard login: [https://my.mollie.com](https://my.mollie.com)
- Your cancellation log spreadsheet (see Log Requirements — if this doesn't exist yet, create it before processing your first cancellation)
- The per-alpaca adopter spreadsheet (from SOP-01)

---

## Steps

**Step 1 — Read the reason banner in the notification email**

The notification email will contain one of three reason codes:

| Reason | What it means | Your next step |
|---|---|---|
| `payment_failed` | Their card or direct debit bounced | Go to Step 2A |
| `cancellation_requested` | They cancelled deliberately | Go to Step 2B |
| `other` | System-level or unknown cause | Go to Step 2C |

**Step 2A — Payment failure outreach**

1. Do not re-charge or retry the payment. The platform handles retries automatically before cancelling; by the time you see this notification, retries are exhausted.
2. Send a personal email within 48 hours (template below). The goal is to help them update their payment method — nothing more.
3. If they respond and update their payment method via the Stripe portal or Mollie link you send, the subscription resumes automatically. You do not need to manually reinstate anything.
4. If no response within 7 days: send one gentle follow-up, then accept the cancellation.

**Step 2B — Voluntary cancellation outreach**

1. Send the feedback request email (template below) within 48 hours.
2. Keep it short and warm — this is not a retention hard-sell, it's genuine curiosity about what they valued and what could be better.
3. If they give feedback: log it in the cancellation log, and if it's actionable, pass it to your developer.
4. If they change their mind and want to re-subscribe: direct them to the website sign-up flow. Do not manually reinstate or create a new subscription on their behalf via the dashboard.

**Step 2C — Unknown reason**

1. Check the Stripe or Mollie dashboard for the subscription record and look at the event history to understand what happened.
2. If it looks like a system error (e.g. webhook misfired): contact your developer before reaching out to the adopter.
3. If it looks like a genuine cancellation: treat as 2B.

**Step 3 — Remove from the physical farm board (within 7 days)**

- Remove or cross out their name on the board.
- If this is a gift adoption where both donor and recipient names are listed, remove both.
- Take a photo of the updated board.

**Step 4 — Update the per-alpaca adopter spreadsheet**

- Mark the adopter's row as "Cancelled" with today's date.
- Do not delete the row — GDPR retention rules apply (see Compliance below).

**Step 5 — Log in the cancellation log spreadsheet**

| Column | What to enter |
|---|---|
| Date | Today's date |
| Adopter name | From the notification |
| Email | From the notification |
| Alpaca | Which alpaca they were adopting |
| Platform | Stripe / Mollie |
| Reason code | payment_failed / cancellation_requested / other |
| Outreach sent | Yes / No + date |
| Response | What they said (or "no response") |
| Outcome | Re-subscribed / Churned / Pending |
| Notes | Anything unusual |

---

## Templates

**Email — payment failure**

> Subject: A quick note about your alpaca adoption
>
> Hi [First Name],
>
> I noticed your recent payment for [Alpaca Name]'s adoption didn't go through — these things happen! I just wanted to reach out personally rather than leave it to an automated message.
>
> If you'd like to continue the adoption, you can update your payment details here: [Stripe portal link or Mollie update link]
>
> No pressure at all — and if life's just got busy and now isn't the right time, that's completely fine too.
>
> Warm wishes,
> [Your name]

**Email — voluntary cancellation (feedback request)**

> Subject: Thank you for being part of the farm — one small ask
>
> Hi [First Name],
>
> I saw your adoption has ended — thank you so much for the time you spent supporting [Alpaca Name]. It genuinely means a lot to us.
>
> If you have a moment, I'd love to hear what you valued about the adoption, and honestly, what could have been better. Even a sentence or two helps me make it better for the next person.
>
> No obligation at all — and you're always welcome back whenever it feels right.
>
> With warm thanks,
> [Your name]

---

## Edge cases

**Stripe portal cancellation while a Mollie subscription is still active:** This can happen if a customer had both methods set up during a transition. Check both dashboards. If Mollie shows an active subscription, manually cancel it in the Mollie Dashboard (Customers → Subscriptions → Cancel). Do not leave parallel active subscriptions.

**Adopter disputes the charge:** Do not re-charge under any circumstances. Direct them to their bank's dispute process. Contact your developer and your payment provider's support team. Attempting to re-charge after a dispute triggers chargeback risk and potential account suspension.

**Adopter asks to pause rather than cancel:** Neither Stripe nor Mollie supports native pause in your current setup. Offer to cancel now and re-subscribe later at the same rate — make this explicit in your reply. Document the conversation.

---

## Escalation

- Unexpected cancellation volumes (more than 2 in a week) → Flag to your developer; could be a webhook or billing logic issue.
- Disputed charge or chargeback → Contact your payment provider immediately; do not handle alone.
- Mollie active subscription won't cancel via dashboard → Contact Mollie support.

---

## Compliance touchpoints

- **Never attempt to re-charge** after a cancellation. Both Stripe and Mollie prohibit this; attempting it is grounds for account termination and creates chargeback liability.
- **Cancellation is not erasure.** The adopter's data stays in your records for GDPR-legitimate retention (contract + tax purposes). They can still re-subscribe later using the same email. If they separately submit a GDPR erasure request, follow SOP-03.
- **GDPR retention:** Keep the cancellation log row for 7 years (UK/EU tax record requirement). Mark the adopter row as cancelled, but do not delete it.

---

## Log requirements

The cancellation log spreadsheet does not exist yet — **create it before your first cancellation.** Suggested tool: Google Sheets, stored in your farm's private Google account (not shared publicly). One tab per calendar year. The columns are listed in Step 5 above.
