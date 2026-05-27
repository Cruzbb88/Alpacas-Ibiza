# ADR 010 — CSP Report-Only (not enforcing) while GTM inline scripts remain

**Status:** Accepted · 2026-05-27
**Supersedes:** none
**Superseded by:** none

## Context

Production-Next.js sites typically ship an enforcing `Content-Security-Policy` header to defend against XSS, clickjacking, and tag injection. The Next.js production checklist names this as a step-1 item.

This site has three inline-script realities that complicate a strict CSP:

1. **GA4 + GTM** load via inline `<Script>` blocks in [app/[locale]/layout.tsx](../../app/%5Blocale%5D/layout.tsx) — required by ADR-006 (`beforeInteractive` strategy chosen after 3 failed approaches). These cannot be moved to external `src=` without changing detection behavior in GTM Preview mode.
2. **Cloudflare Turnstile** injects an inline render call.
3. **FareHarbor lightframe** uses inline `data-` attributes that some CSP linters flag.

A naive enforcing CSP with `script-src 'self'` instantly breaks all three.

The nonce-based migration path (per-request `nonce` generated in middleware, passed to `<Script nonce={...}>`) is architecturally **incompatible with ADR-006's `beforeInteractive` requirement** — `beforeInteractive` scripts run before client middleware can read the nonce in the React tree, so nonces would either be missing or stale.

## Decision

Ship `Content-Security-Policy-Report-Only` (browser logs violations to console + report-uri without blocking) with a permissive-but-honest policy:

- `script-src 'self' 'unsafe-inline' 'unsafe-eval' <gtm/ga4/fareharbor/turnstile origins>`
- `style-src 'self' 'unsafe-inline'`
- All other directives tight (`frame-ancestors 'self'`, `base-uri 'self'`, etc.)

Pair Report-Only with **enforcing** versions of the unambiguous headers:
- HSTS `max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN` (FareHarbor is same-origin iframe, so SAMEORIGIN not DENY)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`

Implementation: `next.config.mjs` `headers()` returns these for `/(.*)`.

## Consequences

**Positive:**
- Browser reports CSP violations without breaking the live site.
- Defense-in-depth on the other 5 headers (clickjacking, MIME-sniffing, sensor APIs).
- Future migration path is preserved if ADR-006 is re-litigated.

**Negative / Trade-offs:**
- `'unsafe-inline'` + `'unsafe-eval'` on `script-src` provides no XSS protection. The other 4 headers + Turnstile + `escapeHtml()` are the real defenses, not the CSP.
- Enforcing migration is **gated on ADR-006**. Anyone proposing nonce-CSP must first re-validate or replace ADR-006's `beforeInteractive` choice.

## Upgrade triggers (when to revisit)

- ADR-006 changes (GA4 loads via different strategy).
- An XSS incident proves the CSP-RO logged a violation that would have stopped it → flip to enforcing for the specific directive that caught it.
- GTM/GA4 adopts SRI + integrity attributes that allow strict CSP.

## Verifying the decision

`curl -I https://<deploy-url>/` and inspect headers. `Content-Security-Policy-Report-Only` must list `connect-src ... https://www.googletagmanager.com ...` (added 2026-05-27 — was missing).

## References

- [Next.js CSP guide](https://nextjs.org/docs/pages/guides/content-security-policy)
- [MDN: Content-Security-Policy-Report-Only](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy-Report-Only)
- ADR 006 — GA4 `beforeInteractive` SSR
