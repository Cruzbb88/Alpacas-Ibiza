# ADR-007: Admin login fail-closed when ADMIN_USERNAME / ADMIN_PASSWORD unset

**Date**: 2026-05-26
**Status**: Accepted

## Context

The admin section (`/admin`) is protected by NextAuth credentials provider. The credentials are read from `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars. If those vars are unset (misconfigured deploy, missing `.env.local`), the question is: should `authorize()` fall back to a default password, throw, or return `null`?

This is the same class of question as ADR-003 (webhook fail-closed), applied to the auth layer.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| Default hardcoded credentials | Dev works without env setup | Catastrophic: shipped default = permanent backdoor |
| Throw / crash on startup | Loud failure | Crashes the whole Next.js server; unavailability is worse than a locked admin |
| **Return `null` + `console.error`** | Admin simply cannot log in; rest of site unaffected; misconfiguration is logged | Admin is inaccessible until vars are set — intentional |

## Decision

**`authorize()` returns `null` with `console.error` when either var is unset** (`app/api/auth/[...nextauth]/route.ts:13-19`).

No default credentials under any circumstances. The log line makes the misconfiguration immediately visible in server logs. Returning `null` locks the admin route without crashing the public site.

Additional hardening: JWT `session.maxAge` is set to 8h (overrides NextAuth's 30-day default) to limit session exposure.

## Consequences

**Positive**
- No default credentials can leak into production.
- Public site remains live when admin env vars are missing.
- Misconfiguration is visible (console.error, not silent).

**Negative / trade-offs**
- Dev must set `ADMIN_USERNAME` + `ADMIN_PASSWORD` in `.env.local` to access admin locally — small friction.
- Both vars are Tier 1 (CLAUDE.md must-set list) so this is expected.

## Revisit if

- A proper auth provider (Auth0, Clerk) replaces the credentials provider — at that point these vars become irrelevant
- Admin requires MFA or role-based access beyond a single credential pair
