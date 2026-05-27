# ADR-002: Turnstile asymmetric fail mode (open in dev, closed in prod on network error)

**Date**: 2026-04-20
**Status**: Accepted

## Context

Cloudflare Turnstile token verification is a server-side call to `challenges.cloudflare.com`. Two distinct failure scenarios exist:

1. `TURNSTILE_SECRET_KEY` not set at all (unconfigured environment)
2. Secret is set, token is present, but the Cloudflare verify call throws (transient network error)

These need different handling: during local dev a missing key or a brief Cloudflare outage must not block all form submissions.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| Always fail-closed | Maximally secure | Breaks local dev; Cloudflare hiccup = all forms dead in prod |
| Always fail-open | Never blocks dev | Accepts spam if Cloudflare goes down in prod |
| **Asymmetric: open when unconfigured; closed on network error in prod only** | Dev works; prod only fails open when key is genuinely absent (a visible misconfiguration, not a transient outage) | Slightly complex branching logic |

## Decision

**Asymmetric fail mode** (`lib/turnstile.ts:27-54`):

- Key unset → `{ok:true}` in all envs + `console.warn` in production (visible misconfiguration, not a silent gap).
- Key set, network error → fail-open in dev, **fail-closed** in production (`{ok:false, reason:'verify_network_error'}`).

The split means: unconfigured = intentional dev/preview state (fail open); configured-but-broken = unexpected outage (prod must protect).

## Consequences

**Positive**
- Local dev and preview deploys work without Cloudflare credentials.
- Production is protected against transient Cloudflare outages eating form submissions.
- Misconfiguration is loud (`console.warn`) not silent.

**Negative / trade-offs**
- Transient prod network errors reject valid submissions. Submitters must retry.
- Logic is non-obvious; the asymmetry must stay documented here and in CLAUDE.md failsafe map.

## Revisit if

- Cloudflare Turnstile SLA drops and false-positive rate becomes user-visible
- A request-retry mechanism is added to the form (would reduce cost of fail-closed)
