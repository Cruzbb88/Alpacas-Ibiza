/**
 * Helpers for /api/adopt-quarterly-update.
 *
 * Extracted to a separate module so node:test (which globs lib/*.test.ts only)
 * can pin the quarter-label derivation contract independently of the route
 * handler. The route imports `getQuarterLabel` from here.
 *
 * Quarter mapping (UTC-based — cron fires at 09:00 UTC):
 *   Jan–Mar = Q1
 *   Apr–Jun = Q2
 *   Jul–Sep = Q3
 *   Oct–Dec = Q4
 *
 * Format: `Q{n} YYYY` (e.g. "Q1 2026"). Year is the UTC year of the input date.
 */

/**
 * Derive a "Q{n} YYYY" label from a UTC date.
 *
 * Uses getUTCMonth() (0-based, 0=Jan … 11=Dec) so the cron's 09:00 UTC fire
 * time at the very start of a quarter still lands inside that quarter
 * regardless of the runner's local timezone.
 */
export function getQuarterLabel(date: Date): string {
    const month = date.getUTCMonth() // 0=Jan … 11=Dec
    const year = date.getUTCFullYear()
    // Math.floor((0..2)/3)=0 → Q1, (3..5)/3=1 → Q2, etc.
    const quarter = Math.floor(month / 3) + 1
    return `Q${quarter} ${year}`
}
