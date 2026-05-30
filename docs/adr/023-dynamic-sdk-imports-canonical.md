# ADR 023 — Dynamic SDK imports for all optional third-party packages (canonical extension of ADR 018)

**Status:** Accepted · 2026-05-29
**Supersedes:** ADR 018 is superseded as the **canonical pattern**. [ADR 018](018-optional-sdk-dynamic-imports.md) is retained for its Stripe/Mollie-specific detail.
**Related:** [ADR 018 — Optional SDK dynamic imports (Stripe/Mollie specifics)](018-optional-sdk-dynamic-imports.md)

## Context

ADR 018 established the dynamic-import pattern for `stripe` and
`@mollie/api-client`. Cycle 11 found that `@react-pdf/renderer` was still
using a **static top-level import**, contradicting ADR 018's intent. A static
import on an optional package crashes the route at module load time — before
any request is handled — instead of at request time. This is a worse failure
mode: the entire route becomes unavailable, not just the feature.

The correct failure mode is:
- Build succeeds with no optional SDK installed.
- At request time, if the SDK is absent, return HTTP 503 with `code='X_SDK_MISSING'`.
- Monitoring can distinguish `X_SDK_MISSING` (missing config) from a real 500.

## Decision

**Every optional SDK uses dynamic `await import()` + null-fallback + 503 with
`code='X_SDK_MISSING'`.** The `/* webpackIgnore: true */` /
`/* turbopackIgnore: true */` bundler hints are required.

SDKs covered by this rule as of 2026-05-29:

| Package | Null-fallback wrapper | 503 code |
|---|---|---|
| `stripe` | `lib/integrations/stripe-sdk.ts` `importStripe()` | `STRIPE_SDK_MISSING` |
| `@mollie/api-client` | `lib/integrations/payment-mollie.ts` `importMollie()` | `MOLLIE_SDK_MISSING` |
| `@react-pdf/renderer` | dynamic import at call site (cycle 11 fix) | `PDF_SDK_MISSING` |

Any future optional SDK (`@vercel/og` additions, analytics SDKs, etc.) MUST
follow the same pattern before merging.

**`@ts-ignore` on the dynamic import line is permitted** when the package types
are absent from the install. This remains the only allowed `@ts-ignore` in
the affected surface (see ADR 018).

## Consequences

- `pnpm build` MUST succeed with none of the optional SDKs installed. CI
  verifies this.
- **New developers:** never write `import X from 'optional-pkg'` at the top of
  a file. Always use the wrapper or a local `importX()` helper with the
  try/catch/null pattern.
- **Monitoring:** alert on 503 responses with `X_SDK_MISSING` codes — these
  indicate a deploy-time configuration gap, not a transient error. They will
  not self-heal on retry.
- **Test setup:** mocks MUST be placed at the `importX()` boundary, not at
  `import` time.
- ADR 018 is retained for Stripe/Mollie specifics (wrapper locations, type
  narrowing interfaces). This ADR is the governing rule for all SDKs going
  forward.
