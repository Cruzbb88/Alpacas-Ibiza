/**
 * Donor anniversary milestone helpers.
 *
 * Memberful, Substack, and Patreon all fire automated milestone touchpoints
 * (30-day, 6-month, 1-year, 2-year). Substack-published case studies show a
 * 15–25% retention bump per milestone email. This module exposes pure helpers
 * the `/api/adopt-milestone-emails` daily cron uses to decide which
 * milestone — if any — a given Mollie subscription crossed TODAY.
 *
 * Rules of the road:
 *   - "Today" is a UTC date. We compare year + month + day in UTC so the
 *     cron firing at 10:00 UTC always agrees on "today" regardless of the
 *     server clock's local timezone interpretation.
 *   - A milestone fires the day the donor crosses N days since createdAt
 *     INCLUSIVE of the createdAt UTC date. Crossing the boundary is "the
 *     UTC date of (createdAt + N days) === the UTC date of now".
 *   - We do NOT interpolate fractional days — sub-day clock drift never
 *     causes a milestone to "skip a day"; the integer-day boundary check
 *     absorbs DST and leap-second wobble entirely.
 *   - The function returns AT MOST ONE milestone per call. Two donors who
 *     adopted on the same day will both fire the same milestone today; no
 *     donor will ever fire two milestones on the same day (the milestones
 *     are 30 / 180 / 365 / 730 — non-overlapping).
 *
 * Pure: no I/O, no env reads, no side effects. Node:test covers DST shifts,
 * leap years, and boundary fenceposts.
 */

export type MilestoneDays = 30 | 180 | 365 | 730

/**
 * Canonical milestone day-counts. Order matters: the cron checks them in
 * this order and stops at the first match, so the smallest milestone is
 * first (cosmetic — the four values are non-overlapping anyway).
 */
export function getMilestoneDays(): number[] {
  return [30, 180, 365, 730]
}

/**
 * Returns the milestone hit TODAY (where today = same UTC calendar date
 * as `now`) for a subscription that started at `createdAt`, else null.
 *
 * Today means: floor(now, UTC-day) === floor(createdAt + N days, UTC-day).
 *
 * Why UTC-day boundary (not >= comparison):
 *   - Vercel cron runs once per day at 10:00 UTC. Any donor whose
 *     createdAt + N days lands TODAY (UTC) should fire today.
 *   - If we used >= we'd fire EVERY subsequent day too, spamming donors
 *     for the rest of their life. Idempotency on top would mask this in
 *     prod but the helper itself must encode "today only".
 *
 * Why we don't add Date arithmetic via getUTCFullYear/etc:
 *   - Adding 30 days to a Date object via setUTCDate auto-handles month
 *     and year rollover. Adding 365 days correctly lands one calendar day
 *     EARLIER on a year that contains a leap day between createdAt and
 *     now — that's intentional: "365 days" means 365 actual days, not
 *     "one calendar year." A donor who joined 2024-03-01 hits day 365 on
 *     2025-02-28 (because 2024 is a leap year), not 2025-03-01. The
 *     anniversary-vs-rolling-days distinction is documented for support.
 */
export function getDonorMilestone(
  createdAt: Date,
  now: Date,
): MilestoneDays | null {
  if (!(createdAt instanceof Date) || Number.isNaN(createdAt.getTime())) return null
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) return null

  // createdAt cannot be in the future relative to now — if the cron sees
  // an upcoming subscription (clock skew, test data), no milestone fires.
  if (createdAt.getTime() > now.getTime()) return null

  const nowUtcDay = utcDayKey(now)

  for (const days of getMilestoneDays() as MilestoneDays[]) {
    const milestoneDate = new Date(
      Date.UTC(
        createdAt.getUTCFullYear(),
        createdAt.getUTCMonth(),
        createdAt.getUTCDate() + days,
      ),
    )
    if (utcDayKey(milestoneDate) === nowUtcDay) return days
  }
  return null
}

/**
 * Human-readable label for the milestone, suitable for subject lines and
 * body copy. Lowercase phrase form — caller capitalises if needed.
 *
 *   30  → "first month"
 *   180 → "six-month"
 *   365 → "one-year"
 *   730 → "two-year"
 */
export function getMilestoneLabel(days: MilestoneDays): string {
  switch (days) {
    case 30:
      return 'first month'
    case 180:
      return 'six-month'
    case 365:
      return 'one-year'
    case 730:
      return 'two-year'
  }
}

/** YYYY-MM-DD in UTC. Internal — exported only for the test file. */
export function utcDayKey(d: Date): string {
  const y = d.getUTCFullYear().toString().padStart(4, '0')
  const m = (d.getUTCMonth() + 1).toString().padStart(2, '0')
  const day = d.getUTCDate().toString().padStart(2, '0')
  return `${y}-${m}-${day}`
}
