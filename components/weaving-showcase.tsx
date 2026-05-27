'use client'

/**
 * WeavingShowcase — editorial showcase for the woven collection.
 *
 * Two modes, selected by props (back-compat):
 *
 *   1. Editorial (new): pass `pieces: WeavingPiece[]`. Renders a magazine-style
 *      asymmetric grid (mosaic) or horizontal scroll-snap carousel.
 *
 *   2. Legacy: pass `title` + `subtitle` + `description` + `cta` + `href`
 *      (the original single-piece hero variant). Still rendered for the
 *      homepage call site in `app/[locale]/page.tsx`.
 *
 * UNMAPPED images mirror the AlpacaCard pattern — null → named placeholder.
 */

import { useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Locale } from '@/i18n.config'
import { t } from '@/lib/translations'

// ─── Editorial (new) types ──────────────────────────────────────

export interface WeavingPiece {
  id: string
  title: string
  /** Longer prose — this is editorial copy. */
  description: string
  /** null → UNMAPPED placeholder, never a broken <img>. */
  image: string | null
  imageAlt?: string
  /** e.g. ['Hand-spun', 'Naturally dyed', '100% alpaca'] */
  craftDetails?: string[]
  /** CTA href. Defaults to /[locale]/shop/woven. */
  href?: string
}

interface WeavingShowcaseEditorialProps {
  pieces: WeavingPiece[]
  locale: Locale
  title?: string
  subtitle?: string
  /** 'mosaic' (default) alternates image-text rows. 'carousel' is horizontal scroll. */
  layout?: 'mosaic' | 'carousel'
}

// ─── Legacy (single-piece) types ────────────────────────────────

interface WeavingShowcaseLegacyProps {
  title: string
  subtitle: string
  description: string
  cta: string
  href: string
  badgeText?: string
}

// ─── Union ──────────────────────────────────────────────────────

export type WeavingShowcaseProps =
  | WeavingShowcaseEditorialProps
  | WeavingShowcaseLegacyProps

function isEditorialProps(
  props: WeavingShowcaseProps,
): props is WeavingShowcaseEditorialProps {
  return Array.isArray((props as WeavingShowcaseEditorialProps).pieces)
}

// ────────────────────────────────────────────────────────────────

export function WeavingShowcase(props: WeavingShowcaseProps) {
  if (isEditorialProps(props)) {
    return <WeavingShowcaseEditorial {...props} />
  }
  return <WeavingShowcaseLegacy {...props} />
}

// ─── Editorial renderer ────────────────────────────────────────

function WeavingShowcaseEditorial({
  pieces,
  locale,
  title,
  subtitle,
  layout = 'mosaic',
}: WeavingShowcaseEditorialProps) {
  const translate = t(locale)

  if (!pieces || pieces.length === 0) return null

  const defaultHref = `/${locale}/shop/woven`
  const sectionTitle = title
  const sectionSubtitle = subtitle

  return (
    <section className="w-full py-16 md:py-24 px-4 bg-secondary/20">
      <div className="max-w-6xl mx-auto">
        {(sectionTitle || sectionSubtitle) && (
          <div className="text-center mb-12 md:mb-16 max-w-2xl mx-auto">
            {sectionSubtitle && (
              <p className="text-sm font-semibold text-accent tracking-widest uppercase mb-3">
                {sectionSubtitle}
              </p>
            )}
            {sectionTitle && (
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                {sectionTitle}
              </h2>
            )}
          </div>
        )}

        {layout === 'carousel' ? (
          <CarouselLayout
            pieces={pieces}
            defaultHref={defaultHref}
            translate={translate}
          />
        ) : (
          <MosaicLayout
            pieces={pieces}
            defaultHref={defaultHref}
            translate={translate}
          />
        )}
      </div>
    </section>
  )
}

// ─── Mosaic layout (default) ───────────────────────────────────

function MosaicLayout({
  pieces,
  defaultHref,
  translate,
}: {
  pieces: WeavingPiece[]
  defaultHref: string
  translate: (key: string, defaultValue?: string) => string
}) {
  const single = pieces.length === 1

  return (
    <div>
      {pieces.map((piece, i) => {
        const imageRight = !single && i % 2 === 1
        const href = piece.href ?? defaultHref

        return (
          <div
            key={piece.id}
            className={`grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center mb-16 md:mb-24 last:mb-0 ${
              single ? 'max-w-4xl mx-auto' : ''
            }`}
          >
            {/* Image side */}
            <div
              className={`relative aspect-[4/5] rounded-2xl overflow-hidden bg-secondary/40 ${
                imageRight ? 'md:order-2' : 'md:order-1'
              }`}
            >
              <WeavingImage piece={piece} translate={translate} />
            </div>

            {/* Text side */}
            <div
              className={`space-y-5 ${imageRight ? 'md:order-1' : 'md:order-2'}`}
            >
              <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                {piece.title}
              </h3>
              <p className="text-lg leading-relaxed text-foreground/80">
                {piece.description}
              </p>

              {piece.craftDetails && piece.craftDetails.length > 0 && (
                <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {piece.craftDetails.map((d, di) => (
                    <li
                      key={di}
                      className="text-xs uppercase tracking-widest text-accent font-semibold"
                    >
                      {d}
                    </li>
                  ))}
                </ul>
              )}

              <div className="pt-2">
                <Link
                  href={href}
                  className="inline-flex items-center gap-2 text-accent hover:text-accent/80 font-semibold transition-colors group/cta"
                >
                  {translate('shop.cta.viewPiece', 'View piece')}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover/cta:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Carousel layout ───────────────────────────────────────────

function CarouselLayout({
  pieces,
  defaultHref,
  translate,
}: {
  pieces: WeavingPiece[]
  defaultHref: string
  translate: (key: string, defaultValue?: string) => string
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)

  return (
    <div>
      <div
        ref={scrollerRef}
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 scroll-smooth"
        aria-label={translate('shop.weaving.carouselLabel', 'Weaving pieces carousel')}
      >
        {pieces.map((piece) => {
          const href = piece.href ?? defaultHref
          return (
            <article
              key={piece.id}
              className="snap-center shrink-0 w-[85%] sm:w-[60%] md:w-[45%] lg:w-[35%] bg-background rounded-2xl border border-border overflow-hidden shadow-sm"
            >
              <div className="relative aspect-[4/5] bg-secondary/40">
                <WeavingImage piece={piece} translate={translate} />
              </div>
              <div className="p-5 space-y-3">
                <h3 className="text-xl font-bold text-foreground leading-tight">
                  {piece.title}
                </h3>
                <p className="text-sm text-foreground/70 line-clamp-3">
                  {piece.description}
                </p>
                {piece.craftDetails && piece.craftDetails.length > 0 && (
                  <p className="text-xs uppercase tracking-widest text-accent font-semibold">
                    {piece.craftDetails.join(' · ')}
                  </p>
                )}
                <Link
                  href={href}
                  className="inline-flex items-center gap-2 text-accent hover:text-accent/80 font-semibold transition-colors text-sm pt-1"
                >
                  {translate('shop.cta.viewPiece', 'View piece')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          )
        })}
      </div>

      {/* Decorative dots — visual cue only; carousel is keyboard-scrollable. */}
      {pieces.length > 1 && (
        <div
          className="flex justify-center gap-2 mt-4"
          aria-hidden="true"
        >
          {pieces.map((p) => (
            <span
              key={p.id}
              className="h-1.5 w-1.5 rounded-full bg-foreground/20"
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Shared image renderer ─────────────────────────────────────

function WeavingImage({
  piece,
  translate,
}: {
  piece: WeavingPiece
  translate: (key: string, defaultValue?: string) => string
}) {
  if (piece.image == null || piece.image === '') {
    return (
      <div
        className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 via-secondary to-accent/10"
        aria-label={`${translate('shop.imageComingSoon', 'Photo coming soon')}: ${piece.title}`}
      >
        <span className="text-xl font-bold text-muted-foreground/40 px-6 text-center">
          {piece.title}
        </span>
      </div>
    )
  }
  return (
    <Image
      src={piece.image}
      alt={piece.imageAlt ?? piece.title}
      fill
      sizes="(max-width: 768px) 100vw, 50vw"
      className="object-cover transition-transform duration-700 hover:rotate-1 hover:scale-105"
    />
  )
}

// ─── Legacy renderer (preserved for back-compat) ───────────────

function WeavingShowcaseLegacy({
  title,
  subtitle,
  description,
  cta,
  href,
  badgeText = 'Handcrafted in Ibiza',
}: WeavingShowcaseLegacyProps) {
  return (
    <section className="w-full py-16 md:py-24 px-4 bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Image / Visual Side — decorative loom pattern */}
          <div className="relative rounded-2xl overflow-hidden aspect-[4/3] group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary to-accent/15" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-full h-full flex flex-col items-center justify-center gap-3 p-12">
                <div className="absolute inset-x-12 inset-y-8 flex gap-2 opacity-20">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="flex-1 bg-primary/40 rounded-full" />
                  ))}
                </div>
                <div className="absolute inset-x-8 inset-y-12 flex flex-col gap-2 opacity-15">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="w-full flex-1 bg-accent/40 rounded-full" />
                  ))}
                </div>
                <div className="relative z-10 text-7xl md:text-8xl transform group-hover:scale-110 transition-transform duration-500">
                  🧶
                </div>
                <p className="relative z-10 text-sm font-medium text-foreground/50 tracking-widest uppercase">
                  {badgeText}
                </p>
              </div>
            </div>
          </div>

          {/* Text Side */}
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-accent tracking-widest uppercase mb-2">
                {subtitle}
              </p>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
                {title}
              </h2>
            </div>
            <p className="text-foreground/70 text-lg leading-relaxed">{description}</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                asChild
                size="lg"
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                <Link href={href}>
                  {cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
