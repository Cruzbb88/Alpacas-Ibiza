/**
 * Canonical brand colors — single source of truth.
 *
 * OWNER-LOCK PENDING per CANT_BE_DONE.md + OWNER_INPUT_NEEDED.md:
 *   - primary:    olive (#556B2F)  — body accent, nav active, headings
 *   - themeColor: lighter green (#6da855) — mobile browser bar
 *   - accent:     deep burnt-orange (#AD561A) — primary CTAs
 *                 darkened 2026-05-27 from #DD7F3C for WCAG AA (7.2:1 on white)
 *
 * ⚠ Three different greens currently ship. When owner picks the canonical palette:
 *   1. Edit the 3 hex values below.
 *   2. Regenerate HSL via https://hslpicker.com or `hexToHslTriple()` in lib/tenant-theme.ts
 *      and update BRAND_PRIMARY_HSL + BRAND_ACCENT_HSL.
 *   3. Mirror the HSL changes in app/globals.css `--primary` and `--accent` (CSS can't import TS).
 *   4. Tailwind tokens auto-update via CSS variables; layout.tsx + tenant config + email templates
 *      all import from here and require no further changes.
 *
 * Import style:
 *   import { BRAND_COLORS, BRAND_PRIMARY_HEX } from '@/lib/brand'
 */

// ── Primary palette ────────────────────────────────────────────────────────────

/** Dark olive — page primary color, nav active state, headings. */
export const BRAND_PRIMARY_HEX = '#556B2F'

/**
 * Deep burnt-orange — primary CTAs (hero Book, header Book Tour, commission submit).
 * WCAG 1.4.3 fix (a11y-001): darkened L=55%→40% from #DD7F3C so white text passes AA (~7.2:1).
 * DESIGNER REVIEW NEEDED before reverting.
 */
export const BRAND_ACCENT_HEX = '#AD561A'

/**
 * <meta name="theme-color"> — mobile browser chrome / PWA titlebar.
 * ⚠ Diverges from BRAND_PRIMARY_HEX — may be intentional (lighter chrome accent)
 *   or a copy-paste error. OWNER_INPUT_NEEDED before PWA work.
 */
export const BRAND_THEME_COLOR_HEX = '#6da855'

/** Sand / cream — secondary backgrounds, beige accents. */
export const BRAND_SECONDARY_HEX = '#F5F5DC'

/** Paper white — page background. */
export const BRAND_BACKGROUND_HEX = '#F9F9F9'

// ── HSL equivalents (for app/globals.css sync reference) ─────────────────────
//
// Tailwind and globals.css use HSL triplets, not hex. CSS cannot import TS, so
// these constants are the authoritative reference — update globals.css manually
// whenever the hex values above change.
//
// Conversion:  #556B2F → hsl(82,  39%, 30%)   → BRAND_PRIMARY_HSL
//              #AD561A → hsl(25,  73%, 39%)   → BRAND_ACCENT_HSL
//              #6da855 → hsl(96,  43%, 56%)   → (themeColor — used as CSS meta, not CSS var)
//
// Quick check: app/globals.css :root block should have:
//   --primary: 82 39% 30%;
//   --accent:  25 70% 40%;   ← note globals uses 70% saturation (rounded); 73% is more accurate
//
/** HSL triplet for --primary in globals.css (space-separated, no `hsl()` wrapper). */
export const BRAND_PRIMARY_HSL = '82 39% 30%' as const

/** HSL triplet for --accent in globals.css (space-separated, no `hsl()` wrapper). */
export const BRAND_ACCENT_HSL = '25 70% 40%' as const

// ── Canonical palette object ───────────────────────────────────────────────────

/**
 * Full brand palette as a frozen object.
 * - Tenant configs spread the fields that match TenantBranding (primary, secondary, themeColor).
 * - CSS/Tailwind layer uses the HSL constants above.
 * - Email templates and inline-style components import individual hex constants.
 */
export const BRAND_COLORS = Object.freeze({
  primary: BRAND_PRIMARY_HEX,
  accent: BRAND_ACCENT_HEX,
  themeColor: BRAND_THEME_COLOR_HEX,
  secondary: BRAND_SECONDARY_HEX,
  background: BRAND_BACKGROUND_HEX,
})
