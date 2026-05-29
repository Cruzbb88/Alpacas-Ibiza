---
id: "007"
title: "Stripe fallback keep-warm: monthly synthetic test charge"
status: "todo"
priority: "medium"
created: "2026-05-29"
depends_on: ["ADR-019"]
blocks: []
owner: "platform"
---

## Context

ADR-019 establishes Mollie as the primary payment processor with Stripe retained as a geographically-constrained fallback (non-EEA donors, Stripe Tax automation). Because Stripe is only exercised when the primary path is unavailable, the integration can silently rot — expired API keys, webhook drift, outdated library versions, or Stripe account flag changes — without anyone noticing until it is actually needed.

A monthly synthetic end-to-end test in Stripe test-mode closes that gap. If the keep-warm run fails, an alert fires before the real fallback scenario hits production.

---

## Acceptance criteria

### Scheduled cron

- [ ] A cron job runs on the 1st of each month at 02:00 UTC.
- [ ] The job executes a full Stripe test-mode checkout: create a PaymentIntent → confirm with a Stripe-provided test card token → verify `.status === 'succeeded'`.
- [ ] The job does **not** use production Stripe keys; it reads `STRIPE_TEST_SECRET_KEY` from env, which is distinct from `STRIPE_SECRET_KEY`.
- [ ] The cron is defined in `lib/jobs/stripe-keep-warm.ts` and registered in the project's scheduler (Vercel Cron or equivalent).
- [ ] On success, the result (timestamp + `"ok"`) is written to a persistent store (e.g., a JSON file at `data/keep-warm-status.json` or a DB row in a `payment_health` table).
- [ ] The job completes in under 30 seconds; it times out and fails explicitly if Stripe does not respond within 20 seconds.

### Alerting

- [ ] On any failure (non-success PaymentIntent status, network error, timeout), an alert email is sent to the site owner address (`OWNER_ALERT_EMAIL` env var).
- [ ] Alert email includes: job run timestamp, error message or PaymentIntent status, and a link to the admin dashboard tile (see below).
- [ ] Alert uses the existing transactional email path (Resend or equivalent) — no new email provider.
- [ ] A second failure in the same calendar month does **not** send a duplicate alert (idempotency guard).

### Admin dashboard tile

- [ ] A tile is rendered on `/admin/dashboard` titled "Stripe Fallback Health".
- [ ] The tile displays: last run timestamp (ISO 8601, localised to site timezone), result badge ("OK" in green / "FAILED" in red / "NEVER RUN" in grey), and a manual "Run now" button.
- [ ] "Run now" button calls `POST /api/admin/stripe-keep-warm/trigger`, which is admin-auth-gated (same middleware as all `/api/admin/*` routes).
- [ ] Manual trigger respects the same idempotency guard as the scheduled run (will not re-send an alert if one was already sent this month).
- [ ] Tile data is fetched from `GET /api/admin/stripe-keep-warm/status` and refreshes on page load; no real-time polling.

---

## Implementation notes

- `STRIPE_TEST_SECRET_KEY` must be added to the project's env var documentation and Railway/Vercel secret store. It is a Stripe restricted key scoped to `payment_intents:write` in test mode only.
- Test-mode PaymentIntents do not affect real money and do not appear in production reporting. Stripe test-mode and live-mode are separate environments on the same account.
- The keep-warm job should be implemented as a plain async function (not a Next.js API route internally) so it can be called from both the cron and the admin trigger route without duplication.
- Failure storage should survive cold starts — write to a file in `data/` committed to the repo, or to the same DB used for subscriptions. Do not rely on in-memory state.
- If `STRIPE_TEST_SECRET_KEY` is absent, the job logs a warning and exits without error — the integration may be intentionally disabled in environments where it is not configured.

---

## Out of scope

- Replacing or modifying the live Stripe charge path.
- Testing Stripe webhooks (webhook health is a separate concern).
- Alerting on Mollie primary health (Mollie has its own status page and dashboard).
- Any UI change to the public-facing payment flow.
- Automated remediation — the tile and alert are observe-only; a human decides whether to rotate keys or fix the integration.
