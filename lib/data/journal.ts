/**
 * Journal posts for Alpacas Ibiza.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO PUBLISH A POST — single-file edit:
 *
 *   Step 1 (optional): Drop hero image at:
 *             public/images/journal/<slug>.webp
 *
 *   Step 2: Add one entry to the `posts` array below with status: 'live':
 *
 *     {
 *       slug: 'shearing-day-2025',
 *       title: 'Shearing Day at Es Currals',
 *       excerpt: 'Once a year the whole farm holds its breath...',
 *       body: `First paragraph text here.\n\nSecond paragraph text here.`,
 *       author: 'Signe',
 *       date: '2025-06-01',
 *       readingMinutes: 3,
 *       category: 'farm-life',
 *       heroImage: '/images/journal/shearing-day-2025.webp',
 *       heroAlt: 'Alpaca being shorn in morning light',
 *       status: 'live',
 *     },
 *
 *   No other file needs touching. The /journal index and /journal/<slug>
 *   pages render automatically; sitemap picks up the index route.
 *
 * Notes:
 *   - `slug` must be URL-safe: lowercase, hyphens only, no spaces.
 *   - `body` is plain text. Use double-newlines (\n\n) to separate paragraphs.
 *     No markdown is parsed. No package install needed.
 *   - `heroImage` is optional. Omit or set null → card shows a placeholder.
 *   - Set `status: 'draft'` to write without publishing.
 *   - Cards on /journal are sorted newest-first by `date`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type JournalStatus = 'draft' | 'live' | 'archived'
export type JournalCategory =
  | 'farm-life'
  | 'alpacas'
  | 'weaving'
  | 'seasonal'
  | 'recipes'
  | 'press'
  | 'general'

export interface JournalPost {
  slug: string
  title: string
  excerpt: string
  /** Plain text body. Double-newline (\n\n) = paragraph break. No markdown. */
  body: string
  author?: string
  /** ISO date string e.g. '2025-06-01' */
  date: string
  readingMinutes?: number
  category: JournalCategory
  /** Path relative to /public, e.g. '/images/journal/shearing-day-2025.webp'. Null = show placeholder. */
  heroImage?: string | null
  heroAlt?: string
  status: JournalStatus
}

/**
 * Owner-provided posts. Empty until owner adds entries with status: 'live'.
 * UNMAPPED — no posts invented. Every entry must be owner-supplied.
 */
export const posts: JournalPost[] = [
  {
    slug: 'spinning-the-first-skein',
    title: 'Spinning the first skein',
    excerpt:
      'Our hands-on workshop is two days, and the first thing students learn is how to lose perfectionism with a fleece in their lap.',
    author: 'San',
    date: '2026-05-12',
    readingMinutes: 3,
    category: 'weaving',
    heroImage: null,
    heroAlt: 'A traditional wooden spinning wheel with raw alpaca fleece',
    status: 'live',
    body: `The two-day weaving and spinning workshop runs in our off-season — when the tours quiet down and the studio has room. Everyone takes home a scarf they made. That's the headline. The middle of the workshop, though, is messier.

## Day one — the fleece

Day one is the fleece. We wash, card, and start spinning. Nobody's yarn is even. Nobody's first wheel rhythm is steady. The fleece keeps surprising you — alpaca is finer than wool, less elastic, and it punishes a heavy hand. The students who get furthest are the ones who give up on being good before lunch.

### Why alpaca is different from wool

Alpaca fibre has no lanolin, which means it doesn't have wool's natural grip. That makes the drafting zone harder to control at first, but it also means the finished yarn is hypoallergenic and incredibly soft against the skin.

## Day two — the loom

Day two is the loom. The yarn you spun yesterday goes onto a traditional wooden frame, and you weave a scarf for as long as it takes. Some people finish; some take their work-in-progress home. Either is fine. The scarf is the souvenir but it's not the point.

## How to book

The point is two days at the farm, hands in fibre, the alpacas watching from the pasture. If that sounds like your kind of weekend, get in touch and we'll find a date that works.`,
  },
]

/** Returns all live posts, optionally filtered by category, sorted newest-first. */
export function livePosts(category?: JournalCategory): JournalPost[] {
  return posts
    .filter((p) => p.status === 'live' && (!category || p.category === category))
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** Returns a single live post by slug, or null if not found / not live. */
export function findPost(slug: string): JournalPost | null {
  return posts.find((p) => p.slug === slug && p.status === 'live') ?? null
}

/** True when at least one post is live (any category). */
export function hasLivePosts(): boolean {
  return posts.some((p) => p.status === 'live')
}
