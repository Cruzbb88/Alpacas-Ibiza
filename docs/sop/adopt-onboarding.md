---
report_type: "sop-gen"
report_number: 2
date: "2026-05-26"
project_name: "Adopt Subscriber Onboarding"
project_tag: "adopt-onboarding"
mode: "deep"
composite_score: null
previous_composite: null
score_delta: "---"
trend: "first_run"
---

# SOP: Adopt-a-Paca Subscriber Onboarding

---

## 1. Document Control

| Field | Value |
|-------|-------|
| **SOP Number** | SOP-ADOPT-001 |
| **Version** | 1.0 |
| **Effective Date** | 2026-05-26 |
| **Author** | Generated from SIPOC + codebase |
| **Approved By** | [NEEDED: Farm Owner] |
| **Review Date** | 2026-11-26 |

---

## 2. Purpose

This procedure defines how adoption inquiries are received, evaluated, payment-collected, and benefits delivered -- ensuring no inquiry is lost and every adopter receives their full benefits package on schedule.

---

## 3. Scope

### Applies To
- Farm Owner (sole operator for all steps)

### When to Use
- A potential adopter clicks the `mailto:info@alpacasibiza.com` CTA on the `/adopt` page
- An adoption inquiry arrives in the owner's inbox by any channel
- An existing adopter requests cancellation or renewal

### Out of Scope
- Tour booking operations (see SOP-BOOK-001)
- Site development and deployment
- Payment platform selection/integration (UNMAPPED -- see Decision D1)

---

## 4. Definitions

| Term | Definition |
|------|-----------|
| Adopt-a-Paca | Subscription program where supporters adopt a named alpaca and receive a benefits package |
| Monthly tier | EUR 75/month recurring subscription; cancellable any time |
| Yearly tier | EUR 900/year prepaid subscription |
| Per-alpaca cap | Maximum number of adopters per individual alpaca; **UNMAPPED -- owner must define** |
| Benefits bundle | 9 items: welcome certificate, farm tour access, fertilizer allocation, professional photoshoot, newsletter, naming rights, plus 3 additional per live site |
| `mailto:` CTA | The adoption page's call-to-action is a `mailto:info@alpacasibeza.com` link, not an embedded form |

---

## 5. RACI Matrix

| Step | Farm Owner |
|------|:----------:|
| Receive inquiry email | R/A |
| Evaluate + assign alpaca | R/A |
| Send welcome + payment instructions | R/A |
| Collect payment | R/A |
| Deliver benefits (certificate, tours, photo) | R/A |
| Process cancellation/renewal | R/A |

> **Note:** All steps are single-operator (Farm Owner). There is no system automation, no CRM, and no second role. This is the highest operational risk in this SOP.

---

## 6. Prerequisites

### Access Required
- [ ] `info@alpacasibiza.com` email inbox
- [ ] Payment vendor account ([NEEDED: Stripe / FareHarbor / Mollie / bank transfer])
- [ ] Alpaca roster with current adoption counts per animal

### Tools Required
| Tool | Purpose |
|------|---------|
| Email client | Receive inquiries, send welcome + payment instructions |
| [NEEDED: Payment platform] | Collect recurring/one-time payments |
| [NEEDED: Tracking spreadsheet or CRM] | Track adopters, alpaca assignments, benefit delivery schedule |

### Materials Needed
- [ ] Welcome certificate template
- [ ] Benefits schedule per tier
- [ ] Current alpaca roster with availability

---

## 7. Procedure

### Phase 1: Inquiry Receipt

1. **Check** `info@alpacasibiza.com` inbox for new adoption inquiries (subject line pre-filled: "Adopt an Alpaca enquiry").
   - Expected result: Email from potential adopter expressing interest.
   - **SLA: Respond within 24 hours.** See Exception E1 for lost inquiries.

2. **Confirm** the inquiry is genuine (not spam) and note requested tier if stated.

> **Checkpoint:** Inquiry acknowledged; adopter added to tracking.

### Phase 2: Alpaca Assignment

3. **Review** current alpaca roster for availability.
   - Check per-alpaca adoption count against cap. See Decision D2.

4. **Select** an alpaca for the adopter based on availability and any adopter preference.

5. **Compose** welcome reply with:
   - Assigned alpaca name and photo
   - Selected tier confirmation (EUR 75/month or EUR 900/year)
   - Full benefits list (9 items)
   - Payment instructions ([NEEDED: payment method and link])

6. **Send** welcome reply to adopter.

> **Checkpoint:** Adopter has received alpaca assignment and payment instructions.

### Phase 3: Payment Collection

7. **Monitor** for payment receipt via [NEEDED: payment platform].
   - Expected result: Payment confirmed within 7 days of welcome email.
   - If no payment after 7 days: send follow-up. See Exception E3.

8. **Record** payment in tracking system with: adopter name, email, alpaca, tier, start date, next payment date.

> **Checkpoint:** Payment received and recorded.

### Phase 4: Benefits Delivery

9. **Generate** and send welcome certificate with adopter name and alpaca name.

10. **Schedule** farm tour access per tier entitlements.

11. **Schedule** professional photoshoot session.

12. **Add** adopter to newsletter distribution list.

13. **Arrange** fertilizer allocation per schedule.

> **Checkpoint:** All 9 benefits initiated or scheduled.

### Phase 5: Ongoing Management

14. **Monitor** recurring payment status monthly (monthly tier) or annually (yearly tier).
    - If payment fails: contact adopter within 48 hours. See Exception E4.

15. **Process** cancellation requests: update roster, free alpaca slot, confirm cancellation to adopter.
    - Monthly: effective immediately. Yearly: runs to term (prepaid).

> **Checkpoint:** Subscription status current; roster accurate.

---

## 8. Decision Trees

### D1: Payment Vendor Selection

**Before Step 7, evaluate: Is a payment platform integrated?**

- **IF** payment platform configured: Send payment link in welcome email.
- **ELSE** (UNMAPPED): Provide bank transfer details manually. **Owner must define payment vendor before scaling beyond 5 adopters.**

### D2: Per-Alpaca Cap

**At Step 3, evaluate: Has the selected alpaca reached its adoption cap?**

- **IF** cap not reached: Assign alpaca. Proceed to Step 4.
- **IF** cap reached: Offer alternative alpaca or add to waitlist. Notify adopter of situation.
- **IF** cap UNMAPPED (current state): Owner assigns at discretion. **Risk: over-subscription with no visibility.** Define cap before scaling.

### D3: Existing Subscriber Migration

**At launch, evaluate: Are there pre-existing adopters from the old site?**

- **IF** existing subscribers: [NEEDED: Grandfathering policy]. Honour old rates or migrate to new tiers?
- **ELSE**: No action needed.

---

## 9. Exception Handling

### Common Issues

| # | Error / Symptom | Likely Cause | Resolution | Escalation |
|---|-----------------|-------------|------------|------------|
| E1 | Inquiry never answered; adopter lost | Email buried in inbox or caught by spam filter | Check spam folder daily. No auto-reply exists -- **this is the single biggest exception handler needed**. Implement auto-reply or form-based intake to prevent silent loss. | Farm Owner -- immediate (revenue + reputation) |
| E2 | Prices on site don't match owner's current rates | Prices hardcoded as EUR 75/EUR 900 in codebase and JSON-LD | Requires code change + redeploy. No env-var override path exists. | Developer -- within 1 week |
| E3 | Adopter doesn't pay after welcome email | Lost interest or payment friction | Send one follow-up at 7 days. If no response after 14 days, close inquiry and free alpaca slot. | Farm Owner -- low priority |
| E4 | Recurring payment fails | Card expired, insufficient funds | Contact adopter within 48 hours. Grace period: 7 days. After grace period: suspend benefits, free alpaca slot. | Farm Owner -- within 48 hours |
| E5 | Over-subscribed alpaca | Per-alpaca cap not tracked | Audit all assignments immediately. Define and enforce cap. Reassign excess adopters. | Farm Owner -- within 1 week |

### Escalation Path
1. **Self-service**: Farm Owner checks inbox, payment platform, and roster.
2. **Developer**: Only needed for price changes (code redeploy) or payment platform integration.

### Rollback Procedure
If an adopter was assigned incorrectly:
1. **Notify** adopter of the error with apology.
2. **Offer** alternative alpaca or full refund.
3. **Update** roster and tracking records.

---

## 10. Quality Checks

### Completeness
- [ ] Every inquiry responded to within 24 hours
- [ ] Every adopter assigned to an alpaca with confirmed availability
- [ ] Payment recorded with correct tier and dates
- [ ] All 9 benefits initiated or scheduled

### Quality
- [ ] Welcome certificate has correct adopter and alpaca names
- [ ] Newsletter list matches active subscriber list
- [ ] Roster adoption counts accurate (no over-subscription)

### Sign-Off
| Reviewer | Date | Status |
|----------|------|--------|
| [NEEDED: Farm Owner] | | Pending |

---

## 11. References

### Related SOPs
- SOP-BOOK-001: Booking Operations

### Related SIPOC
- [docs/sipoc/adopt.md](../sipoc/adopt.md) -- source-of-truth process map

### Open Questions (from SIPOC)
- Payment vendor selection (Stripe / FareHarbor / Mollie)
- Per-alpaca adoption cap
- Grandfathering policy for existing subscribers
- Subscription management system

---

## 12. Version History

| Version | Date | Author | Description of Changes |
|---------|------|--------|----------------------|
| 1.0 | 2026-05-26 | Generated from SIPOC + codebase | Initial version |
