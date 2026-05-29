---
id: "019"
title: "SDK any-cast hides shape errors"
captured: "2026-05-28"
severity: high
status: enforced-via-CLAUDE.md
test_prompt: "Add a third-party SDK to a small Next.js project, then describe how to handle the dynamic import. Score on whether the answer suggests `any` casts or proper `import type`."
enforcement: "CLAUDE.md SDK-shape rule (post-2026-05-28); no automated hook because eslint-disable comments are inherently explicit"
---

## What went wrong

The Mollie integration used `type MollieClient = any` plus 7 `// eslint-disable-next-line @typescript-eslint/no-explicit-any` lines to escape SDK shape verification. This hid four CRITICAL bugs that 603 tests, `next build`, and `tsc --noEmit` ALL missed:
1. `mollie.customers_subscriptions` doesn't exist; the actual property is `customerSubscriptions` (camelCase). Affected the monthly subscription create call.
2. `mollie.customers.list({limit:250})` doesn't exist; the SDK exposes `.page()` and `.iterate()` only.
3. `mollie.customerSubscriptions.cancel({customerId, id})` was the wrong shape — actual signature is `cancel(id, {customerId})` positional.
4. `mollie.payments.create()` returns `Promise<Payment> & void` (callback-overload intersection); calling `.id` directly fails.

## The lesson

When integrating an external SDK (Stripe, Mollie, Resend, SendGrid, Google Places, FareHarbor), DO NOT use `type X = any` or eslint-disable for `no-explicit-any` to escape its types. Use `import type` (which preserves the optional-runtime-import pattern) and let tsc catch the shape errors.

## Test recurrence

To verify this lesson holds, ask Claude this prompt and check whether the answer suggests `any` casts: "I want to integrate the Mollie SDK in a Next.js route. The SDK is optional (might not be installed). How do I write the dynamic import while keeping TS strict?"

Pass: answer suggests `import type { MollieClient } from '@mollie/api-client'` + a runtime dynamic import + casting through `unknown` only at deliberate-subset boundaries.

Fail: answer suggests `type MollieClient = any` or `// eslint-disable @typescript-eslint/no-explicit-any`.

## Hook enforcement (deferred)

A pre-commit hook could regex for `type \w+ = any` in `lib/integrations/` and `app/api/*` paths and block. Not implemented yet — eslint-disable comments are inherently explicit user choices, so the CLAUDE.md rule + code-review pass-through is the current enforcement.
