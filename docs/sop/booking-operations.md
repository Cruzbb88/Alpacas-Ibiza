---
report_type: "sop-gen"
report_number: 1
date: "2026-05-26"
project_name: "Booking Operations"
project_tag: "booking-operations"
mode: "deep"
composite_score: null
previous_composite: null
score_delta: "---"
trend: "first_run"
---

# SOP: Booking Operations (FareHarbor Admin to Post-Visit Review)

---

## 1. Document Control

| Field | Value |
|-------|-------|
| **SOP Number** | SOP-BOOK-001 |
| **Version** | 1.0 |
| **Effective Date** | 2026-05-26 |
| **Author** | Generated from SIPOC + codebase |
| **Approved By** | [NEEDED: Farm Owner] |
| **Review Date** | 2026-11-26 |

---

## 2. Purpose

This procedure standardises the end-to-end booking flow -- from a visitor selecting a tour date through guest arrival and post-visit review collection -- so that every booking triggers the correct automated emails and every exception has a defined handler.

---

## 3. Scope

### Applies To
- Farm Owner (FareHarbor admin, email oversight)
- Site automated systems (Next.js API routes, Resend scheduler)
- On-site staff (guest check-in)

### When to Use
- A visitor views the booking page and proceeds to FareHarbor
- A FareHarbor webhook fires (`booking.created`, `booking.updated`, `booking.cancelled`)
- A guest arrives for a tour
- Post-tour review collection is due

### Out of Scope
- FareHarbor internal payment reconciliation
- Adopt-a-Paca subscriptions (see SOP-ADOPT-001)
- Site deployment and infrastructure changes

---

## 4. Definitions

| Term | Definition |
|------|-----------|
| FareHarbor | Third-party booking and payment platform used for tour reservations |
| ISR | Incremental Static Regeneration -- Next.js cache strategy; availability data refreshes every 30 minutes |
| Resend | Transactional email service; holds scheduled emails server-side and delivers at `scheduledAt` time |
| `bookingScheduleStore` | In-memory store mapping booking PK to scheduled Resend email IDs; lost on cold start (ADR 001) |
| HMAC-lite | Shared-secret webhook auth via `x-webhook-secret` header and `safeEqual()` constant-time compare |
| Booking PK | FareHarbor's unique identifier for a reservation |

---

## 5. RACI Matrix

| Step | Farm Owner | Site System | On-site Staff |
|------|:----------:|:-----------:|:-------------:|
| Fetch + display availability | I | R/A | -- |
| Guest completes FareHarbor booking | I | -- | -- |
| Validate + route webhook | I | R/A | -- |
| Schedule reminder email (48h pre-tour) | I | R/A | -- |
| Schedule review-request email (24h post-tour) | I | R/A | -- |
| Guest check-in on arrival | A | -- | R |
| Monitor for failed/missing emails | R/A | I | -- |
| Manual re-send (fallback routes) | R/A | R | -- |
| Handle cancellation webhook | I | R/A | I |

---

## 6. Prerequisites

### Access Required
- [ ] FareHarbor admin dashboard (owner credentials)
- [ ] Resend account with valid `RESEND_API_KEY`
- [ ] Server environment with Tier 1 env vars set (see CLAUDE.md deploy tiers)

### Tools Required
| Tool | Purpose |
|------|---------|
| FareHarbor | Booking management, payment processing, webhook source |
| Resend | Scheduled transactional email delivery |
| Next.js API routes | `/api/availability`, `/api/fareharbor-webhook`, `/api/reminder`, `/api/review-request` |

---

## 7. Procedure

### Phase 1: Availability Display

1. **Verify** FareHarbor API keys (`FAREHARBOR_APP_KEY`, `FAREHARBOR_USER_KEY`) are set in environment.
   - Expected result: `/api/availability` returns 200 with date/capacity JSON.
   - If keys unset: route returns 503; `BookingSection` hides date grid and shows static "View & Book" CTA. Flow continues at Step 4.

2. **Confirm** ISR cache is refreshing (30-minute window).
   - Expected result: `lastUpdated` timestamp in availability response is within 30 minutes of current time.

> **Checkpoint:** Date grid renders with up to 8 slots and low-capacity warnings (<=5 spots).

### Phase 2: Guest Booking

3. **Observe** visitor clicks "Book Now" or selects a date tile.
   - GA4 events `bookTourClick` and `bookingCalendarOpen` fire automatically.

4. **Confirm** guest completes booking on FareHarbor hosted UI (name, email, party size, payment).
   - Expected result: FareHarbor issues confirmation email to guest; booking PK created; webhook event fired to `/api/fareharbor-webhook`.

> **Checkpoint:** Booking exists in FareHarbor dashboard with status "confirmed".

### Phase 3: Webhook Processing

5. **Verify** `FAREHARBOR_WEBHOOK_SECRET` is configured.
   - If unset: webhook route returns 503 immediately; no automated emails will be scheduled. See Exception E1.

6. **Validate** incoming webhook: `safeEqual()` compares `x-webhook-secret` header against stored secret.
   - 401 on mismatch (event dropped). See Exception E2.

7. **Extract** booking via `extractBooking()` -- handles both FareHarbor payload shapes (nested and flat).

8. **Validate** booking fields via `validateBookingForScheduling()`: email format check, `start_at` presence.
   - 400 on invalid. See Exception E3.

9. **Compute** schedule windows via `computeScheduleWindows()`:
   - `reminderAt` = `start_at` minus 48 hours
   - `reviewAt` = `end_at` plus 24 hours (defaults to `start_at` + 1h if `end_at` missing)

10. **Schedule** reminder email via `sendEmail({ scheduledAt: reminderAt })` if `reminderAt` is in the future.
    - If `reminderAt` is in the past: skip reminder, still schedule review. See Decision D1.

11. **Schedule** review-request email via `sendEmail({ scheduledAt: reviewAt })` if `reviewAt` is in the future.

12. **Store** both Resend email IDs in `bookingScheduleStore` keyed by booking PK.

> **Checkpoint:** `bookingScheduleStore` contains entry for booking PK with non-null email IDs.

### Phase 4: Guest Arrival

13. **Greet** guest on arrival; verify name against FareHarbor booking list.

14. **Confirm** party size matches booking.

> **Checkpoint:** Guest checked in; tour proceeds.

### Phase 5: Post-Visit Emails

15. **Verify** reminder email was delivered (check Resend dashboard or logs) 48 hours before tour.

16. **Verify** review-request email was delivered 24 hours after tour end.

17. **Monitor** Google Places / Facebook for new review from guest (out-of-system; `GoogleReviewsBadge` refreshes via `/api/google-reviews`).

> **Checkpoint:** Both automated emails delivered; review link clicked (optional).

---

## 8. Decision Trees

### D1: Reminder Window Already Past

**At Step 10, evaluate: Is `start_at - 48h` in the future?**

- **IF** `reminderAt > now`: Schedule reminder email. Proceed to Step 11.
- **ELSE** (reminder window past): Skip reminder (`scheduleReminder = false`). Proceed to Step 11 -- review email is unaffected.

### D2: Booking Cancelled

**At Step 7, evaluate: Is webhook event `booking.cancelled` or `booking.deleted`?**

- **IF** cancelled/deleted: Call `cancelScheduledEmail` for both reminder and review IDs. Delete entry from `bookingScheduleStore`. Return 200. **Stop.**
- **ELSE IF** `booking.updated`/`booking.modified`: Cancel existing schedule IDs, re-run Steps 8-12 with updated `start_at`/`end_at`.
- **ELSE** (`booking.created`): Proceed to Step 8.

### D3: Resend `sendEmail` Fails

**At Steps 10-11, evaluate: Did `sendEmail` throw?**

- **IF** error: Log via `console.error`. Email ID stored as `null` in `bookingScheduleStore`. No automated email for that slot.
- **THEN**: Farm Owner must use manual fallback (`POST /api/reminder` or `POST /api/review-request` with `x-webhook-secret` header). See Exception E4.

---

## 9. Exception Handling

### Common Issues

| # | Error / Symptom | Likely Cause | Resolution | Escalation |
|---|-----------------|-------------|------------|------------|
| E1 | Webhook returns 503; no emails scheduled | `FAREHARBOR_WEBHOOK_SECRET` env var unset | Set the env var in hosting platform and redeploy | Farm Owner -- immediate; booking still exists in FareHarbor |
| E2 | Webhook returns 401; event dropped | `x-webhook-secret` header mismatch (secret rotated in FareHarbor but not in site env) | Sync secret between FareHarbor webhook config and site env var | Farm Owner -- within 1 hour |
| E3 | Webhook returns 400 | Guest email missing or invalid in FareHarbor booking, or `start_at` absent | Check booking in FareHarbor admin; correct guest email; re-trigger webhook or use manual send routes | Farm Owner -- within 24 hours |
| E4 | Scheduled email not delivered | Resend API error at schedule time, or `bookingScheduleStore` lost on cold start | Use manual fallback: `POST /api/reminder` or `POST /api/review-request` with booking details and `x-webhook-secret` header | Farm Owner -- before tour (reminder) or within 48h post-tour (review) |
| E5 | Stale email after server restart | In-memory `bookingScheduleStore` cleared on cold start; Resend still delivers but site cannot cancel | At most one stale email per redeploy (ADR 001 accepted tradeoff). No action unless guest complains. | Farm Owner -- low priority |
| E6 | FareHarbor API down | Network failure or FareHarbor outage | UI automatically hides date grid and shows static CTA linking to FareHarbor embed directly; booking flow continues without live availability | No escalation needed; self-healing |

### Escalation Path
1. **Self-service**: Check Resend dashboard for delivery status; check server logs for webhook errors.
2. **Tier 1**: Farm Owner reviews FareHarbor admin for booking status (within 2 hours of issue detection).
3. **Tier 2**: Developer investigates webhook route logs, Resend API status (within 24 hours if Tier 1 unresolved).

### Rollback Procedure
If a duplicate or erroneous email was scheduled:
1. **Retrieve** Resend email ID from logs or `bookingScheduleStore`.
2. **Cancel** via Resend API (`DELETE /emails/{id}`).
3. **Delete** entry from `bookingScheduleStore`.

---

## 10. Quality Checks

### Completeness
- [ ] Availability grid rendering with current data
- [ ] Webhook secret configured and validated
- [ ] Both reminder and review emails scheduled for each new booking
- [ ] Cancellation webhook correctly cancels pending emails

### Quality
- [ ] Email content matches guest name, tour name, and date (escapeHtml applied)
- [ ] Schedule windows are correct (48h pre, 24h post)
- [ ] GA4 conversion events firing on booking click

### Sign-Off
| Reviewer | Date | Status |
|----------|------|--------|
| [NEEDED: Farm Owner] | | Pending |

---

## 11. References

### Related SOPs
- SOP-ADOPT-001: Adopt Subscriber Onboarding

### Architecture Decisions
- [ADR 001: Resend Scheduled Sends](../adr/001-resend-scheduled-sends.md) -- documents in-memory store tradeoff

### Related SIPOC
- [docs/sipoc/booking.md](../sipoc/booking.md) -- source-of-truth process map

### Tools Documentation
- FareHarbor API: `GET /api/external/v1/companies/alpacasibiza/items/{pk}/minimal/availabilities/date-range/`
- Resend: [resend.com/docs](https://resend.com/docs)

---

## 12. Version History

| Version | Date | Author | Description of Changes |
|---------|------|--------|----------------------|
| 1.0 | 2026-05-26 | Generated from SIPOC + codebase | Initial version |
