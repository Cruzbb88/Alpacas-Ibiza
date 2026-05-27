---
id: "010"
title: "Webhook silent-failure owner alert"
priority: P1
depends_on: ["009"]
est_size: S (1.5h)
source: ps-002 Decision B1 / sip-001 gap [NEEDED: No monitoring/alerting for failed webhook deliveries]
---

## Context

When `app/api/fareharbor-webhook/route.ts` processes a `booking.created` event, both Resend schedule calls (`scheduleReminder` + `scheduleReview`) are wrapped in `try/catch`. If either or both fail, the handler logs to `console.error` and returns HTTP 200 with `null` email IDs. The owner has no visibility into the failure — the booking is silently unattended (no reminder, no review request).

Returning 5xx is explicitly ruled out (ps-002 Decision B, alternative B2 rejected): FareHarbor retries on 5xx, our webhook has no dedupe, the in-memory `bookingScheduleStore` loses state on cold start (ADR-001), and a retry on a different Vercel instance orphans any Resend IDs that partially succeeded. Do NOT change the 200 response.

The fix is additive: when BOTH schedule calls fail, send a lightweight owner-alert email via the existing `sendEmail()` so the owner can intervene manually.

Spec 009 (mailer timeout) must land first so the `sendEmail()` call in the alert path is itself bounded and the catch path is well-defined.

Source: ps-002 Decision B1 (composite 69%), sip-001 variance V-10-1.

## Acceptance criteria

- [ ] `app/api/fareharbor-webhook/route.ts`: when BOTH the reminder-schedule and review-request-schedule calls fail (both land in their respective catch paths), send an owner-alert email via `sendEmail()` to `CONTACT_EMAIL` with:
  - Subject: `[ALERT] Booking automation failed for {booking_pk}`
  - Body uses `emailLayout()` and includes: booking PK, customer email, reminder error message, review error message.
- [ ] Webhook still returns HTTP 200 — do NOT return 5xx (collides with ADR-001 cold-start store and FareHarbor retry contract).
- [ ] The owner-alert `sendEmail()` call is wrapped in its own `try/catch`. If the alert itself fails, log `console.error("[ALERT SEND FAILED]", ...)` and continue — do not throw, do not recurse.
- [ ] CLAUDE.md in-code failsafe map gets a new row: `Owner-alert on full email-schedule failure` pointing to `app/api/fareharbor-webhook/route.ts`.
- [ ] TypeScript compiles without errors (`tsc --noEmit` clean).
- [ ] Build passes (`next build` clean).

## Implementation notes

Only fire the owner alert when BOTH schedules fail, not when just one fails (partial success is still useful; noisy alerting on single-leg failure is not worth it).

```ts
// Pseudocode — inside the booking.created handler, after both schedule attempts:
let reminderError: Error | null = null;
let reviewError: Error | null = null;

try { /* schedule reminder */ } catch (e) { reminderError = e as Error; }
try { /* schedule review  */ } catch (e) { reviewError  = e as Error; }

if (reminderError && reviewError) {
  try {
    await sendEmail({
      to: process.env.CONTACT_EMAIL!,
      subject: `[ALERT] Booking automation failed for ${booking.pk}`,
      html: emailLayout(`
        <p>Both scheduled emails failed for booking <strong>${booking.pk}</strong>.</p>
        <p>Customer: ${escapeHtml(booking.customerEmail)}</p>
        <p>Reminder error: ${escapeHtml(reminderError.message)}</p>
        <p>Review error: ${escapeHtml(reviewError.message)}</p>
        <p>Check Resend dashboard and reschedule manually via /api/reminder and /api/review-request.</p>
      `),
    });
  } catch (alertErr) {
    console.error("[ALERT SEND FAILED]", alertErr);
  }
}
```

- Use `escapeHtml()` from `lib/html.ts` on all interpolated values (XSS prevention, consistent with existing mailer patterns).
- `CONTACT_EMAIL` is a Tier 1 env var (already required; no new env needed).

## Manual test path

1. Set `RESEND_API_KEY` to a bad value (e.g. `re_INVALID`) in `.env.local`.
2. Send a fake `booking.created` webhook via `curl` with a valid `x-webhook-secret` and a minimal booking payload.
3. Confirm the webhook returns HTTP 200.
4. Confirm the real `CONTACT_EMAIL` inbox (or Resend dashboard logs) receives the `[ALERT]` email — or, if the API key is bad for the alert too, confirm `[ALERT SEND FAILED]` appears in server logs.
5. Restore `RESEND_API_KEY` to the real value.

## Out of scope

- Alerting on single-leg failure only (too noisy; partial schedules are still useful).
- Returning 5xx to trigger FareHarbor retries (rejected in ps-002 B2 — documented tradeoff, do not re-litigate without a new ADR).
- Structured log drain / Vercel alerting (ps-002 B3 — requires log infrastructure that does not exist today).
