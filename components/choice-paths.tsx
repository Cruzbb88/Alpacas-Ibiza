'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'
import type { Locale } from '@/i18n.config'
import { useTranslations } from 'next-intl'

/* ──────────────────────────────────────────────────────────
 * Public types
 * ────────────────────────────────────────────────────────── */

/**
 * New, image-led path shape. Used by the rebuilt 4-path grid on the home page.
 */
export interface ChoicePath {
  /** Stable identifier — 'tours' | 'shop' | 'adopt' | 'about' | … */
  slug: string
  title: string
  /** Short eyebrow above title. */
  subtitle?: string
  /** 2-3 sentence pitch, hidden on mobile to keep cards lean. */
  description?: string
  /** Pre-resolved absolute href. Caller is responsible for locale prefix. */
  href: string
  /** When omitted/null, renders a branded gradient placeholder with the title. */
  image?: string | null
  imageAlt?: string
  /** Optional pill, e.g. "Most popular", "Best value". */
  badge?: string
  /** Optional CTA label override. Defaults to a translated "Explore →". */
  ctaLabel?: string
  /** Hex color hint applied to the bottom gradient at ~90 % alpha. */
  tint?: string
}

/**
 * Legacy shape kept for backward compatibility with existing call sites
 * (e.g. app/[locale]/page.tsx renders the pre-rebuild `{ icon, title,
 * description, href, cta }` array). Newer callers should use `ChoicePath`.
 */
export interface LegacyChoicePath {
  icon?: string
  title: string
  description?: string
  href: string
  cta?: string
}

type AnyPath = ChoicePath | LegacyChoicePath

export interface ChoicePathsProps {
  paths: AnyPath[]
  title?: string
  subtitle?: string
  /** Locale is optional so legacy call sites that don't pass it keep working. */
  locale?: Locale
  /** Optional override of the section background. Defaults to bg-background. */
  className?: string
}

/* ──────────────────────────────────────────────────────────
 * Internal helpers
 * ────────────────────────────────────────────────────────── */

function isLegacyPath(p: AnyPath): p is LegacyChoicePath {
  // Heuristic: legacy paths have `icon` and lack `slug`. The new shape requires `slug`.
  return (p as ChoicePath).slug === undefined
}

function normalize(p: AnyPath, idx: number): ChoicePath {
  if (isLegacyPath(p)) {
    return {
      slug: `legacy-${idx}`,
      title: p.title,
      description: p.description,
      href: p.href,
      ctaLabel: p.cta,
      image: null,
      imageAlt: p.title,
    }
  }
  return p
}

function gridColsFor(count: number): string {
  if (count <= 0) return ''
  if (count === 1) return 'grid-cols-1'
  if (count === 2) return 'grid-cols-1 md:grid-cols-2'
  if (count === 3) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
  // 4 or 5+ — cap at 4 across.
  return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
}

function aspectFor(totalCards: number): string {
  if (totalCards === 1) return 'aspect-[16/9]'
  return 'aspect-[4/5] md:aspect-[3/4]'
}

/* ──────────────────────────────────────────────────────────
 * Component
 * ────────────────────────────────────────────────────────── */

export function ChoicePaths({
  paths,
  title,
  subtitle,
  locale,
  className,
}: ChoicePathsProps) {
  const pathname = usePathname()
  // Rules of Hooks: call unconditionally before the early return below.
  const translate = useTranslations()
  if (!paths || paths.length === 0) return null

  const defaultCta = translate('paths.explore')

  const normalized = paths.map(normalize)
  const colsClass = gridColsFor(normalized.length)
  const aspectClass = aspectFor(normalized.length)

  const grid = (
    <div
      className={`grid ${colsClass} gap-4 md:gap-6 max-w-7xl mx-auto`}
      role="list"
    >
      {normalized.map((path, idx) => {
        const isCurrent = pathname === path.href
        const ctaLabel = path.ctaLabel ?? defaultCta
        const altText = path.imageAlt ?? path.title
        const tintStyle = path.tint
          ? {
              backgroundImage: `linear-gradient(to top, ${path.tint}E6 0%, ${path.tint}80 35%, transparent 75%)`,
            }
          : undefined

        return (
          <Link
            key={path.slug}
            href={path.href}
            aria-current={isCurrent ? 'page' : undefined}
            role="listitem"
            className={[
              'group relative block overflow-hidden rounded-2xl shadow-md',
              'hover:shadow-2xl transition-all duration-500',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
              isCurrent ? 'ring-2 ring-accent' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <Card className="relative h-full w-full overflow-hidden rounded-2xl border-0 bg-transparent p-0 shadow-none">
              <figure className={`relative w-full ${aspectClass} m-0`}>
                {path.image ? (
                  <Image
                    src={path.image}
                    alt={altText}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    priority={idx < 2}
                  />
                ) : (
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary via-primary/80 to-accent transition-transform duration-700 group-hover:scale-105"
                    aria-hidden="true"
                  >
                    <span className="px-6 text-center font-display text-4xl font-bold leading-tight text-white/90 drop-shadow-lg md:text-5xl">
                      {path.title}
                    </span>
                  </div>
                )}

                {/* Bottom-up dark overlay for legibility (or tint when provided) */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/40 to-transparent transition-colors duration-500 group-hover:from-foreground/95"
                  style={tintStyle}
                />

                {path.badge ? (
                  <span className="absolute right-4 top-4 z-10 inline-flex items-center rounded-full bg-background/95 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-foreground shadow-sm backdrop-blur-sm">
                    {path.badge}
                  </span>
                ) : null}

                <figcaption className="absolute inset-x-0 bottom-0 z-10 p-6 text-white md:p-8">
                  {path.subtitle ? (
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest opacity-90">
                      {path.subtitle}
                    </p>
                  ) : null}
                  <h3 className="mb-2 font-display text-2xl font-bold leading-tight drop-shadow-md md:text-3xl">
                    {path.title}
                  </h3>
                  {path.description ? (
                    <p className="mb-3 hidden max-w-md text-sm leading-relaxed opacity-90 drop-shadow md:block md:text-base">
                      {path.description}
                    </p>
                  ) : null}
                  <span className="inline-flex items-center gap-2 pt-1 text-base font-semibold">
                    <span>{ctaLabel}</span>
                    <ArrowRight
                      aria-hidden="true"
                      className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </span>
                </figcaption>
              </figure>
            </Card>
          </Link>
        )
      })}
    </div>
  )

  if (!title) {
    return grid
  }

  return (
    <section className={`w-full py-16 md:py-24 px-4 ${className ?? 'bg-background'}`}>
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-3 text-center font-display text-3xl font-bold text-foreground md:text-5xl">
          {title}
        </h2>
        {subtitle ? (
          <p className="mx-auto mb-12 max-w-2xl text-center text-lg text-foreground/70">
            {subtitle}
          </p>
        ) : (
          <div className="mb-12" />
        )}
        {grid}
      </div>
    </section>
  )
}
