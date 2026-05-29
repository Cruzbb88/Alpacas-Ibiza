---
id: "009"
title: "Mollie Connect tenant activation flow"
status: "todo"
priority: "medium"
created: "2026-05-29"
depends_on: ["ADR-020"]
blocks: []
owner: "platform"
trigger: "First tenant signs — do not build speculatively before tenant #1 is confirmed"
---

## Context

ADR-020 selects Mollie Connect as the tenant revenue mechanism: platform collects an application fee on each donation processed by the tenant's own Mollie account, keeping per-tenant PCI scope minimal and satisfying EEA SCA requirements natively. This spec defines the concrete build that executes when tenant #1 signs.

The three activation gates from ADR-020 that must pass before any tenant goes live are restated as acceptance criteria below.

---

## Acceptance criteria

### Gate 1 — Mollie OAuth integration

- [ ] `lib/integrations/payment-mollie.ts` is extended with:
  - `getMollieOAuthAuthorizationUrl(tenantId: string): string` — builds the Mollie OAuth authorization URL with `MOLLIE_CONNECT_CLIENT_ID`, a `state` parameter containing `tenantId`, and scopes `payments.read payments.write organizations.read`.
  - `exchangeMollieOAuthCode(code: string, state: string): Promise<MollieOAuthTokens>` — calls Mollie's token endpoint with `MOLLIE_CONNECT_CLIENT_SECRET` and returns `{ access_token, refresh_token, expires_at, organization_id }`.
  - `refreshMollieOAuthToken(refreshToken: string): Promise<MollieOAuthTokens>` — refreshes an expired access token.
  - All three functions use `import type { MollieClient } from '@mollie/api-client'` — no `any` casts (SDK-shape rule, per philosophy catalog entry 019).

- [ ] Mollie OAuth tokens for each tenant are stored encrypted at rest. The encryption key is `MOLLIE_TOKEN_ENCRYPTION_KEY` (32-byte AES-256-GCM key, env var). Storage location: a `tenant_mollie_tokens` table (or equivalent persistent store) keyed by `tenantId`.

- [ ] `lib/mollie-manage-token.ts` is extended to handle a `'tenant-onboard'` scope:
  - Reads the tenant's stored access token.
  - Refreshes automatically if `expires_at` is within 5 minutes.
  - Returns the current valid access token.

### Gate 2 — Onboarding routes

- [ ] `POST /api/tenants/onboard` — initiates the Mollie Connect OAuth flow for a given tenant.
  - Request body: `{ tenantId: string }`.
  - Auth: platform admin only (existing admin middleware).
  - Response: `{ authorizationUrl: string }` — the URL to redirect the tenant to in order to grant Mollie Connect access.
  - Stores a pending `{ tenantId, state, initiatedAt }` record so the callback can validate `state`.

- [ ] `GET /api/tenants/onboard/status` — returns the current onboarding state for a tenant.
  - Query param: `tenantId`.
  - Auth: platform admin only.
  - Response shape:
    ```ts
    {
      tenantId: string;
      status: 'pending' | 'connected' | 'failed' | 'not-started';
      connectedAt?: string;       // ISO 8601
      mollieOrganizationId?: string;
      error?: string;
    }
    ```

- [ ] `GET /api/tenants/onboard/callback` — Mollie redirects here after the tenant grants access.
  - Validates `state` against the pending record.
  - Calls `exchangeMollieOAuthCode` to obtain tokens.
  - Stores encrypted tokens via `lib/mollie-manage-token.ts`.
  - Updates tenant record to `status: 'connected'`.
  - Redirects to `/admin/tenants/[tenantId]` with a success flash.

### Gate 3 — Payment vendor routing

- [ ] `PAYMENT_VENDOR=mollie-connect` is the env var value used in tenant-originated payment flows (distinct from `PAYMENT_VENDOR=mollie` used for the platform's own Mollie account).
- [ ] When `PAYMENT_VENDOR=mollie-connect`, `lib/integrations/payment-mollie.ts` uses the tenant's stored OAuth access token (via `lib/mollie-manage-token.ts`) rather than `MOLLIE_API_KEY`.
- [ ] A `applicationFee` field is included in every payment created via Mollie Connect, sourced from `MOLLIE_APPLICATION_FEE_AMOUNT` (env var, default `"1.00"`) and `MOLLIE_APPLICATION_FEE_CURRENCY` (default `"EUR"`).
- [ ] The application fee is capped at €2.00 as documented in ADR-020. If `MOLLIE_APPLICATION_FEE_AMOUNT` exceeds `"2.00"`, the route rejects at startup with a fatal config error.
- [ ] All three activation gates (OAuth connected, tokens stored, applicationFee configured and ≤ €2.00) are checked by a pre-flight function `validateTenantMollieConnect(tenantId)` that `POST /api/tenants/onboard` calls before issuing any authorization URL.

### ADR-020 decay signals — observable in this implementation

- [ ] The `applicationFee` cap check (above) is the programmatic enforcement of the "Mollie raises €2 cap" decay signal: if Mollie raises the cap and the platform wants to charge more, `MOLLIE_APPLICATION_FEE_AMOUNT` is updated and the cap constant in code is bumped in the same commit, which makes the change reviewable.
- [ ] The `validateTenantMollieConnect` preflight logs a warning if `PAYMENT_VENDOR` is not `mollie-connect` when a tenant payment is initiated — this surfaces the "Tenant #1 is non-EEA" decay signal (non-EEA tenants would need Stripe Connect instead, triggering an ADR-020 revisit).

---

## Implementation notes

- Mollie Connect OAuth documentation: https://docs.mollie.com/connect/overview. The Client Links API is an alternative for faster onboarding; evaluate at build time whether Client Links can replace the full OAuth dance for tenants who already have Mollie accounts.
- Token encryption: use `crypto.subtle` (Node.js built-in, no extra dependency) with AES-256-GCM. IV is 12 random bytes, prepended to the ciphertext before base64 encoding for storage.
- The `state` parameter in the OAuth flow must be unguessable (use `crypto.randomUUID()`), tied to `tenantId`, and expire after 10 minutes. Validate on callback; reject with HTTP 400 if expired or mismatched.
- Do not use `MOLLIE_API_KEY` in tenant flows. The platform's own Mollie account (used for direct donations) and tenant Mollie accounts (used via Connect) must never share credentials.
- `lib/mollie-manage-token.ts` already exists (per the memory files). Extend the existing file rather than creating a new one. Add the `'tenant-onboard'` scope as a new branch in the existing scope-routing logic.
- The `GET /api/tenants/onboard/callback` route must be listed in the Mollie Connect application's redirect URIs. Add `MOLLIE_CONNECT_REDIRECT_URI` as an env var so this is configurable per environment.

---

## Out of scope

- Tenant-facing onboarding UI (the routes above are admin-only for now; a self-serve tenant portal is a later milestone).
- Stripe Connect (explicitly deferred in ADR-020).
- Multi-currency application fees (EUR only for the initial tenant).
- Webhook handling for tenant-originated payments (a separate spec; this spec only covers the activation flow).
- Automated tenant offboarding / token revocation.
