# Image Asset Audit — alpaca-farm-redesign

**Date:** 2026-05-30
**Tool:** automated glob + size scan of `public/**`

---

## Summary

The `public/` directory contains **no real media assets yet** — only two placeholder SVGs
and a set of empty `.gitkeep` scaffold folders. All production images/videos are
**owner-supplied drops** that have not been delivered. No files exceed any size threshold
at this moment, but the thresholds and requirements below must be enforced **before launch**
when real assets are added.

---

## Files Found in `public/`

| File | Size (bytes) | Type | Status |
|------|-------------|------|--------|
| `public/placeholder.svg` | 3,253 | SVG | OK — well under 50 KB limit |
| `public/placeholder-logo.svg` | 3,208 | SVG | OK — well under 50 KB limit |
| `public/sw.js` | 3,696 | Service Worker | Not a media asset |
| `public/humans.txt` | 556 | Text | Not a media asset |
| `public/images/heroes/.gitkeep` | 319 | Scaffold | Awaiting owner drops |
| `public/images/alpacas/.gitkeep` | 265 | Scaffold | Awaiting owner drops |
| `public/images/press/.gitkeep` | 251 | Scaffold | Awaiting owner drops |
| `public/images/awards/.gitkeep` | 0 | Scaffold | Awaiting owner drops |
| `public/images/og/.gitkeep` | 0 | Scaffold | Awaiting owner drops |
| `public/images/gallery/.gitkeep` | 0 | Scaffold | Awaiting owner drops |
| `public/images/journal/.gitkeep` | 0 | Scaffold | Awaiting owner drops |
| `public/press/.gitkeep` | 392 | Scaffold | Awaiting owner drops |

**Current flags: NONE** — no thresholds breached yet.

---

## Thresholds to Enforce When Real Assets Arrive

| Rule | Threshold | Action Required |
|------|-----------|-----------------|
| Image > 500 KB | WARNING | Convert to WebP/AVIF, cap export width at 1920 px |
| Image > 1 MB | CRITICAL | Will blow LCP budget on hotel WiFi — must fix before go-live |
| Video > 5 MB without poster | WARNING | Add a `poster` attribute with a matching `.webp` still frame |
| SVG > 50 KB | WARNING | Run through SVGO (`npx svgo <file>`) before committing |

---

## Expected Asset Drops (from codebase scan)

The following paths are referenced in `app/`, `components/`, and `lib/` but **do not exist**
in `public/` yet. All are marked UNMAPPED/OWNER_INPUT_NEEDED in the source files.
They are listed here so the owner knows exactly what to supply.

### Hero images — `public/images/heroes/`
Referenced from `components/layout/gradient-page-hero.tsx` and individual page files.
| Expected file | Referenced in |
|---------------|--------------|
| `yoga.webp` | `app/[locale]/yoga/page.tsx` |
| `corporate-hero.webp` | `app/[locale]/experiences/corporate-team-building/page.tsx` |
| `family-hero.webp` | `app/[locale]/experiences/family-farm-days/page.tsx` |
| `<route>.webp` (generic) | Any page using `<GradientPageHero backgroundImage=...>` |
| Wedding/photoshoot hero | `app/[locale]/weddings/page.tsx` (OWNER_INPUT_NEEDED comment) |

### Alpaca photos — `public/images/alpacas/`
Naming: `<id>.webp` where `id` matches each entry in `lib/tenants/alpacasibiza-content.ts`.

### Press logos — `public/images/press/`
Naming: `<id>.svg` or `<id>.png` matching entries in `lib/data/press.ts`.

### Award logos — `public/images/awards/`
Naming: `<id>.svg` or `<id>.png` matching entries in `lib/data/awards.ts`.
Example referenced: `tripadvisor-tc.svg`, `tripadvisor-travelers-choice.svg`.

### OG (Open Graph) images — `public/images/og/`
`lib/og-images.ts` expects `<slug>.webp` at 1200×630 px.
Tenant config (`lib/tenants/alpacasibiza.ts`) references `/images/og-default.webp`.

### Gallery photos — `public/images/gallery/`
Managed via `lib/data/media.ts`. Example path: `/images/gallery/farm-morning-01.webp`.

### Journal / blog hero images — `public/images/journal/`
Managed via `lib/data/journal.ts` and `lib/data/journal-posts.ts`. Example: `/images/journal/shearing-day-2025.webp`.

### Logo — `public/images/logo.webp`
Referenced in `app/[locale]/journal/[slug]/page.tsx` (JSON-LD) and `lib/tenants/alpacasibiza.ts`.

### Inline family-days images (non-hero)
These paths are hardcoded in `app/[locale]/experiences/family-farm-days/page.tsx`:
- `/images/kids-feeding-alpacas.webp`
- `/images/family-alpaca-walk.webp`
- `/images/family-kids-petting.webp`
- `/images/family-feeding-time.webp`
- `/images/family-farm-landscape.webp`
- `/images/family-alpacas-hero.webp`

### Inline corporate-team images
Hardcoded in `app/[locale]/experiences/corporate-team-building/page.tsx`:
- `/images/corporate-team-alpacas.webp`
- `/images/corporate-weaving-workshop.webp`

---

## Placeholder SVG Usage

Both `public/placeholder.svg` and `public/placeholder-logo.svg` are **actively used** in production:

| File | Used in |
|------|---------|
| `placeholder.svg` | `lib/structured-data.ts` (JSON-LD image fields, 2 places) |
| `placeholder-logo.svg` | `lib/structured-data.ts` (JSON-LD logo field) |

These are intentional temporary stand-ins. Replace with real brand assets before launch.
Both files are well within the 50 KB SVG threshold (3.2 KB each), but run through SVGO
after any edits to keep them tight.

---

## Potentially Unused Assets

None detected — every file in `public/` (the two SVGs) is actively referenced in code.

---

## Recommendations (Standard Best Practice)

1. **Format:** Supply all photos as WebP. AVIF is acceptable for static hero images where
   you control the crop (wider browser support threshold than AVIF for gallery components).
2. **Max dimension:** Export at max 1920 px wide. Next.js `<Image>` will generate responsive
   srcsets automatically from that source.
3. **Hero images:** Target 100–300 KB per hero WebP at quality 80. Anything above 500 KB
   is a WARNING; above 1 MB is a hard blocker for hotel-WiFi LCP.
4. **Alpaca portraits:** Target 40–100 KB per card image (typically 400–600 px wide crop).
5. **Press/award logos:** Deliver as SVG where possible. If SVG is unavailable use 2x PNG
   at the rendered display size. Run all SVGs through `npx svgo` before committing.
6. **OG images:** 1200×630 px WebP, ~100–200 KB. One per route that has unique social sharing.
7. **Video (if added later):** Supply an MP4 with H.264 + AAC. Always include a `poster`
   attribute pointing at a WebP still. Keep clips under 5 MB or host externally (Cloudinary,
   Mux, etc.) and stream rather than serving from `public/`.
8. **Re-run this audit** after the owner supplies real assets by globbing `public/**` and
   checking sizes against the thresholds in the table above.
