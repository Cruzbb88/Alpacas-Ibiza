/**
 * Recent-bookings social-proof data for the /tours page ticker.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO ADD ENTRIES (owner instructions)
 *
 * When FareHarbor API keys are configured (FAREHARBOR_APP_KEY +
 * FAREHARBOR_USER_KEY) the ticker will pull live bookings automatically and
 * this file is ignored.
 *
 * Until those keys are set, the ticker reads from the array below. Add real
 * booking entries here — one object per booking. Use first name only (privacy).
 * The ticker renders null when the array is empty, so the page looks fine before
 * you add anything.
 *
 * Schema — each entry:
 *   firstName  string   — guest first name, e.g. "Anna"
 *   city       string   — guest home city, e.g. "Amsterdam"
 *   tour       one of:  'meet-herd' | 'weaving-workshop' | 'farm-experience' | 'photo-session'
 *   daysAgo    number   — how many days ago the booking was made (1 = yesterday)
 *
 * Example entry (copy this block, remove "// " prefix, fill in real data):
 *
 *   {
 *     firstName: 'Anna',
 *     city: 'Amsterdam',
 *     tour: 'meet-herd',
 *     daysAgo: 1,
 *   },
 *
 * IMPORTANT — PRACTICES.md Rule 5: Never invent data. Only add entries for
 * actual bookings you have on record. The array starts empty on purpose.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type TourSlug = 'meet-herd' | 'weaving-workshop' | 'farm-experience' | 'photo-session'

export interface RecentBookingEntry {
  /** Guest first name. First name only — privacy. */
  firstName: string
  /** Guest home city. */
  city: string
  /** Which tour was booked. */
  tour: TourSlug
  /** Days since the booking was made. 1 = yesterday, 2 = two days ago, etc. */
  daysAgo: number
}

/**
 * Static pool of recent bookings shown in the /tours ticker before FareHarbor
 * keys are set. Starts empty per PRACTICES.md Rule 5 (never invent data).
 *
 * Owner: add real entries here following the schema above.
 */
export const recentBookings: RecentBookingEntry[] = [
  // OWNER_INPUT_NEEDED: add real booking entries here.
  // Example (uncomment and fill in):
  // {
  //   firstName: 'Anna',
  //   city: 'Amsterdam',
  //   tour: 'meet-herd',
  //   daysAgo: 1,
  // },
]

/** Returns true when there are entries to display. */
export function hasRecentBookings(): boolean {
  return recentBookings.length > 0
}
