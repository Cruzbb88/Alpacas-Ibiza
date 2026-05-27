# ADR-003: FareHarbor webhook fail-CLOSED when secret unset

**Date**: 2026-04-20
**Status**: Accepted

## Context

The `/api/fareharbor-webhook` route receives booking lifecycle events (created, cancelled, updated) and triggers Resend scheduled emails. Unlike Turnstile (a UX gate), this endpoint mutates state: it schedules and cancels real emails. A missing secret could mean either misconfiguration or an attacker probing the endpoint with no credentials.

Turnstile chose fail-open for unset keys (ADR-002). This route must choose the opposite.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| Fail-open (like Turnstile) | Webhook keeps processing without credentials | Unauthenticated callers can trigger email sends; booking data leaks |
| **Fail-closed: 503 if secret unset** | No processing without explicit configuration | Breaks webhook in dev if env var not set; FareHarbor retries accumulate |
| Fail-open with body logging only | Still auditable | Same security gap |

## Decision

**Fail-CLOSED** (`app/api/fareharbor-webhook/route.ts:66-72`): if `FAREHARBOR_WEBHOOK_SECRET` is unset, return 503 immediately. No fallback, no partial processing.

Security-critical path: the webhook can schedule emails to real customers. Accepting unauthenticated calls — even in dev — is unacceptable. Local dev must set the var (or use a dummy value with FareHarbor test events).

This is the deliberate inverse of ADR-002. CLAUDE.md failsafe map documents both for this reason.

## Consequences

**Positive**
- Unauthenticated callers cannot trigger email mutations.
- Secret absence is immediately visible (503) rather than a silent open door.

**Negative / trade-offs**
- `FAREHARBOR_WEBHOOK_SECRET` is Tier 1 (must-set before prod). Local dev needs it in `.env.local`.
- FareHarbor retries 503s — accumulated retries fire in bulk once the var is set. Acceptable given low booking volume.

## Revisit if

- A local dev mock webhook runner is added (could then allow a special `WEBHOOK_DEV_BYPASS` for test harnesses)
- FareHarbor retry storm becomes a problem at higher booking volumes
