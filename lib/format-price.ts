/**
 * Locale-aware EUR price formatting. Uses Intl.NumberFormat so 'es' sees "30 €",
 * 'en' sees "€30.00", 'de' sees "30,00 €" — each locale's native convention.
 *
 * Pure function — no React, no client-only globals.
 */

export function formatPrice(
  amountEur: number,
  locale: string = 'en',
  opts?: { maximumFractionDigits?: number; minimumFractionDigits?: number },
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: opts?.minimumFractionDigits ?? 0,
      maximumFractionDigits: opts?.maximumFractionDigits ?? opts?.minimumFractionDigits ?? 0,
    }).format(amountEur)
  } catch {
    // Locale not supported by ICU on this runtime — fall back to a fixed format
    return `€${amountEur}`
  }
}
