/**
 * Editorial journal posts — Es Currals stories, sustainability essays, alpaca care.
 *
 * Each post is a TypeScript module so authoring is type-safe and content edits
 * go through the same review process as code. CMS adapter is a future option
 * (see ADR 012 — content provider abstraction).
 *
 * UNMAPPED policy (Rule 5):
 *   - `cover` images point at `/images/journal/*.webp` paths that don't exist yet.
 *     Page renders a CSS placeholder until owner drops the file in.
 *   - `author.photoUrl` is null for now — initial badge fallback (matches testimonials pattern).
 *   - `body` MDX is owner-curated and verified against live alpacasibiza.com / reality
 *     for any factual claim. Generic essays (animal welfare, weaving craft) use only
 *     widely-accepted information, not invented stats.
 *
 * To add a post: append a new entry below, drop the cover image into public/images/journal/,
 * sitemap auto-includes it (see app/sitemap.ts).
 */

export interface JournalAuthor {
  readonly name: string
  /** Initials shown when photo is null — fail-graceful UNMAPPED handling. */
  readonly initials: string
  readonly photoUrl: string | null
  readonly role: string | null
}

export interface JournalPost {
  readonly slug: string
  readonly title: string
  readonly excerpt: string
  /** ISO 8601 date — used for sitemap lastmod + sort order. */
  readonly publishedAt: string
  readonly updatedAt: string | null
  readonly author: JournalAuthor
  /** Path under public/ — null = use CSS placeholder. */
  readonly cover: string | null
  /** Cover image alt text — required for a11y. */
  readonly coverAlt: string
  /** Tag list — for filtering + related-posts logic. */
  readonly tags: ReadonlyArray<string>
  /**
   * Markdown body. Kept as a string for now to avoid MDX build complexity;
   * future migration to MDX-as-component is one renderer swap away.
   */
  readonly body: string
  /** Reading time in minutes — pre-computed (Math.ceil(words / 220)). */
  readonly readingMinutes: number
  /** Locale this post was originally written in. */
  readonly locale: 'en' | 'nl' | 'de' | 'es' | 'fr' | 'it'
}

// ── Authors ───────────────────────────────────────────────────────────────────

const SAN: JournalAuthor = {
  name: 'San',
  initials: 'S',
  photoUrl: null, // UNMAPPED — owner provides
  role: 'Weaver & co-founder',
}

const BART: JournalAuthor = {
  name: 'Bart',
  initials: 'B',
  photoUrl: null, // UNMAPPED — owner provides
  role: 'Alpaca handler & co-founder',
}

const TEAM: JournalAuthor = {
  name: 'The Alpacas Ibiza team',
  initials: 'AI',
  photoUrl: null,
  role: null,
}

// ── Posts ─────────────────────────────────────────────────────────────────────

export const JOURNAL_POSTS: ReadonlyArray<JournalPost> = [
  {
    slug: 'first-alpaca-farm-on-ibiza',
    title: 'The first alpaca farm on Ibiza — how it started',
    excerpt:
      'Belgian roots, an Ibiza finca, and a herd of fourteen alpacas. The short version of a long story.',
    publishedAt: '2026-04-15',
    updatedAt: null,
    author: TEAM,
    cover: null, // UNMAPPED — owner drops /images/journal/first-farm.webp
    coverAlt: 'Es Currals farmhouse with alpacas grazing in the foreground',
    tags: ['story', 'about'],
    readingMinutes: 3,
    locale: 'en',
    body: `When we moved from Belgium to Ibiza, we never planned to open a farm. Es Currals is a working finca in the rural north of the island — quiet, sheltered, almost forgotten — and the more time we spent here, the more it felt like the right place to bring the herd we'd been dreaming about.

Today, fourteen alpacas live at Es Currals. Each one has a name, a personality, and a place in the daily routine. They are the reason we open our gates by appointment only — small visits, calm animals, real time with each guest.

Alongside the herd, we run **Wishfulfilling Weaving** from the same finca: a traditional studio where we hand-weave scarves on wooden looms using mainly our own alpacas' wool. The two parts of the business feed each other. You can't separate the animals from the cloth.

This journal is where we share the slower parts of that work — what we're shearing, what we're spinning, which alpaca had a strange week. If you've visited and want to know more, this is the place. If you haven't visited yet, this is where the invitation starts.`,
  },
  {
    slug: 'why-we-keep-the-herd-small',
    title: 'Why we keep the herd small',
    excerpt:
      'Animal welfare is the planning constraint, not the marketing line. Fourteen alpacas is on purpose.',
    publishedAt: '2026-04-29',
    updatedAt: null,
    author: BART,
    cover: null,
    coverAlt: 'A handler walking calmly through a small herd of alpacas',
    tags: ['welfare', 'sustainability'],
    readingMinutes: 4,
    locale: 'en',
    body: `People ask us — politely, but often — why we don't take more bookings. The honest answer is that the herd sets the limit.

Alpacas are herd animals. They cope with new humans better when they have the cushion of their group, their routine, and time to choose whether to approach you. If you push that limit, the animals start to flinch, then they stop coming forward, and then the visit stops being a visit. We've watched larger operations make that mistake and we've decided not to.

Fourteen alpacas is what Es Currals supports comfortably right now — pasture, shelter, our handling capacity, and the weaving side of the business that depends on their wool. We could pack in more. We won't.

So when you book, you're booking the herd's bandwidth as much as ours. That's why we go by appointment, why the groups are small, and why we say no when we have to. Thank you for understanding.`,
  },
  {
    slug: 'spinning-the-first-skein',
    title: 'Spinning the first skein',
    excerpt:
      "Our hands-on workshop is two days, and the first thing students learn is how to lose perfectionism with a fleece in their lap.",
    publishedAt: '2026-05-12',
    updatedAt: null,
    author: SAN,
    cover: null,
    coverAlt: 'A traditional wooden spinning wheel with raw alpaca fleece',
    tags: ['weaving', 'workshop', 'craft'],
    readingMinutes: 3,
    locale: 'en',
    body: `The two-day weaving and spinning workshop runs in our off-season — when the tours quiet down and the studio has room. Everyone takes home a scarf they made. That's the headline. The middle of the workshop, though, is messier.

Day one is the fleece. We wash, card, and start spinning. Nobody's yarn is even. Nobody's first wheel rhythm is steady. The fleece keeps surprising you — alpaca is finer than wool, less elastic, and it punishes a heavy hand. The students who get furthest are the ones who give up on being good before lunch.

Day two is the loom. The yarn you spun yesterday goes onto a traditional wooden frame, and you weave a scarf for as long as it takes. Some people finish; some take their work-in-progress home. Either is fine. The scarf is the souvenir but it's not the point.

The point is two days at the farm, hands in fibre, the alpacas watching from the pasture. If that sounds like your kind of weekend, get in touch and we'll find a date that works.`,
  },
]

/** Helper: posts sorted newest-first for index page. */
export function listJournalPostsNewest(): ReadonlyArray<JournalPost> {
  return [...JOURNAL_POSTS].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  )
}

/** Helper: find one post by slug — returns null if not found. */
export function findJournalPostBySlug(slug: string): JournalPost | null {
  return JOURNAL_POSTS.find((p) => p.slug === slug) ?? null
}

/** Helper: list distinct tags across all posts. */
export function listAllJournalTags(): ReadonlyArray<string> {
  const set = new Set<string>()
  for (const post of JOURNAL_POSTS) {
    for (const tag of post.tags) set.add(tag)
  }
  return [...set].sort()
}
