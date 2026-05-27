# ADR-006: GA4 / GTM scripts loaded via `next/script beforeInteractive` for SSR detection

**Date**: 2026-03-09
**Status**: Superseded by [ADR-014](014-ga4-afterinteractive-supersedes-006.md) (2026-05-27)

## Context

Google Analytics 4 (measurement ID `G-Y946QDVVQV`) and GTM (`GTM-KR3CGLS6`) must be detected by Google's tag checker, which crawls the server-rendered HTML. The Next.js App Router renders layouts on the server; scripts added as raw `<script>` tags in `<head>` were not being included in the initial SSR payload in the way Google's checker expected.

Commit history shows three failed attempts (raw `<script>`, inline script component, revert) before settling on `next/script`.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| Raw `<script>` in `<head>` | Simplest | Google tag checker failed to detect them in SSR HTML (commits fb4ce93, 7fb9665) |
| Custom React component wrapping `<script>` | Componentised | Same SSR detection failure; caused duplicate code bug (19294a7) |
| **`next/script` with `strategy="beforeInteractive"`** | Next.js-native; properly included in SSR output; Google detects them | `beforeInteractive` blocks hydration — acceptable for analytics but adds minor TTFB overhead |
| `next/script afterInteractive` | Lighter page load | Not in SSR HTML — Google tag checker still misses it |

## Decision

**`next/script strategy="beforeInteractive"`** (`app/layout.tsx:84`, commit `e023fb0`).

Chosen because it's the only strategy that causes Next.js to include the script in the server-rendered HTML payload, satisfying Google's server-side tag detection. The hydration-blocking cost is accepted: GA4 + GTM are small, well-cached scripts.

## Consequences

**Positive**
- Google Analytics and GTM are detectable by server-side tag checkers and crawlers.
- Uses the official Next.js API; no custom serialisation.

**Negative / trade-offs**
- `beforeInteractive` delays page hydration by the script parse time (~2-5ms for GA4).
- Any future script added with `beforeInteractive` accumulates that cost — prefer `afterInteractive` or `lazyOnload` for non-analytics scripts.

## Revisit if

- Next.js changes how `beforeInteractive` affects SSR output
- Google's tag checker gains support for detecting `afterInteractive` scripts via alternative signals
