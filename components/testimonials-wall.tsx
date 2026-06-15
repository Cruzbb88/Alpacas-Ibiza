import {
  liveTestimonials,
  hasLiveTestimonials,
  type Testimonial as DataTestimonial,
} from '@/lib/data/testimonials'
import { ReviewTranslateButton } from '@/components/review-translate-button'

/**
 * Public Testimonial shape accepted by `TestimonialsWall` when `items` is
 * passed explicitly. This is intentionally decoupled from
 * `lib/data/testimonials.ts` so callers (marketing pages, server-rendered
 * lists, MDX, etc.) can build cards from any data source.
 */
export interface Testimonial {
  id: string
  quote: string
  author: string
  /** Optional: where the author is from, e.g., "Madrid, Spain" */
  authorLocation?: string
  /** 1–5 stars. Defaults to undefined = no rating shown. */
  rating?: 1 | 2 | 3 | 4 | 5
  /** Where the review came from. Affects badge. */
  source?: 'google' | 'tripadvisor' | 'direct' | 'booking'
  /** ISO date string — drives schema.org datePublished */
  date?: string
  /** Optional inline photo of the author */
  authorImage?: string | null
  /** BCP47 language code the review was written in (e.g. 'de'). Used as Google Translate source hint. */
  lang?: string
}

export interface TestimonialsWallProps {
  /**
   * Optional. When omitted, falls back to `liveTestimonials()` from
   * `lib/data/testimonials.ts` (preserves existing call-site contract on
   * `/adopt`).
   */
  items?: Testimonial[]
  title?: string
  subtitle?: string
  /**
   * Display variant. 'grid' = static 3-col masonry.
   * 'carousel' = horizontal scroll-snap on mobile, 3-col on desktop. Default 'grid'.
   */
  layout?: 'grid' | 'carousel'
  /** When true, emit schema.org Review JSON-LD for SEO. Default false. */
  emitSchema?: boolean
  /** When true, show source aggregate at top (avg rating + count). */
  showAggregate?: boolean
  /** Optional cap on number of cards shown. Applied after fallback. */
  limit?: number
  /** Extra classes on the outer <section>. */
  className?: string
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────────

function StarRating({ rating }: { rating: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <div
      className="flex gap-0.5"
      role="img"
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= rating
        return (
          <svg
            key={n}
            className={`h-4 w-4 ${filled ? 'text-yellow-500' : 'text-foreground/20'}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        )
      })}
    </div>
  )
}

function SourceBadge({ source }: { source: Testimonial['source'] }) {
  if (!source || source === 'direct') return null
  const label =
    source === 'google'
      ? 'Google review'
      : source === 'tripadvisor'
        ? 'TripAdvisor'
        : 'Booking.com'
  const accent =
    source === 'google'
      ? 'text-blue-600'
      : source === 'tripadvisor'
        ? 'text-emerald-600'
        : 'text-sky-700'
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/40 text-xs text-muted-foreground ${accent}`}
    >
      <span aria-hidden="true">★</span>
      {label}
    </span>
  )
}

// 4 brand-pastel tints used for initials avatars. Deterministic hash → index.
const AVATAR_TINTS = [
  'bg-primary/10 text-primary',
  'bg-secondary text-secondary-foreground',
  'bg-accent/15 text-accent',
  'bg-muted text-muted-foreground',
] as const

function tintForAuthor(author: string): string {
  let hash = 0
  for (let i = 0; i < author.length; i++) {
    hash = (hash * 31 + author.charCodeAt(i)) | 0
  }
  const idx = Math.abs(hash) % AVATAR_TINTS.length
  return AVATAR_TINTS[idx]
}

function AuthorAvatar({
  image,
  author,
}: {
  image?: string | null
  author: string
}) {
  if (image) {
    return (
      // Using <img> (not next/image) to keep this component agnostic of
      // remote-host config in next.config.mjs.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt=""
        width={40}
        height={40}
        loading="lazy"
        decoding="async"
        className="h-10 w-10 rounded-full object-cover bg-muted shrink-0"
      />
    )
  }
  const initials = author
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <div
      className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${tintForAuthor(author)}`}
      aria-hidden="true"
    >
      {initials || '·'}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function formatShortDate(iso?: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('en-US', { month: 'short', year: 'numeric' })
}

/** Map the legacy `Testimonial` data shape onto the public `Testimonial` shape. */
function adaptDataTestimonial(t: DataTestimonial): Testimonial {
  const source: Testimonial['source'] =
    t.source === 'google' || t.source === 'tripadvisor'
      ? t.source
      : 'direct' // facebook → 'direct' (no badge); see SourceBadge.
  return {
    id: t.id,
    quote: t.body,
    author: t.name,
    rating: t.rating ?? undefined,
    source,
    date: t.date ?? undefined,
    authorImage: t.photoUrl ?? null,
    lang: t.locale ?? undefined,
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Card
// ──────────────────────────────────────────────────────────────────────────────

function TestimonialFigure({ t }: { t: Testimonial }) {
  const dateLabel = formatShortDate(t.date)
  return (
    <figure className="bg-background border border-border rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
      {(t.rating || (t.source && t.source !== 'direct')) && (
        <div className="flex items-start justify-between gap-2 mb-4">
          {t.rating ? <StarRating rating={t.rating} /> : <span />}
          <SourceBadge source={t.source} />
        </div>
      )}

      <ReviewTranslateButton
        text={t.quote}
        sourceLang={t.lang}
        className="mb-6 grow"
      >
        <blockquote className="text-foreground text-base md:text-lg leading-relaxed mb-3 grow">
          <span
            aria-hidden="true"
            className="text-accent text-3xl leading-none font-serif align-top mr-1 select-none"
          >
            &ldquo;
          </span>
          {t.quote}
        </blockquote>
      </ReviewTranslateButton>

      <figcaption className="flex items-center gap-3 mt-auto">
        <AuthorAvatar image={t.authorImage} author={t.author} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {t.author}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {[t.authorLocation, dateLabel].filter(Boolean).join(' · ')}
          </p>
        </div>
      </figcaption>
    </figure>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────────

/**
 * TestimonialsWall — competitor-grade social-proof wall.
 *
 * - `items` is optional; when omitted, falls back to `liveTestimonials()`
 *   from `lib/data/testimonials.ts` to preserve the existing /adopt call site.
 * - Renders nothing if the resolved item list is empty (production fail-quiet).
 * - When `emitSchema` is true, emits schema.org `AggregateRating` + `Review`
 *   JSON-LD scoped only to items that carry a rating.
 */
export function TestimonialsWall({
  items,
  title,
  subtitle,
  layout = 'grid',
  emitSchema = false,
  showAggregate = false,
  limit,
  className = '',
}: TestimonialsWallProps) {
  // Resolve items: explicit prop wins, otherwise pull from data layer.
  let resolved: Testimonial[]
  if (items && items.length > 0) {
    resolved = items
  } else if (!items && hasLiveTestimonials()) {
    resolved = liveTestimonials().map(adaptDataTestimonial)
  } else {
    resolved = []
  }

  if (limit && limit > 0) resolved = resolved.slice(0, limit)

  if (resolved.length === 0) return null

  // Aggregate over rated items only.
  const rated = resolved.filter(
    (t): t is Testimonial & { rating: 1 | 2 | 3 | 4 | 5 } =>
      typeof t.rating === 'number',
  )
  const avg =
    rated.length > 0
      ? rated.reduce((sum, t) => sum + t.rating, 0) / rated.length
      : null
  const showAggregateHeader = showAggregate && avg !== null

  // JSON-LD payload (rated items only — review without rating isn't valid).
  const jsonLd =
    emitSchema && avg !== null
      ? {
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          name: 'Alpacas Ibiza',
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: avg.toFixed(1),
            bestRating: 5,
            reviewCount: rated.length,
          },
          review: rated.map((t) => ({
            '@type': 'Review',
            author: { '@type': 'Person', name: t.author },
            reviewBody: t.quote,
            reviewRating: {
              '@type': 'Rating',
              ratingValue: t.rating,
              bestRating: 5,
            },
            ...(t.date ? { datePublished: t.date } : {}),
          })),
        }
      : null

  // Layout classes.
  const isCarousel = layout === 'carousel'
  const desktopGrid =
    'md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6 md:overflow-visible'
  const mobileCarousel = isCarousel
    ? 'flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
    : 'grid grid-cols-1 gap-6'
  const cardWrapper = isCarousel
    ? 'snap-start shrink-0 w-[85vw] max-w-sm md:w-auto md:max-w-none'
    : ''

  return (
    <section
      aria-label={title ?? 'Testimonials'}
      className={`py-16 md:py-24 ${className}`}
    >
      {jsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <div className="max-w-6xl mx-auto px-4">
        {showAggregateHeader && (
          <p className="text-center mb-2 text-sm text-accent font-semibold">
            {avg.toFixed(1)} ★ · {rated.length}{' '}
            {rated.length === 1 ? 'review' : 'reviews'}
          </p>
        )}
        {title && (
          <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
            {title}
          </h2>
        )}
        {subtitle && (
          <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
            {subtitle}
          </p>
        )}

        <div
          className={`${mobileCarousel} ${desktopGrid}`}
          {...(isCarousel
            ? {
                role: 'region',
                'aria-label': 'Testimonials carousel',
                tabIndex: 0,
              }
            : {})}
        >
          {resolved.map((t) => (
            <div key={t.id} className={cardWrapper}>
              <TestimonialFigure t={t} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
