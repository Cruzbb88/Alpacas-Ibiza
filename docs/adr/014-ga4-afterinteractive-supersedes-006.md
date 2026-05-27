# ADR-014: GA4 / GTM demoted to `afterInteractive` — supersedes ADR-006

**Date**: 2026-05-27
**Status**: Accepted

## Context

ADR-006 (2026-03-09) chose `strategy="beforeInteractive"` for GA4 and GTM because Google's server-side tag checker required the scripts to be present in the SSR HTML payload. The `afterInteractive` option was explicitly rejected at that time.

During the 2026-05-26 performance-optimization session (report: `reports/performance-optimizer/po-001-2026-05-26-alpaca-farm-critical-path.md`), measurement showed the three `beforeInteractive` scripts were adding ~400–600 ms to FCP on P75 mobile. The performance cost was deemed to outweigh the SSR tag-detection benefit.

The implementation in `app/layout.tsx` (commit context: performance-optimizer session) moved GA4 (`G-Y946QDVVQV`) and GTM (`GTM-KR3CGLS6`) to `strategy="afterInteractive"`. The GDPR Consent Mode v2 stub (`id="consent-default"`) was intentionally kept on `beforeInteractive` — it must precede all analytics events and is a small inline snippet (~350 bytes), so the hydration cost is negligible.

## Decision

**`next/script strategy="afterInteractive"`** for GA4 gtag.js and GTM; **`strategy="beforeInteractive"`** retained only for the consent-default inline stub.

FCP improvement justifies losing server-side tag-checker detection. Google's tag validation tooling has improved since 2026-03-09 and can now detect async-loaded tags via alternative signals (GTM Preview mode, Real-Time reports). If server-side detection is required in future, the consent stub pattern (small synchronous inline) can be extended without reverting to blocking remote script loads.

## Consequences

**Positive**
- ~400–600 ms FCP improvement on P75 mobile (per po-001 measurement).
- Unblocks nonce-based CSP migration path referenced in ADR-010, as the primary `beforeInteractive` blocker is resolved.

**Negative / trade-offs**
- GA4 and GTM scripts are no longer in the initial SSR HTML. Server-side tag checkers may report them as missing until they re-test with a JavaScript-capable crawler.
- GTM Preview mode must be validated in a Vercel preview environment before assuming full parity.

## Revisit if

- GTM Preview mode or Google Tag Assistant confirms tags are undetectable in the `afterInteractive` position.
- A regression in consent-mode ordering is observed (analytics firing before consent is established).

## Supersedes

ADR-006 — GA4 `beforeInteractive` for SSR detection.
