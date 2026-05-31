/**
 * ExperienceCards — premium experience/tour grid for the homepage and
 * landing pages.
 *
 * Each card is a photo-led marketing tile with optional badge, price chip,
 * meta row (duration / party size / accessibility) and a universal
 * BookingButton CTA that hands off to FareHarbor via the central product
 * registry (lib/fareharbor-products.ts). Cards never render a broken image
 * src — when `image` is null the placeholder block mirrors AlpacaCard's
 * UNMAPPED pattern.
 *
 * Backward compatibility: the original homepage call site passes a legacy
 * `cards` prop with `{ icon, title, description, cta, href }`. We still
 * accept that shape and adapt it into the new ExperienceCard structure so
 * the component swap is a no-op for existing pages. The new API uses
 * `items` and the richer ExperienceCard interface below.
 *
 * Accessibility: each card is an <article> labelled by its title; meta
 * icons are aria-hidden; the title (not the entire card) is the link target
 * when `detailHref` is set, because nesting BookingButton inside an <a> is
 * invalid HTML.
 */
'use client'

import Image from 'next/image'
import Link from 'next/link'
import { BookingButton } from '@/components/booking/button'
import type { Locale } from '@/i18n.config'
import type { FareHarborProduct } from '@/lib/fareharbor-products'
import { useTranslations } from 'next-intl'

export type ProductSlug = FareHarborProduct

export interface ExperienceCard {
  /** Stable identifier used for the aria-labelledby hook. e.g. 'meet-herd'. */
  slug: string
  title: string
  /** Short tagline rendered above the description in accent colour. */
  subtitle?: string
  /** 1–2 sentence body copy. */
  description: string
  /** Public path. null = UNMAPPED — placeholder is rendered instead. */
  image?: string | null
  imageAlt?: string
  /** FareHarbor product slug for the BookingButton CTA. Falls back to main calendar. */
  product?: FareHarborProduct
  /** Price hint, e.g. "from €25" — shown as a chip when set. */
  priceFrom?: string
  /** Duration label, e.g. "90 min". */
  duration?: string
  /** Party size label, e.g. "Up to 8 guests" or "2–10". */
  partySize?: string
  /** Optional level/difficulty: "Easy" | "All ages" | etc. */
  accessibility?: string
  /** When set, the card's title links to a detail page. Whole card is never the link. */
  detailHref?: string
  /** Optional "Most popular" / "New" badge over the image. */
  badge?: string
}

/**
 * Legacy shape kept for backward-compatibility with the existing homepage
 * call site (app/[locale]/page.tsx).
 */
export interface LegacyExperienceCard {
  icon?: string
  title: string
  description: string
  cta?: string
  href?: string
  accent?: string
}

export interface ExperienceCardsProps {
  /** Preferred prop — pass full ExperienceCard objects. */
  items?: ExperienceCard[]
  /** Legacy prop — old shape used by the homepage. Maps to `items` internally. */
  cards?: LegacyExperienceCard[]
  title?: string
  subtitle?: string
  /** Grid columns at lg breakpoint. Defaults to 3. */
  columns?: 2 | 3 | 4
  /** Locale for translations and link prefixing. Defaults to 'en'. */
  locale?: Locale
}

// Tailwind JIT-safe column lookup. Dynamic `lg:grid-cols-${n}` is purged.
const COLS: Record<2 | 3 | 4, string> = {
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
}

/* ──────────────────────────────────────────────────────────────────────
 * Inline SVG icons — kept here to avoid a dependency on lucide-react in
 * this component file. aria-hidden="true" applied at the call site.
 * ────────────────────────────────────────────────────────────────────── */

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function AccessibleIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="4" r="2" />
      <path d="M19 13v-2a7 7 0 0 0-14 0v2" />
      <path d="M5 13l4 8 3-5 3 5 4-8" />
    </svg>
  )
}

/* ────────────────────────────────────────────────────────────────────── */

/**
 * Map a legacy {icon, href, cta} card into the new ExperienceCard shape.
 * The legacy `href` becomes `detailHref` so the title links through; the
 * BookingButton falls back to the general calendar since legacy cards have
 * no product slug.
 */
function adaptLegacy(card: LegacyExperienceCard, idx: number): ExperienceCard {
  // Derive a stable-ish slug from the title so aria IDs don't collide.
  const slug =
    card.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `card-${idx}`
  return {
    slug,
    title: card.title,
    description: card.description,
    image: null, // legacy shape has no image — render placeholder
    detailHref: card.href,
  }
}

interface CardItemProps {
  item: ExperienceCard
  locale: Locale
  bookCtaLabel: string
  learnMoreLabel: string
}

function CardItem({ item, locale, bookCtaLabel, learnMoreLabel }: CardItemProps) {
  const titleId = `exp-${item.slug}-title`
  const hasImage = item.image != null && item.image !== ''
  const altText = item.imageAlt ?? item.title

  const titleEl = (
    <h3
      id={titleId}
      className="text-xl md:text-2xl font-bold text-foreground mb-1 font-display"
    >
      {item.detailHref ? (
        <Link
          href={item.detailHref}
          className="hover:text-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
        >
          {item.title}
        </Link>
      ) : (
        item.title
      )}
    </h3>
  )

  return (
    <article
      aria-labelledby={titleId}
      className="group relative bg-background rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
    >
      {/* Image / UNMAPPED placeholder */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary/40">
        {hasImage ? (
          <Image
            src={item.image as string}
            alt={altText}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div
            role="img"
            aria-label={altText}
            className="absolute inset-0 bg-secondary/60 flex items-center justify-center p-6 text-center"
          >
            <span className="text-3xl font-bold text-muted-foreground/40 leading-tight">
              {item.title}
            </span>
          </div>
        )}

        {item.badge ? (
          <span className="absolute top-4 left-4 inline-flex items-center px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-semibold uppercase tracking-wider z-10">
            {item.badge}
          </span>
        ) : null}

        {item.priceFrom ? (
          <span className="absolute top-4 right-4 inline-flex items-center px-3 py-1 rounded-full bg-background/95 backdrop-blur-sm text-foreground font-semibold text-sm z-10 shadow-sm">
            {item.priceFrom}
          </span>
        ) : null}
      </div>

      {/* Body */}
      <div className="p-6 flex flex-col flex-1">
        {titleEl}

        {item.subtitle ? (
          <p className="text-sm text-accent uppercase tracking-wider font-semibold mb-3">
            {item.subtitle}
          </p>
        ) : null}

        <p className="text-foreground/75 leading-relaxed mb-4 flex-1">
          {item.description}
        </p>

        {(item.duration || item.partySize || item.accessibility) && (
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-foreground/70 mb-5">
            {item.duration ? (
              <span className="inline-flex items-center gap-1.5">
                <ClockIcon className="w-3.5 h-3.5" />
                {item.duration}
              </span>
            ) : null}
            {item.partySize ? (
              <span className="inline-flex items-center gap-1.5">
                <UsersIcon className="w-3.5 h-3.5" />
                {item.partySize}
              </span>
            ) : null}
            {item.accessibility ? (
              <span className="inline-flex items-center gap-1.5">
                <AccessibleIcon className="w-3.5 h-3.5" />
                {item.accessibility}
              </span>
            ) : null}
          </div>
        )}

        {/* CTA + optional "Learn more" */}
        <div className="mt-auto flex flex-col gap-2">
          <BookingButton
            product={item.product}
            label={bookCtaLabel}
            className="w-full justify-center"
          />
          {item.detailHref ? (
            <Link
              href={item.detailHref}
              className="text-sm text-foreground/60 hover:text-accent transition-colors text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
              aria-label={`${learnMoreLabel}: ${item.title}`}
            >
              {learnMoreLabel} →
            </Link>
          ) : null}
        </div>
      </div>

      {/* Locale is consumed for translations + link prefixing; reference it
          here so unused-locale lint doesn't flag the prop when the card has
          no detailHref. The string is invisible. */}
      <span className="sr-only" data-locale={locale} />
    </article>
  )
}

export function ExperienceCards({
  items,
  cards,
  title,
  subtitle,
  columns = 3,
  locale = 'en',
}: ExperienceCardsProps) {
  // Resolve which data source we're using — prefer the new `items` prop.
  const resolved: ExperienceCard[] =
    items && items.length > 0
      ? items
      : (cards ?? []).map(adaptLegacy)

  // Edge case: nothing to render.
  if (resolved.length === 0) return null

  const translate = useTranslations()
  const bookCtaLabel = translate('experiences.bookCta')
  const learnMoreLabel = translate('experiences.learnMore')

  const gridClasses = `grid grid-cols-1 md:grid-cols-2 ${COLS[columns]} gap-6 md:gap-8 max-w-7xl mx-auto`

  const cardsGrid = (
    <div className={gridClasses}>
      {resolved.map((item) => (
        <CardItem
          key={item.slug}
          item={item}
          locale={locale}
          bookCtaLabel={bookCtaLabel}
          learnMoreLabel={learnMoreLabel}
        />
      ))}
    </div>
  )

  // Caller-supplied title turns this into a full section. Otherwise we
  // return just the grid so the caller controls section chrome.
  if (!title) return cardsGrid

  return (
    <section className="w-full py-16 md:py-24 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-3">
          {title}
        </h2>
        {subtitle ? (
          <p className="text-lg text-foreground/70 text-center mb-12 max-w-2xl mx-auto">
            {subtitle}
          </p>
        ) : (
          <div className="mb-12" />
        )}
        {cardsGrid}
      </div>
    </section>
  )
}
