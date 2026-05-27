/**
 * Per-tenant CSS variable injection.
 *
 * Usage in app/[locale]/layout.tsx (server component — Wave B):
 *   const tenant = await getTenant()
 *   const cssVars = buildCssVars(tenant.brandColors)
 *   return <html style={cssVars}>...</html>
 *
 * The CSS variables consumed by the codebase are:
 *   --primary, --secondary, --ring  (HSL triples matching globals.css format)
 *
 * globals.css uses bare HSL triples — e.g. `--primary: 82 39% 30%` — and
 * tailwind.config.ts wraps them as `hsl(var(--primary))`. We emit the same
 * triple format so the existing token layer is not broken.
 *
 * Failsafe: if a brand color is invalid hex, the alpacasibiza defaults are
 * used for that slot and a console.warn is emitted.
 *
 * Does NOT touch tailwind.config.ts — forbidden in the prompt spec.
 * Does NOT add color tokens beyond TenantBranding fields.
 */

import type { CSSProperties } from 'react'
import type { TenantBranding } from './_types'

// ── Alpacas Ibiza defaults (used as fallback for invalid hex) ─────────────────
// Derived from globals.css :root block — `--primary: 82 39% 30%` etc.
const ALPACA_DEFAULTS = {
  primary: '82 39% 30%',
  secondary: '60 30% 90%',
  themeColor: '96 43% 56%', // #6da855 → hsl(96, 43%, 56%) approx
} as const

// ── Hex validation ────────────────────────────────────────────────────────────
const HEX_RE = /^#[0-9a-f]{3,8}$/i

export function isValidHex(value: string): boolean {
  return HEX_RE.test(value)
}

// ── Hex → HSL conversion ──────────────────────────────────────────────────────

/** Expand a 3-digit hex to 6-digit. `#abc` → `#aabbcc`. */
function expand3(hex: string): string {
  const r = hex[1], g = hex[2], b = hex[3]
  return `#${r}${r}${g}${g}${b}${b}`
}

/**
 * Convert a hex color string to an HSL triple string `"H S% L%"` matching the
 * format used in globals.css (bare triple, no `hsl()` wrapper).
 *
 * Supports 3-digit and 6-digit hex. 4/8-digit (with alpha) uses only the first
 * 3 channels and ignores alpha.
 */
export function hexToHslTriple(hex: string): string {
  // Normalize to 6+ digits
  const h = hex.length === 4 || hex.length === 5 ? expand3(hex) : hex

  const r = parseInt(h.slice(1, 3), 16) / 255
  const g = parseInt(h.slice(3, 5), 16) / 255
  const b = parseInt(h.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  // Lightness
  const l = (max + min) / 2

  let s = 0
  let hDeg = 0

  if (delta !== 0) {
    // Saturation
    s = delta / (1 - Math.abs(2 * l - 1))

    // Hue
    if (max === r) {
      hDeg = 60 * (((g - b) / delta) % 6)
    } else if (max === g) {
      hDeg = 60 * ((b - r) / delta + 2)
    } else {
      hDeg = 60 * ((r - g) / delta + 4)
    }
    if (hDeg < 0) hDeg += 360
  }

  const hRounded = Math.round(hDeg)
  const sRounded = Math.round(s * 100)
  const lRounded = Math.round(l * 100)

  return `${hRounded} ${sRounded}% ${lRounded}%`
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Build a CSS-variables map from a tenant's brand colors.
 *
 * Returns a React.CSSProperties object ready to spread onto `<html style={…}>`.
 * Variables emitted: --primary, --secondary, --ring (themeColor maps to ring).
 *
 * Invalid hex values fall back to the alpacasibiza defaults and emit a warning.
 */
export function buildCssVars(brandColors: TenantBranding): CSSProperties {
  const slots = [
    { key: '--primary',   hex: brandColors.primary,    fallback: ALPACA_DEFAULTS.primary    },
    { key: '--secondary', hex: brandColors.secondary,  fallback: ALPACA_DEFAULTS.secondary  },
    { key: '--ring',      hex: brandColors.themeColor, fallback: ALPACA_DEFAULTS.themeColor },
  ] as const

  const vars: Record<string, string> = {}

  for (const { key, hex, fallback } of slots) {
    if (isValidHex(hex)) {
      vars[key] = hexToHslTriple(hex)
    } else {
      console.warn(
        `[buildCssVars] Invalid hex "${hex}" for ${key}. Falling back to alpacasibiza default.`,
      )
      vars[key] = fallback
    }
  }

  // Cast: React.CSSProperties allows arbitrary CSS custom properties via index sig
  return vars as CSSProperties
}
