/**
 * Newsletter issue archive for Alpacas Ibiza.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO ADD AN ISSUE — single-file edit:
 *
 *   Add one entry to the `newsletterIssues` array below with status: 'live':
 *
 *     {
 *       slug: 'spring-2026',
 *       publishedAt: '2026-04-01',
 *       title: 'Spring at Es Currals',
 *       summary: 'First shearing of the season, new arrivals in the paddock...',
 *       status: 'live',
 *     },
 *
 *   No other file needs touching. The archive page at /newsletter/archive
 *   will automatically show the new issue (sorted newest-first).
 *
 * UNMAPPED — no issues invented. Every entry must be owner-supplied.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface NewsletterIssue {
  slug: string
  publishedAt: string  // ISO date e.g. '2026-04-01'
  title: string
  summary: string      // 1-3 sentences shown on the archive listing
  status: 'live' | 'draft'
}

/**
 * Owner adds entries here when each issue is ready to publish publicly.
 * Empty until owner populates — archive page shows "First issue coming soon" empty state.
 */
export const newsletterIssues: NewsletterIssue[] = []

/** Returns live issues sorted newest-first. */
export function liveNewsletterIssues(): NewsletterIssue[] {
  return newsletterIssues
    .filter((issue) => issue.status === 'live')
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}
