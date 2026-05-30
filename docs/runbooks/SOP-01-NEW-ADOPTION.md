# SOP-01 — Responding to a New Adoption Notification

**Version:** 1.0 — 2026-05-30
**Owner:** Farm owner (or designated staff cover)
**Trigger:** Email notification from `buildOwnerAdoptionEmail` — subject line "New adoption signed up"
**SLA:** Complete all steps within 24 hours of receiving the notification

---

## Purpose

Make sure every new adopter gets a warm, personal welcome and that your farm records stay accurate from day one. A quick, personal response in the first 24 hours sets the tone for the whole adoption relationship.

---

## When to use

Every time a new adopter completes checkout via Stripe or Mollie and the system sends you an owner notification email.

---

## Pre-requisites

- Access to your email inbox
- The per-alpaca adopter spreadsheet (see Log Requirements below)
- Physical farm board (whiteboard or chalkboard in the barn/reception area)
- Welcome pack stock: postal certificates, planners, keychains
- Access to your postal dispatch process (postage, envelope templates)

---

## Steps

**Step 1 — Cross-check alpaca availability (do this first, within 2 hours)**

The notification email includes the alpaca the adopter chose. Before doing anything else:

1. Open your per-alpaca adopter spreadsheet.
2. Count current active adopters for that alpaca.
3. If the alpaca is at capacity (your chosen max — typically 1 named adopter per alpaca, or whatever limit you've set): contact the adopter within 2 hours to offer an alternative alpaca or a waitlist spot. Do not promise the original alpaca if it's already taken.
4. If availability is fine: proceed to Step 2.

> If you haven't set a per-alpaca capacity limit yet — do it now. Write a number in the spreadsheet header for each alpaca column before you get your second adopter.

**Step 2 — Add to the physical farm board**

- Write the adopter's name (or the recipient's name for gift adoptions — see Edge Cases) on the board next to the alpaca's name.
- If the board uses a colour-coding system (e.g. monthly vs annual), apply the correct label.
- Take a quick phone photo of the board after updating — attach to the spreadsheet row as confirmation.

**Step 3 — Schedule the welcome pack mailing**

1. Locate a welcome pack (certificate + planner + keychain).
2. Address the envelope. For gift adoptions, address to the recipient, not the donor.
3. Write the recipient's name on the postal certificate (not the donor's name for gifts).
4. Target: post within 48 hours of the adoption. Mark the dispatch date in your spreadsheet.
5. If packs are out of stock: note this in the spreadsheet and order stock immediately. Email the adopter to let them know there's a short delay — don't go silent.

**Step 4 — Send a personal thank-you email (within 24 hours)**

Copy the template below, personalise the greeting and alpaca name, and send from your farm email address.

**Step 5 — Update the per-alpaca adopter spreadsheet**

Add a new row with:

| Column | What to enter |
|---|---|
| Date | Today's date |
| Adopter name | From the notification email |
| Recipient name | Same as adopter unless it's a gift |
| Email | From the notification email |
| Alpaca | The alpaca chosen |
| Tier | Monthly / Annual |
| Platform | Stripe / Mollie |
| Pack dispatched | Date posted (fill in when done) |
| Board updated | Yes / No |
| Notes | Any edge cases or delays |

---

## Templates

**Thank-you email — standard adoption**

> Subject: Welcome to the Alpaca Farm family, [First Name]!
>
> Hi [First Name],
>
> Thank you so much — [Alpaca Name] is going to love having you as an adopter! Your welcome pack is on its way to you in the post, so keep an eye out for it over the next few days.
>
> In the meantime, if you ever want an update on how [Alpaca Name] is getting on, just reply to this email — I love sharing news from the farm.
>
> With warm wishes,
> [Your name]
> [Farm name]

**Thank-you email — gift adoption (send to donor)**

> Subject: Your gift adoption is confirmed — thank you!
>
> Hi [Donor First Name],
>
> What a lovely gift! I've set up the adoption for [Recipient Name], and their welcome pack — including the personalised certificate — is heading to them in the post.
>
> Their name is now on our farm board alongside [Alpaca Name], which feels very special.
>
> Thank you for choosing the farm. Please do get in touch if you'd like to arrange anything extra for the gift.
>
> With warm wishes,
> [Your name]

---

## Edge cases

**Gift adoptions:** The name on the board and the postal certificate should be the recipient's name, not the donor's. The thank-you email goes to the donor (they paid), but mention the recipient by name so the donor knows it's personalised correctly.

**Alpaca at capacity:** Reach out to the adopter within 2 hours. Offer an alternative alpaca at the same tier and price. If they want to wait for their original choice, add them to a waitlist column in the spreadsheet.

**Owner away / on leave:** Designate a staff cover person before you go. They should have read access to the notification inbox and know where the spreadsheet lives. The 24-hour SLA still applies — brief your cover before you leave.

**Duplicate notifications:** Occasionally Stripe and Mollie both fire if a test event leaks. Check the platform column — if you see the same email twice in the same hour from different platforms, contact your developer before updating the board.

---

## Escalation

- Alpaca availability conflict you can't resolve → Contact your developer to check whether the site's availability logic needs updating.
- Payment looks wrong (amount doesn't match your tier pricing) → Do not process the pack. Email the adopter to confirm, and flag to your developer.
- Welcome pack stock is exhausted and you can't reorder within 7 days → Notify the adopter proactively; offer a digital certificate as a stopgap.

---

## Compliance touchpoints

- Personal data collected (name, email, address for postal pack) is processed under your Privacy Policy. Do not share it with third parties.
- Spreadsheet containing adopter data should be stored on an encrypted device or password-protected Google Sheet (not a public link).

---

## Log requirements

Maintain the per-alpaca adopter spreadsheet as the single source of truth. It feeds the quarterly update email process — if an adopter isn't in the spreadsheet, they won't receive their update. Check it monthly for completeness.
