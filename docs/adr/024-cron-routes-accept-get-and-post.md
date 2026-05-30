# ADR 024 — Cron-triggered routes export both GET and POST

**Status:** Accepted · 2026-05-29
**Related:** [ADR 003 — Webhook secret fail-closed](003-webhook-secret-fail-closed.md)

## Context

Cycle 10 live-runtime testing found `/api/adopt-quarterly-update` returning
**HTTP 405 Method Not Allowed** to Vercel Cron, despite `vercel.json`
correctly listing the path under `crons`. The root cause: the route exported
only `export const GET`, but Vercel Cron dispatches **POST** requests.

Next.js route handlers must explicitly export a named function for each HTTP
method. Exporting only `GET` causes Next.js to return 405 on POST — regardless
of what `vercel.json` says.

Sister cron routes (`adopt-deferred-gifts`, `adopt-renewal-reminders`) were
audited and found compliant at the time.

## Decision

**Every cron-triggered route exports both `GET` and `POST`.** When the full
logic is in `GET`, use:

```ts
export const POST = GET
```

Both exports must authenticate via `CRON_SECRET` (`Authorization: Bearer …`
header, constant-time `safeEqual` comparison per ADR 003 pattern).

Vercel Cron is the only caller of these routes in production. The dual-export
costs 1 line and eliminates the entire 405-vs-cron failure class.

## Consequences

- **Applied to all existing cron routes** at cycle 10 fix. Any new cron route
  added in future must export both methods before merging.
- **No security regression.** Both methods enforce the same `CRON_SECRET`
  gate. An unauthenticated GET or POST still returns 401.
- **`vercel.json` remains the authoritative scheduler config.** This ADR does
  not change scheduling — it only ensures the route accepts the method Vercel
  actually sends.
- **Marginal cost:** +1 line per cron route. No performance or bundle impact.
