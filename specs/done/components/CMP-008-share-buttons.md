---
id: "CMP-008"
title: "ShareButtons — journal article share strip"
status: done (backfilled)
captured: 2026-05-27
---

## Purpose
Horizontal share strip for journal articles; four targets: copy-link, WhatsApp, X/Twitter, Facebook.

## Props
```ts
interface ShareButtonsProps {
  readonly url: string       // absolute URL
  readonly title: string     // article title
  readonly excerpt?: string  // kept for future use
  readonly labels?: {
    share?: string; copyLink?: string; copied?: string
    whatsapp?: string; twitter?: string; facebook?: string
  }
}
```

## Consumers
- `app/[locale]/journal/[slug]/page.tsx`
- `components/adopt-thank-you.tsx`

## Failsafe behavior
Copy failure (clipboard API absent or permission denied) is swallowed silently — no toast, no throw. No external APIs; no env vars required. `data-no-print` attribute hides strip when page is printed.

## Acceptance criteria
- [ ] Copy button: shows "Copied!" for 2 s then reverts; fails silently on error
- [ ] WhatsApp / X / Facebook links open `target="_blank" rel="noopener noreferrer"`
- [ ] All buttons have `aria-label` (accessible)
- [ ] Strip hidden from print via `data-no-print`

## Owner-input dependencies
None — fully self-contained; caller supplies `url` and `title`.

**Backfill note.** Spec written 2026-05-27 after component shipped. Component is in production. Spec captures behavior as-built.
