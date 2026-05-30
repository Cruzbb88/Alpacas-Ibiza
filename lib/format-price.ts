/**
 * Locale-aware EUR price formatting. Uses Intl.NumberFormat so 'es' sees "75 €",
 * 'en' (→ en-GB) sees "€75.00", 'de' sees "75,00 €" — each locale's native convention.
 *
 * Pure function — no React, no client-only globals.
 *
 * `en` is mapped to `en-GB` so British English puts the symbol before the amount
 * (€75.00) rather than appending it — the correct convention for a euro-denominated
 * amount shown to an English-speaking international visitor.
 */

/** Map our 2-letter route locale to the BCP-47 tag Intl.NumberFormat needs. */
function bcp47(locale: string): string {
  return locale === 'en' ? 'en-GB' : locale
}

/**
 * Canonical formatter — use this everywhere a price is shown to the user.
 *
 * @param eurAmount  Amount in EUR (e.g. 75, 900)
 * @param locale     Route locale ('en' | 'de' | 'es' | 'nl' | 'it' | 'fr')
 * @returns          Locale-native string, e.g. "€75.00" (en-GB), "75,00 €" (de), "75 €" (es)
 */
export function formatPriceForLocale(eurAmount: number, locale: string): string {
  try {
    return new Intl.NumberFormat(bcp47(locale), {
      style: 'currency',
      currency: 'EUR',
      // Whole euros render as "€75" not "€75.00"; fractional amounts keep
      // their cents. Matches the prior formatPrice() default behaviour.
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(eurAmount)
  } catch {
    return `€${eurAmount}`
  }
}

/**
 * Lower-level formatter — accepts fraction-digit overrides.
 * For most UI use prefer `formatPriceForLocale`.
 */
export function formatPrice(
  amountEur: number,
  locale: string = 'en',
  opts?: { maximumFractionDigits?: number; minimumFractionDigits?: number },
): string {
  try {
    return new Intl.NumberFormat(bcp47(locale), {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: opts?.minimumFractionDigits ?? 0,
      maximumFractionDigits: opts?.maximumFractionDigits ?? opts?.minimumFractionDigits ?? 0,
    }).format(amountEur)
  } catch {
    return `€${amountEur}`
  }
}
