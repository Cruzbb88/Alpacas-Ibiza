/**
 * Pure date-formatting helpers for booking slots.
 *
 * Tour slots are stored as UTC `Date` (timestamptz). The farm is in Ibiza =
 * `Europe/Madrid`. The cb-006 pre-mortem (F4) flags timezone/DST as a real
 * failure mode: a 10:00 local tour must show as 10:00 local on BOTH sides of
 * the Mar/Oct DST change, even though its UTC offset differs (+02:00 summer,
 * +01:00 winter).
 *
 * RULE: never do manual offset math. Always rely on `Intl.DateTimeFormat`
 * with an explicit `timeZone: 'Europe/Madrid'` so the runtime's tz database
 * applies the correct DST rules for the given instant.
 *
 * Pure: no DB, no network, no module-level mutable state.
 */

export const FARM_TIME_ZONE = 'Europe/Madrid' as const

export interface FormattedSlot {
  /** e.g. "Mon 6 Jul 2026" — date in Europe/Madrid */
  date: string
  /** e.g. "10:00" — wall-clock time in Europe/Madrid (24h) */
  time: string
  /** the original UTC instant, `.toISOString()` */
  iso: string
}

export interface FormatSlotOptions {
  /** BCP-47 locale tag for the date string. Defaults to 'en-GB'. */
  locale?: string
}

/**
 * Format a UTC instant as it would appear on the wall clock in Ibiza
 * (Europe/Madrid), honouring DST automatically.
 */
export function formatSlotLocal(
  startsAtUtc: Date,
  opts?: FormatSlotOptions,
): FormattedSlot {
  const locale = opts?.locale ?? 'en-GB'

  const dateFmt = new Intl.DateTimeFormat(locale, {
    timeZone: FARM_TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  // Time is always rendered 24h in en-GB so it is stable regardless of the
  // caller's display locale — booking times must be unambiguous.
  const timeFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: FARM_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  return {
    date: dateFmt.format(startsAtUtc),
    time: timeFmt.format(startsAtUtc),
    iso: startsAtUtc.toISOString(),
  }
}

/**
 * The Europe/Madrid UTC offset, in minutes, at the given instant.
 *
 * Derived via `Intl` (NOT hardcoded) so DST transitions are reflected:
 * +120 in summer (CEST, UTC+02:00), +60 in winter (CET, UTC+01:00).
 *
 * Mechanism: format the same instant in UTC and in Europe/Madrid using
 * Intl's `formatToParts`, reconstruct each as a "wall clock" timestamp via
 * `Date.UTC`, and take the difference. This avoids parsing tz-name strings.
 */
export function madridOffsetMinutes(at: Date): number {
  const utcMs = wallClockUtcMs(at, 'UTC')
  const madridMs = wallClockUtcMs(at, FARM_TIME_ZONE)
  return Math.round((madridMs - utcMs) / 60_000)
}

/**
 * Render `at` as wall-clock parts in `timeZone`, then re-interpret those parts
 * as a UTC timestamp. The gap between this and the same trick for 'UTC' is the
 * zone's offset.
 */
function wallClockUtcMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }).formatToParts(at)

  const get = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((p) => p.type === type)
    if (!part) {
      throw new Error(`missing date part: ${type}`)
    }
    return Number(part.value)
  }

  // Intl renders midnight as hour 24 in some engines; normalise to 0.
  const hour = get('hour') % 24

  return Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    hour,
    get('minute'),
    get('second'),
  )
}
