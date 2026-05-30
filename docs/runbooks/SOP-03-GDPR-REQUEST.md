# SOP-03 — Responding to a GDPR Access or Erasure Request

**Version:** 1.0 — 2026-05-30
**Owner:** Farm owner
**Trigger:** Email notification from `/api/gdpr-request` — subject line "GDPR request received"
**Legal deadline:** 30 calendar days from receipt (extendable to 90 days for complex requests — see Edge Cases)

---

## Purpose

Anyone whose data you hold has the legal right to ask what you have (Article 15 access request) or to have it deleted (Article 17 erasure request). This SOP walks you through both. The steps are not complicated — the key is being methodical and documenting everything.

---

## When to use

Any time the `/api/gdpr-request` form fires and you receive an owner notification, or any time someone emails you directly asking "what data do you hold about me" or "please delete my data."

---

## Pre-requisites

- Access to your email inbox
- Stripe Dashboard login
- Mollie Dashboard login
- Resend Dashboard login (your transactional email provider)
- FareHarbor Dashboard login (legacy — needed until all customers have migrated)
- Your GDPR log spreadsheet (see Log Requirements)
- A secure way to send the response (email is fine; do not attach data to a public link)

---

## Steps

### Part A — Both request types

**Step 1 — Verify the requester's identity (within 3 days of receipt)**

You cannot respond to a GDPR request from an unverified person — someone could try to pull another person's data.

1. Check that the email address in the request matches an email address in your adopter records.
2. Send a short verification reply asking them to confirm: (a) the email address on their account, and (b) one other piece of identifying information — for example, the name on their adoption, or the approximate date they signed up.
3. Do not proceed until they confirm. The 30-day clock starts from the original request date, not from when they verify — so don't let verification drag on. Chase after 5 days if no reply.

**Step 2 — Gather data from every processor**

Work through each system in order. Take screenshots or export CSVs as you go.

| System | Where to look | What to export |
|---|---|---|
| **Stripe** | Dashboard → Customers → search by email | Customer record, subscriptions, payment history, invoices |
| **Mollie** | Dashboard → Customers → search by email | Customer record, subscriptions, payment history |
| **Resend** | Dashboard → Logs → filter by email address | List of emails sent (subject + date; not the full body unless needed) |
| **FareHarbor** (legacy) | Dashboard → Customers → search by email | Customer record, booking history |
| **Local files** | Check `lib/data/` in the codebase — testimonials, any hardcoded references | Any text referencing this person by name |

**Step 3 — Compile the response**

Use the response template below. You do not need to send raw database exports — a clear, readable summary is legally sufficient and more useful to the person.

---

### Part B — Access request (Article 15)

**Step 4A — Send the compiled data response**

Send via email within 30 days of the original request. Use the access response template below.

---

### Part B — Erasure request (Article 17)

**Step 4B — Execute deletion in sequence (order matters)**

Do these in order — do not skip steps or do them simultaneously:

1. **Cancel active subscriptions first.** In Stripe: Customer → Subscriptions → Cancel immediately. In Mollie: Customer → Subscriptions → Cancel. Do this before deleting any records, or the platform may attempt another charge.
2. **Delete the Stripe customer record.** Stripe Dashboard → Customer → Delete. This is permanent.
3. **Delete the Mollie customer record.** Mollie Dashboard → Customer → Delete.
4. **Suppress in Resend.** Resend Dashboard → Suppressions → Add email address. This prevents any future emails being sent to this address from your account.
5. **Redact local records.** In your adopter spreadsheet: replace the name and email with "[REDACTED — erasure YYYY-MM-DD]". Do not delete the row (you need the transaction record for tax purposes — see Compliance below).
6. **FareHarbor (if applicable).** Request deletion via FareHarbor's support process — they do not currently offer self-service deletion. Email FareHarbor support with the customer's email and request deletion under Article 17.
7. **Send the erasure confirmation** to the requester (template below).

---

## Templates

**Verification email**

> Subject: Re: Your data request — quick identity check
>
> Hi [First Name],
>
> Thank you for your request. Before I share or delete any data, I need to quickly confirm I'm speaking to the right person.
>
> Could you confirm: (1) the email address on your adoption account, and (2) the name of the alpaca you were adopting, or the approximate date you signed up?
>
> Once confirmed I'll get started straight away.
>
> [Your name]

**Access response (Article 15)**

> Subject: Your personal data — access request response
>
> Hi [First Name],
>
> Here is the personal data I hold about you. I've organised it by category:
>
> **Personal data:** Name: [X]. Email: [X]. Postal address (if provided for welcome pack): [X].
> **Transaction data:** Subscription tier: [X]. Start date: [X]. Payment history: [X] (see attached Stripe/Mollie export).
> **Communications:** Emails sent to you via Resend: [list with dates].
> **Consents:** You agreed to our Privacy Policy on [date] when completing checkout.
>
> If you'd like to correct anything or would like me to delete your data, just reply to this email.
>
> [Your name]

**Erasure confirmation (Article 17)**

> Subject: Your data has been deleted
>
> Hi [First Name],
>
> I've completed the deletion of your personal data across all systems. Your subscription has been cancelled, your customer records have been deleted from Stripe and Mollie, and your email address has been suppressed from our mailing system.
>
> Please note: transaction records are retained for 7 years as required by tax law, but these are held without any information that identifies you personally.
>
> If you have any questions, please do get in touch.
>
> [Your name]

---

## Edge cases

**Complex request (multiple systems, large volume of data):** You can extend the deadline to 90 days, but you must notify the requester within 30 days that you need more time and explain why.

**Request from a minor (under 16):** Do not process without parental or guardian consent. Reply asking for a parent or guardian to confirm the request. Do not share data with a child's parent without the child's consent if the child is old enough to have consented independently (typically 13+). When in doubt, seek legal advice.

**Requester cannot be verified (fails identity check):** Do not process the request. Send a polite reply explaining you cannot confirm their identity and therefore cannot fulfil the request. Log this outcome in your GDPR log.

**Erasure request conflicts with active dispute:** If the person has an open payment dispute or chargeback, do not delete their records until the dispute is resolved. Note this in your GDPR log and reply explaining the hold.

---

## Escalation

- Requester threatens legal action or mentions a regulator → Contact a solicitor or the ICO's small business helpline before responding further.
- FareHarbor doesn't respond to your deletion request within 14 days → Chase again, then document your attempt. Your obligation is to make the request in good faith.
- You receive more than 3 GDPR requests in a month → Consider whether your Privacy Policy and website are clear enough about data use, and whether you need a more formal data management process.

---

## Compliance touchpoints

- **Legal deadline:** 30 calendar days from receipt (not working days). The extension to 90 days requires written notice to the requester within the first 30 days.
- **Tax retention exemption:** Transaction records (invoices, payment confirmations) must be kept for 7 years under UK/EU tax law regardless of an erasure request. You must redact identifying details but keep the financial record.
- **Erasure ≠ suppression only.** Suppressing in Resend prevents future emails but does not delete historical data. You must also delete the Stripe/Mollie records.
- **Document everything.** If the ICO ever asks, you need to show you received the request, verified the requester, and completed the action within the deadline.

---

## Log requirements

Maintain a GDPR log spreadsheet with one row per request:

| Date received | Requester email | Request type | Verified Y/N | Verification date | Completion date | Systems processed | Notes |
|---|---|---|---|---|---|---|---|

Retain this log for 7 years. Store in your private, password-protected Google account — not a public link.
