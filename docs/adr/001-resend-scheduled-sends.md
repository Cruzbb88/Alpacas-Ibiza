# ADR-001: Resend scheduledAt for delayed tour emails

**Date**: 2026-04-20
**Status**: Accepted

## Context

Site needs to send two delayed emails triggered by a FareHarbor webhook:
- **Reminder**: 48h before the tour starts
- **Review request**: 24h after the tour ends

Serverless functions (Vercel) can't hold state or run long delays. The delayed-send problem needs an external scheduler or a feature of an existing provider.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| Upstash QStash | Purpose-built, free 500/day, HTTP-only | New service, new auth, new dashboard |
| Vercel KV + cron every 5 min | Stays within Vercel | Polling waste, more moving parts, KV isn't free past a tier |
| Supabase + cron | Also gives us a DB we might want later | Overkill just for delayed emails |
| **Resend scheduledAt** | Zero new infra. Already using Resend. Native param. | Deeper Resend lock-in. Reschedule needs cancel+reschedule dance. |

## Decision

**Resend `scheduledAt`.**

Webhook arrives → we call `resend.emails.send({ scheduledAt: '...' })` with the delayed ISO timestamp → Resend holds the email and fires at the scheduled time. No queue, no polling, no new service, no new secret management. Just one extra field on a POST we already make.

For cancellation/reschedule: Resend returns an email ID on send. We persist `{booking_pk, reminder_email_id, review_email_id}` and call `resend.emails.cancel(id)` when FareHarbor sends `booking.cancelled` / `booking.updated`.

## Consequences

**Positive**
- Zero new infrastructure.
- No new auth / webhook signatures / queue configuration.
- Resend handles retries on transient network failures natively.

**Negative / trade-offs**
- Deeper dependency on Resend. If they drop `scheduledAt` or raise prices significantly, we have to migrate.
- Need a tiny persistence layer to map `booking_pk → email_ids` for reschedule/cancel. Starting with process-memory-only dedup; will upgrade to Vercel KV or a Supabase table when volume justifies it.
- Resend currently allows scheduling up to ~30 days in the future — not an issue for our 48h/24h needs but something to re-check if we ever want longer delays.

## Revisit if

- Resend drops `scheduledAt` support
- We need complex queue branching (dead-letter, fan-out, priority)
- Volume exceeds Resend's scheduled-email tier
- A stateful DB is added for other reasons — at that point, a DB-backed queue becomes as simple
