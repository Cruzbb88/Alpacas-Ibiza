---
id: "009"
title: "Mailer 6s timeout via Promise.race"
priority: P1
depends_on: []
est_size: S (1h)
source: ps-002 Decision A1 / sip-001 gap [ASSUMED: Resend API response time <2s — no timeout configured]
---

## Context

`lib/mailer.ts:sendEmail` calls `resend.emails.send()` with no app-level timeout. CLAUDE.md failsafe map requires `fetchWithTimeout()` on every external HTTP call; Resend SDK is currently the only external HTTP call not covered.

A hung Resend connection holds the webhook handler open. With two sequential sends (reminder + review), the handler can stay open up to 20s before Vercel's function timeout kills it — causing FareHarbor to see a timeout and retry, which can produce duplicate scheduled emails before the original fails.

The Resend SDK (v3) does not accept a caller-supplied `fetch` without re-architecting the SDK constructor (`modules/resend-mailer/note-no-resend-timeout.md`). Use `Promise.race` against a `setTimeout` reject instead — same protection, no SDK coupling.

Source: ps-002 Decision A1 (composite 75%), sip-001 variance V-10-1.

## Acceptance criteria

- [ ] `lib/mailer.ts:sendEmail` wraps the `resend.emails.send()` call in a `Promise.race` against a 6-second timeout promise.
- [ ] On timeout, throws `new Error("Resend send timeout (6s)")` — the caller's existing `try/catch` handles it without modification.
- [ ] The timeout value is 6000ms, matching the project's `fetchWithTimeout` discipline (lib/fetch.ts).
- [ ] CLAUDE.md in-code failsafe map gets a new row: `Mailer 6s timeout via Promise.race` pointing to `lib/mailer.ts`.
- [ ] TypeScript compiles without errors (`tsc --noEmit` clean).
- [ ] Build passes (`next build` clean).

## Implementation notes

```ts
// lib/mailer.ts — inside sendEmail(), replace bare resend.emails.send() call with:
const timeoutMs = 6000;
const timeoutPromise = new Promise<never>((_, reject) =>
  setTimeout(() => reject(new Error("Resend send timeout (6s)")), timeoutMs)
);
const data = await Promise.race([resend.emails.send(payload), timeoutPromise]);
```

- Do NOT use `AbortController` — Resend SDK v3 does not expose a signal option on `emails.send()`.
- The throw propagates to the existing `try/catch` in `app/api/fareharbor-webhook/route.ts` and the admin reminder/review-request fallback routes — no caller changes needed.
- Unit test: mock `resend.emails.send` with a promise that never resolves; assert the wrapper throws within ~6.1s (or use fake timers).

## Out of scope

- Custom `fetch` injection into Resend SDK constructor (A3 in ps-002 — valid long-term but higher risk).
- Retry logic inside `sendEmail` (Resend handles transient retries natively per ADR-001).
- Changing the 6s value (matches `fetchWithTimeout` discipline; revisit only via ADR).
